"use server";

import { adminOnlyAction, userAction } from "@/lib/safe-action";
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

export const validateBackup = userAction
  .schema(
    z.object({
      data: z.object({
        users: z.array(z.any()).optional(),
        sessions: z.array(z.any()).optional(),
        accounts: z.array(z.any()).optional(),
        verifications: z.array(z.any()).optional(),
        projects: z.array(z.any()).optional(),
        tasks: z.array(z.any()).optional(),
        comments: z.array(z.any()).optional(),
        members: z.array(z.any()).optional(),
        vendors: z.array(z.any()).optional(),
        procurements: z.array(z.any()).optional(),
        procurementLogs: z.array(z.any()).optional(),
        budgets: z.array(z.any()).optional(),
        budgetYears: z.array(z.any()).optional(),
        budgetTransfers: z.array(z.any()).optional(),
        obligations: z.array(z.any()).optional(),
        payments: z.array(z.any()).optional(),
        procMembers: z.array(z.any()).optional(),
      }),
    })
  )
  .action(async ({ parsedInput }) => {
    try {
      const issues: string[] = [];
      const summary = {
        users: parsedInput.data.users?.length || 0,
        sessions: parsedInput.data.sessions?.length || 0,
        accounts: parsedInput.data.accounts?.length || 0,
        verifications: parsedInput.data.verifications?.length || 0,
        projects: parsedInput.data.projects?.length || 0,
        tasks: parsedInput.data.tasks?.length || 0,
        comments: parsedInput.data.comments?.length || 0,
        members: parsedInput.data.members?.length || 0,
        vendors: parsedInput.data.vendors?.length || 0,
        procurements: parsedInput.data.procurements?.length || 0,
        procurementLogs: parsedInput.data.procurementLogs?.length || 0,
        budgets: parsedInput.data.budgets?.length || 0,
        budgetYears: parsedInput.data.budgetYears?.length || 0,
        budgetTransfers: parsedInput.data.budgetTransfers?.length || 0,
        obligations: parsedInput.data.obligations?.length || 0,
        payments: parsedInput.data.payments?.length || 0,
        procMembers: parsedInput.data.procMembers?.length || 0,
      };

      // Basic structure validation
      if (!parsedInput.data.users) {
        issues.push("Missing required 'users' array");
      } else {
        // Check required user fields
        parsedInput.data.users.forEach((u: any, i: number) => {
          if (!u.id || !u.email) {
            issues.push(`Invalid user at index ${i}: missing id or email`);
          }
        });
      }

      if (parsedInput.data.projects) {
        parsedInput.data.projects.forEach((p: any, i: number) => {
          if (!p.id || !p.name || !p.createdBy) {
            issues.push(`Invalid project at index ${i}: missing id, name, or createdBy`);
          }
        });
      }

      if (parsedInput.data.tasks) {
        parsedInput.data.tasks.forEach((t: any, i: number) => {
          if (!t.id || !t.title || !t.projectId) {
            issues.push(`Invalid task at index ${i}: missing id, title, or projectId`);
          }
        });
      }

      if (parsedInput.data.members) {
        parsedInput.data.members.forEach((m: any, i: number) => {
          if (!m.id || !m.collectionId || !m.userId) {
            issues.push(`Invalid member at index ${i}: missing id, collectionId, or userId`);
          }
        });
      }

      return {
        valid: issues.length === 0,
        issues,
        summary,
      };
    } catch (error) {
      console.error("Validation error:", error);
      return {
        valid: false,
        issues: ["Validation failed: " + (error instanceof Error ? error.message : "Unknown error")],
        summary: null,
      };
    }
  });

export const restoreDatabase = adminOnlyAction
  .schema(
    z.object({
      data: z.object({
        users: z.array(z.any()).optional(),
        sessions: z.array(z.any()).optional(),
        accounts: z.array(z.any()).optional(),
        verifications: z.array(z.any()).optional(),
        projects: z.array(z.any()).optional(),
        tasks: z.array(z.any()).optional(),
        comments: z.array(z.any()).optional(),
        members: z.array(z.any()).optional(),
        vendors: z.array(z.any()).optional(),
        procurements: z.array(z.any()).optional(),
        procurementLogs: z.array(z.any()).optional(),
        budgets: z.array(z.any()).optional(),
        budgetYears: z.array(z.any()).optional(),
        budgetTransfers: z.array(z.any()).optional(),
        obligations: z.array(z.any()).optional(),
        payments: z.array(z.any()).optional(),
        procMembers: z.array(z.any()).optional(),
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

export const validateBackupFile = userAction
  .schema(z.object({ filename: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    try {
      const filePath = path.join(BACKUPS_DIR, parsedInput.filename);
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      const issues: string[] = [];
      const summary = {
        users: data.users?.length || 0,
        sessions: data.sessions?.length || 0,
        accounts: data.accounts?.length || 0,
        verifications: data.verifications?.length || 0,
        projects: data.projects?.length || 0,
        tasks: data.tasks?.length || 0,
        comments: data.comments?.length || 0,
        members: data.members?.length || 0,
        vendors: data.vendors?.length || 0,
        procurements: data.procurements?.length || 0,
        procurementLogs: data.procurementLogs?.length || 0,
        budgets: data.budgets?.length || 0,
        budgetYears: data.budgetYears?.length || 0,
        budgetTransfers: data.budgetTransfers?.length || 0,
        obligations: data.obligations?.length || 0,
        payments: data.payments?.length || 0,
        procMembers: data.procMembers?.length || 0,
      };

      // Basic structure validation
      if (!data.users) {
        issues.push("Missing required 'users' array");
      } else {
        data.users.forEach((u: any, i: number) => {
          if (!u.id || !u.email) {
            issues.push(`Invalid user at index ${i}: missing id or email`);
          }
        });
      }

      if (data.projects) {
        data.projects.forEach((p: any, i: number) => {
          if (!p.id || !p.name || !p.createdBy) {
            issues.push(`Invalid project at index ${i}: missing id, name, or createdBy`);
          }
        });
      }

      if (data.tasks) {
        data.tasks.forEach((t: any, i: number) => {
          if (!t.id || !t.title || !t.projectId) {
            issues.push(`Invalid task at index ${i}: missing id, title, or projectId`);
          }
        });
      }

      if (data.members) {
        data.members.forEach((m: any, i: number) => {
          if (!m.id || !m.collectionId || !m.userId) {
            issues.push(`Invalid member at index ${i}: missing id, collectionId, or userId`);
          }
        });
      }

      return {
        valid: issues.length === 0,
        issues,
        summary,
      };
    } catch (error) {
      console.error("Validate backup file error:", error);
      return {
        valid: false,
        issues: ["Validation failed: " + (error instanceof Error ? error.message : "Unknown error")],
        summary: null,
      };
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
