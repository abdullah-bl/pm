"use server";

import { adminOnlyAction } from "@/lib/safe-action";
import { z } from "zod";
import { db } from "@/lib/db";
import { user, session, account, verification } from "@/lib/db/schema";
import { eq, count, not } from "drizzle-orm";
import { promises as fs } from "fs";
import path from "path";

const BACKUPS_DIR = path.join(process.cwd(), "backups");

async function ensureBackupsDir() {
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
}

async function createBackupFile(type: string) {
  await ensureBackupsDir();
  const [users, sessions, accounts, verifications] = await Promise.all([
    db.select().from(user),
    db.select().from(session),
    db.select().from(account),
    db.select().from(verification),
  ]);
  const data = {
    users,
    sessions,
    accounts,
    verifications,
    exportedAt: new Date().toISOString(),
    type,
  };
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${ts}.json`;
  await fs.writeFile(
    path.join(BACKUPS_DIR, filename),
    JSON.stringify(data, null, 2)
  );
  return filename;
}

export const backupDatabase = adminOnlyAction
  .schema(z.void())
  .action(async () => {
    const filename = await createBackupFile("manual");
    return { filename };
  });

export const restoreDatabase = adminOnlyAction
  .schema(
    z.object({
      data: z.object({
        users: z.array(z.any()),
        sessions: z.array(z.any()),
        accounts: z.array(z.any()),
        verifications: z.array(z.any()),
      }),
    })
  )
  .action(async ({ parsedInput }) => {
    // Auto-backup before restore
    await createBackupFile("auto-pre-restore");

    const { data } = parsedInput;
    await db.delete(verification);
    await db.delete(session);
    await db.delete(account);
    await db.delete(user);

    if (data.users?.length) for (const u of data.users) await db.insert(user).values(u);
    if (data.accounts?.length) for (const a of data.accounts) await db.insert(account).values(a);
    if (data.sessions?.length) for (const s of data.sessions) await db.insert(session).values(s);
    if (data.verifications?.length) for (const v of data.verifications) await db.insert(verification).values(v);

    return { success: true };
  });

export const resetDatabase = adminOnlyAction
  .schema(z.void())
  .action(async () => {
    // Auto-backup before reset
    await createBackupFile("auto-pre-reset");

    await db.delete(verification);
    await db.delete(session);
    await db.delete(account);
    await db.delete(user).where(not(eq(user.role, "admin")));

    return { success: true };
  });

export const getDbStats = adminOnlyAction
  .schema(z.void())
  .action(async () => {
    const [userCount, sessionCount, accountCount, verificationCount] =
      await Promise.all([
        db.select({ count: count() }).from(user),
        db.select({ count: count() }).from(session),
        db.select({ count: count() }).from(account),
        db.select({ count: count() }).from(verification),
      ]);

    return {
      users: userCount[0].count,
      sessions: sessionCount[0].count,
      accounts: accountCount[0].count,
      verifications: verificationCount[0].count,
    };
  });

export const listBackups = adminOnlyAction
  .schema(z.void())
  .action(async () => {
    await ensureBackupsDir();
    const files = await fs.readdir(BACKUPS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();

    const backups = await Promise.all(
      jsonFiles.map(async (f) => {
        const stat = await fs.stat(path.join(BACKUPS_DIR, f));
        // Parse type from file content
        const content = await fs.readFile(path.join(BACKUPS_DIR, f), "utf-8");
        const parsed = JSON.parse(content);
        return {
          filename: f,
          timestamp: parsed.exportedAt || stat.mtime.toISOString(),
          type: parsed.type || "manual",
          size: stat.size,
        };
      })
    );

    return backups;
  });

export const rollbackToBackup = adminOnlyAction
  .schema(z.object({ filename: z.string() }))
  .action(async ({ parsedInput }) => {
    // Auto-backup current state before rollback
    await createBackupFile("auto-pre-rollback");

    // Read the target backup
    const filePath = path.join(BACKUPS_DIR, parsedInput.filename);
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);

    if (!data.users) throw new Error("Invalid backup file");

    // Restore
    await db.delete(verification);
    await db.delete(session);
    await db.delete(account);
    await db.delete(user);

    if (data.users?.length) for (const u of data.users) await db.insert(user).values(u);
    if (data.accounts?.length) for (const a of data.accounts) await db.insert(account).values(a);
    if (data.sessions?.length) for (const s of data.sessions) await db.insert(session).values(s);
    if (data.verifications?.length) for (const v of data.verifications) await db.insert(verification).values(v);

    return { success: true };
  });
