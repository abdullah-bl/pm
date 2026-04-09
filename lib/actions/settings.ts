"use server";

import { adminOnlyAction } from "@/lib/safe-action";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import {
  getDbStats,
  getAllTableData,
  clearAllTables,
  clearNonAdminTables,
  insertAllData,
} from "@/lib/data";

const BACKUPS_DIR = path.join(process.cwd(), "backups");

async function ensureBackupsDir() {
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
}

async function createBackupFile(type: string) {
  await ensureBackupsDir();
  const data = await getAllTableData();
  const backup = {
    ...data,
    exportedAt: new Date().toISOString(),
    type,
  };
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${ts}.json`;
  await fs.writeFile(
    path.join(BACKUPS_DIR, filename),
    JSON.stringify(backup, null, 2)
  );
  return filename;
}

export const backupDatabase = adminOnlyAction
  .schema(z.object({}))
  .action(async () => {
    try {
      const filename = await createBackupFile("manual");
      return { filename };
    } catch (error) {
      console.error("Backup error:", error);
      throw new Error("Backup failed: " + (error instanceof Error ? error.message : "Unknown error"));
    }
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
    try {
      await createBackupFile("auto-pre-restore");
      await clearAllTables();
      await insertAllData(parsedInput.data);
      return { success: true };
    } catch (error) {
      console.error("Restore error:", error);
      throw new Error("Restore failed: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  });

export const resetDatabase = adminOnlyAction
  .schema(z.object({}))
  .action(async () => {
    try {
      await createBackupFile("auto-pre-reset");
      await clearNonAdminTables();
      return { success: true };
    } catch (error) {
      console.error("Reset error:", error);
      throw new Error("Reset failed: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  });

export const getDbStatsAction = adminOnlyAction
  .schema(z.object({}))
  .action(async () => {
    try {
      return getDbStats();
    } catch (error) {
      console.error("Stats error:", error);
      throw new Error("Failed to get stats");
    }
  });

export const listBackups = adminOnlyAction
  .schema(z.object({}))
  .action(async () => {
    try {
      await ensureBackupsDir();
      const files = await fs.readdir(BACKUPS_DIR);
      const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();

      const backups = await Promise.all(
        jsonFiles.slice(0, 50).map(async (f) => {
          const filePath = path.join(BACKUPS_DIR, f);
          const [stat, content] = await Promise.all([
            fs.stat(filePath),
            fs.readFile(filePath, "utf-8"),
          ]);
          let parsed: any = {};
          try {
            parsed = JSON.parse(content);
          } catch {}
          return {
            filename: f,
            timestamp: parsed.exportedAt || stat.mtime.toISOString(),
            type: parsed.type || "manual",
            size: stat.size,
          };
        })
      );

      return backups;
    } catch (error) {
      console.error("List backups error:", error);
      return [];
    }
  });

export const rollbackToBackup = adminOnlyAction
  .schema(z.object({ filename: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    try {
      // Auto-backup current state
      await createBackupFile("auto-pre-rollback");

      // Read target backup
      const filePath = path.join(BACKUPS_DIR, parsedInput.filename);
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      if (!data.users) throw new Error("Invalid backup file");

      await clearAllTables();
      await insertAllData(data);

      return { success: true };
    } catch (error) {
      console.error("Rollback error:", error);
      throw new Error("Rollback failed: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  });
