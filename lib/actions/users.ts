"use server";

import { adminOnlyAction } from "@/lib/safe-action";
import { z } from "zod";
import { db } from "@/lib/db";
import { user, session, account, verification } from "@/lib/db/schema";
import { eq, or, like, and, count, sql, ilike } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const listUsers = adminOnlyAction
  .schema(
    z.object({
      page: z.number().default(1),
      limit: z.number().default(10),
      search: z.string().optional(),
      role: z.string().optional(),
    })
  )
  .action(async ({ parsedInput }) => {
    const { page, limit, search, role } = parsedInput;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(user.name, `%${search}%`),
          ilike(user.email, `%${search}%`),
          ilike(user.username, `%${search}%`)
        )!
      );
    }
    if (role && role !== "all") {
      conditions.push(eq(user.role, role));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [users, totalResult] = await Promise.all([
      db
        .select()
        .from(user)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(user.createdAt),
      db
        .select({ count: count() })
        .from(user)
        .where(where),
    ]);

    return {
      users,
      total: totalResult[0].count,
      page,
      totalPages: Math.ceil(totalResult[0].count / limit),
    };
  });

export const createUser = adminOnlyAction
  .schema(
    z.object({
      email: z.string().email(),
      name: z.string().min(1),
      username: z.string().min(1),
      password: z.string().min(8),
      role: z.enum(["admin", "user"]),
    })
  )
  .action(async ({ parsedInput }) => {
    const res = await auth.api.signUpEmail({
      body: {
        email: parsedInput.email,
        name: parsedInput.name,
        username: parsedInput.username,
        password: parsedInput.password,
      },
      headers: await headers(),
    });

    if (!res) {
      return { success: false, error: "Failed to create user" };
    }

    // Update role if admin
    if (parsedInput.role === "admin") {
      await db
        .update(user)
        .set({ role: "admin" })
        .where(eq(user.email, parsedInput.email));
    } else {
      await db
        .update(user)
        .set({ role: "user" })
        .where(eq(user.email, parsedInput.email));
    }

    return { success: true };
  });

export const updateUser = adminOnlyAction
  .schema(
    z.object({
      id: z.string(),
      name: z.string().min(1),
      email: z.string().email(),
      username: z.string().min(1),
      role: z.enum(["admin", "user"]),
    })
  )
  .action(async ({ parsedInput }) => {
    await db
      .update(user)
      .set({
        name: parsedInput.name,
        email: parsedInput.email,
        username: parsedInput.username,
        role: parsedInput.role,
      })
      .where(eq(user.id, parsedInput.id));
    return { success: true };
  });

export const deleteUser = adminOnlyAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await db.delete(user).where(eq(user.id, parsedInput.id));
    return { success: true };
  });

export const banUser = adminOnlyAction
  .schema(
    z.object({
      id: z.string(),
      reason: z.string().optional(),
    })
  )
  .action(async ({ parsedInput }) => {
    await db
      .update(user)
      .set({
        banned: true,
        banReason: parsedInput.reason || null,
        banExpires: null,
      })
      .where(eq(user.id, parsedInput.id));
    return { success: true };
  });

export const unbanUser = adminOnlyAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await db
      .update(user)
      .set({
        banned: false,
        banReason: null,
        banExpires: null,
      })
      .where(eq(user.id, parsedInput.id));
    return { success: true };
  });

export const getDashboardStats = adminOnlyAction
  .schema(z.void())
  .action(async () => {
    const [userCount, sessionCount] = await Promise.all([
      db.select({ count: count() }).from(user),
      db.select({ count: count() }).from(session),
    ]);

    return {
      totalUsers: userCount[0].count,
      activeSessions: sessionCount[0].count,
      projects: 0, // Placeholder for future phase
    };
  });
