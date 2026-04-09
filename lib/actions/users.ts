"use server";

import { adminOnlyAction } from "@/lib/safe-action";
import { z } from "zod";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  listUsersPaginated,
  setRoleByEmail,
  updateUserData,
  deleteUserData,
  banUserData,
  unbanUserData,
  getDashboardStats,
} from "@/lib/data";

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
    return listUsersPaginated(parsedInput);
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

    if (parsedInput.role) {
      await setRoleByEmail(parsedInput.email, parsedInput.role);
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
    await updateUserData(parsedInput.id, {
      name: parsedInput.name,
      email: parsedInput.email,
      username: parsedInput.username,
      role: parsedInput.role,
    });
    return { success: true };
  });

export const deleteUser = adminOnlyAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await deleteUserData(parsedInput.id);
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
    await banUserData(parsedInput.id, parsedInput.reason);
    return { success: true };
  });

export const unbanUser = adminOnlyAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await unbanUserData(parsedInput.id);
    return { success: true };
  });

export const getDashboardStatsAction = adminOnlyAction
  .schema(z.object({}))
  .action(async () => {
    return getDashboardStats();
  });
