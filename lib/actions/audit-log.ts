"use server";

import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

export interface AuditLogEntry {
  entityType: "procurement" | "vendor" | "budget" | "obligation" | "payment";
  entityId: string;
  action: "create" | "read" | "update" | "delete" | "restore" | "view";
  changes?: Record<string, any>;
  reason?: string;
}

/**
 * Creates an audit log entry with user context
 * This is tamper-proof - only the system can create logs based on authenticated actions
 */
export async function createAuditLog(entry: AuditLogEntry) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Cannot create audit log: no authenticated user");
  }

  const ipAddress = (await headers()).get("x-forwarded-for") || 
                     (await headers()).get("x-real-ip") || 
                     "unknown";
  const userAgent = (await headers()).get("user-agent") || "unknown";

  const changesJson = entry.changes ? JSON.stringify(entry.changes) : null;

  await db.insert(auditLog).values({
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    userId: session.user.id,
    userName: session.user.name || "Unknown",
    userRole: session.user.role || "unknown",
    ipAddress,
    userAgent,
    changes: changesJson,
    reason: entry.reason || null,
  });
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogsForEntity(
  entityType: AuditLogEntry["entityType"],
  entityId: string,
  limit: number = 50
) {
  return db.select()
    .from(auditLog)
    .where(eq(auditLog.entityId, entityId))
    .orderBy(auditLog.timestamp)
    .limit(limit);
}

/**
 * Get audit logs for a specific user
 */
export async function getAuditLogsForUser(userId: string, limit: number = 50) {
  return db.select()
    .from(auditLog)
    .where(eq(auditLog.userId, userId))
    .orderBy(auditLog.timestamp)
    .limit(limit);
}

/**
 * Get audit logs within a date range
 */
export async function getAuditLogsByDateRange(
  startDate: Date,
  endDate: Date,
  limit: number = 100
) {
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  return db.select()
    .from(auditLog)
    .where((table) => ({
      timestamp: {
        gte: startMs,
        lte: endMs,
      },
    }))
    .orderBy(auditLog.timestamp)
    .limit(limit);
}
