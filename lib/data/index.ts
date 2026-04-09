import { db } from "@/lib/db";
import { user, session, account, verification } from "@/lib/db/schema";
import { eq, count, not, ilike, or, and } from "drizzle-orm";

export async function getUserCount() {
  const result = await db.select({ count: count() }).from(user);
  return result[0].count;
}

export async function getSessionCount() {
  const result = await db.select({ count: count() }).from(session);
  return result[0].count;
}

export async function getAccountCount() {
  const result = await db.select({ count: count() }).from(account);
  return result[0].count;
}

export async function getVerificationCount() {
  const result = await db.select({ count: count() }).from(verification);
  return result[0].count;
}

export async function getDashboardStats() {
  const [userCount, sessionCount] = await Promise.all([
    getUserCount(),
    getSessionCount(),
  ]);

  return {
    totalUsers: userCount,
    activeSessions: sessionCount,
    projects: 0,
  };
}

export async function getDbStats() {
  const [users, sessions, accounts, verifications] = await Promise.all([
    getUserCount(),
    getSessionCount(),
    getAccountCount(),
    getVerificationCount(),
  ]);

  return { users, sessions, accounts, verifications };
}

export async function getAllTableData() {
  const [users, sessions, accounts, verifications] = await Promise.all([
    db.select().from(user),
    db.select().from(session),
    db.select().from(account),
    db.select().from(verification),
  ]);
  return { users, sessions, accounts, verifications };
}

export async function listUsersPaginated(opts: {
  page: number;
  limit: number;
  search?: string;
  role?: string;
}) {
  const { page, limit, search, role } = opts;
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
    db.select({ count: count() }).from(user).where(where),
  ]);

  return {
    users,
    total: totalResult[0].count,
    page,
    totalPages: Math.ceil(totalResult[0].count / limit),
  };
}

export async function clearAllTables() {
  await db.delete(verification);
  await db.delete(session);
  await db.delete(account);
  await db.delete(user);
}

export async function clearNonAdminTables() {
  await db.delete(verification);
  await db.delete(session);
  await db.delete(account);
  await db.delete(user).where(not(eq(user.role, "admin")));
}

export async function insertAllData(data: {
  users?: any[];
  sessions?: any[];
  accounts?: any[];
  verifications?: any[];
}) {
  if (data.users?.length) {
    for (const u of data.users) {
      try {
        await db.insert(user).values(u);
      } catch (e) {
        // Skip duplicates
      }
    }
  }
  if (data.accounts?.length) {
    for (const a of data.accounts) {
      try {
        await db.insert(account).values(a);
      } catch (e) {}
    }
  }
  if (data.sessions?.length) {
    for (const s of data.sessions) {
      try {
        await db.insert(session).values(s);
      } catch (e) {}
    }
  }
  if (data.verifications?.length) {
    for (const v of data.verifications) {
      try {
        await db.insert(verification).values(v);
      } catch (e) {}
    }
  }
}

export async function setRoleByEmail(email: string, role: string) {
  await db.update(user).set({ role }).where(eq(user.email, email));
}

export async function updateUserData(
  id: string,
  data: { name: string; email: string; username: string; role: string }
) {
  await db.update(user).set(data).where(eq(user.id, id));
}

export async function deleteUserData(id: string) {
  await db.delete(user).where(eq(user.id, id));
}

export async function banUserData(id: string, reason?: string) {
  await db
    .update(user)
    .set({ banned: true, banReason: reason || null, banExpires: null })
    .where(eq(user.id, id));
}

export async function unbanUserData(id: string) {
  await db
    .update(user)
    .set({ banned: false, banReason: null, banExpires: null })
    .where(eq(user.id, id));
}
