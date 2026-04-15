"use server";

import { userAction } from "@/lib/safe-action";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  vendor,
  procurement,
  procurementStatusLog,
  budget,
  budgetYear,
  budgetTransfer,
  obligation,
  payment,
  procurementMember,
  auditLog,
} from "@/lib/db/schema";
import { eq, and, desc, sql, inArray, ne, count, like, or, isNull, isNotNull } from "drizzle-orm";
import { user } from "@/lib/db/schema";
import { createAuditLog, AuditLogEntry } from "./audit-log";

async function getCurrentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? "";
}

// Role-to-permission mapping for quick lookups
const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  admin: {
    procurement: ["create", "read", "update", "delete", "award", "cancel", "suspend"],
    vendor: ["create", "read", "update", "delete"],
    budget: ["create", "read", "update", "delete", "transfer", "close", "freeze"],
    obligation: ["create", "read", "cancel"],
    payment: ["create", "read", "approve", "reject", "mark-paid"],
  },
  procurement_manager: {
    procurement: ["create", "read", "update", "award", "cancel", "suspend"],
    vendor: ["create", "read", "update"],
    budget: ["read"],
    obligation: ["create", "read", "cancel"],
    payment: ["create", "read"],
  },
  budget_manager: {
    procurement: ["read"],
    vendor: ["read"],
    budget: ["create", "read", "update", "transfer", "close", "freeze"],
    obligation: ["create", "read", "cancel"],
    payment: ["create", "read", "approve", "reject", "mark-paid"],
  },
  viewer: {
    procurement: ["read"],
    vendor: ["read"],
    budget: ["read"],
    obligation: ["read"],
    payment: ["read"],
  },
};

async function requirePermission(resource: string, action: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Not authenticated");

  const role = session.user.role ?? "user";

  // Admin role bypasses all checks
  if (role === "admin") return session.user.id;

  // Check role-based permissions
  const perms = ROLE_PERMISSIONS[role];
  if (!perms || !perms[resource]?.includes(action)) {
    throw new Error(`Permission denied: ${action} ${resource}`);
  }

  return session.user.id;
}

// ─── Valid status transitions ────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["published"],
  published: ["offers_open", "cancelled", "suspended"],
  offers_open: ["evaluation", "cancelled", "suspended"],
  evaluation: ["awarded", "cancelled", "suspended"],
  awarded: ["contract_active", "cancelled", "suspended"],
  contract_active: ["completed", "cancelled", "suspended"],
  completed: [],
  cancelled: [],
  suspended: ["published", "offers_open", "evaluation", "awarded", "contract_active"],
};

// ═════════════════════════════════════════════════════════════════════════════
// VENDORS
// ═════════════════════════════════════════════════════════════════════════════

export const createVendor = userAction
  .schema(z.object({
    name: z.string().min(1),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    licenseNumber: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("vendor", "create");
    const [result] = await db.insert(vendor).values(parsedInput).returning();
    return result;
  });

export const updateVendor = userAction
  .schema(z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    licenseNumber: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("vendor", "update");
    const { id, ...data } = parsedInput;
    const [result] = await db.update(vendor).set(data).where(eq(vendor.id, id)).returning();
    return result;
  });

export const deleteVendor = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("vendor", "delete");
    const linked = await db.select({ id: procurement.id })
      .from(procurement)
      .where(eq(procurement.vendorId, parsedInput.id))
      .limit(1);
    if (linked.length > 0) {
      throw new Error("Cannot delete vendor with linked procurements");
    }
    await db.delete(vendor).where(eq(vendor.id, parsedInput.id));
    return { success: true };
  });

export const listVendors = userAction
  .schema(z.object({
    page: z.number().default(1).optional(),
    limit: z.number().default(20).optional(),
    search: z.string().optional(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("vendor", "read");
    const { page = 1, limit = 20, search } = parsedInput;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(vendor.name, `%${search}%`),
          like(vendor.email, `%${search}%`),
          like(vendor.category, `%${search}%`),
        )!
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [vendors, totalResult] = await Promise.all([
      db.select().from(vendor).where(where).limit(limit).offset(offset).orderBy(vendor.name),
      db.select({ count: count() }).from(vendor).where(where),
    ]);

    return {
      vendors,
      total: totalResult[0].count,
      page,
      totalPages: Math.ceil(totalResult[0].count / limit),
    };
  });

export const getVendor = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("vendor", "read");
    const [result] = await db.select().from(vendor).where(eq(vendor.id, parsedInput.id));
    return result ?? null;
  });

// ═════════════════════════════════════════════════════════════════════════════
// PROCUREMENTS
// ═════════════════════════════════════════════════════════════════════════════

export const createProcurement = userAction
  .schema(z.object({
    referenceNumber: z.string().min(1),
    tenderNumber: z.string().optional().nullable(),
    name: z.string().min(1),
    type: z.enum(["goods", "services", "works"]),
  }))
  .action(async ({ parsedInput }) => {
    const userId = await requirePermission("procurement", "create");
    const [result] = await db.insert(procurement).values({
      ...parsedInput,
      status: "draft",
    }).returning();
    
    // Audit log
    await createAuditLog({
      entityType: "procurement",
      entityId: result.id,
      action: "create",
      changes: { new: parsedInput },
    });
    
    return result;
  });

export const updateProcurement = userAction
  .schema(z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    tenderNumber: z.string().optional().nullable(),
    type: z.enum(["goods", "services", "works"]).optional(),
    referenceNumber: z.string().optional(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("procurement", "update");
    const { id, ...data } = parsedInput;
    // Only allow updates on draft or published
    const [existing] = await db.select({ status: procurement.status })
      .from(procurement)
      .where(eq(procurement.id, id));
    if (!existing) throw new Error("Procurement not found");
    if (!["draft", "published"].includes(existing.status)) {
      throw new Error("Can only update draft or published procurements");
    }
    const [result] = await db.update(procurement).set(data).where(eq(procurement.id, id)).returning();
    
    // Audit log
    await createAuditLog({
      entityType: "procurement",
      entityId: id,
      action: "update",
      changes: { before: existing, after: data },
    });
    
    return result;
  });

export const listProcurements = userAction
  .schema(z.object({
    status: z.enum(["draft", "published", "offers_open", "evaluation", "awarded", "contract_active", "completed", "cancelled", "suspended"]).optional(),
    type: z.enum(["goods", "services", "works"]).optional(),
    page: z.number().default(1).optional(),
    limit: z.number().default(20).optional(),
    search: z.string().optional(),
    includeDeleted: z.boolean().default(false).optional(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("procurement", "read");
    const { page = 1, limit = 20, search, status, type, includeDeleted } = parsedInput;
    const offset = (page - 1) * limit;
    const conditions = [];
    if (status) conditions.push(eq(procurement.status, status));
    if (type) conditions.push(eq(procurement.type, type));
    if (!includeDeleted) conditions.push(isNull(procurement.deletedAt));
    if (search) {
      conditions.push(
        or(
          like(procurement.name, `%${search}%`),
          like(procurement.referenceNumber, `%${search}%`),
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [procurements, totalResult] = await Promise.all([
      db.select({
        id: procurement.id,
        referenceNumber: procurement.referenceNumber,
        tenderNumber: procurement.tenderNumber,
        name: procurement.name,
        status: procurement.status,
        type: procurement.type,
        vendorId: procurement.vendorId,
        awardedAmount: procurement.awardedAmount,
        startDate: procurement.startDate,
        endDate: procurement.endDate,
        deletedAt: procurement.deletedAt,
        deletedBy: procurement.deletedBy,
        createdAt: procurement.createdAt,
        updatedAt: procurement.updatedAt,
        vendorName: vendor.name,
      })
        .from(procurement)
        .leftJoin(vendor, eq(procurement.vendorId, vendor.id))
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(procurement.createdAt)),
      db.select({ count: count() })
        .from(procurement)
        .leftJoin(vendor, eq(procurement.vendorId, vendor.id))
        .where(where),
    ]);

    return {
      procurements,
      total: totalResult[0].count,
      page,
      totalPages: Math.ceil(totalResult[0].count / limit),
    };
  });

export const getProcurement = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("procurement", "read");
    const [result] = await db.select({
      id: procurement.id,
      referenceNumber: procurement.referenceNumber,
      tenderNumber: procurement.tenderNumber,
      name: procurement.name,
      status: procurement.status,
      type: procurement.type,
      vendorId: procurement.vendorId,
      awardedAmount: procurement.awardedAmount,
      startDate: procurement.startDate,
      endDate: procurement.endDate,
      actualEndDate: procurement.actualEndDate,
      cancelledAt: procurement.cancelledAt,
      suspendedAt: procurement.suspendedAt,
      cancellationReason: procurement.cancellationReason,
      createdAt: procurement.createdAt,
      updatedAt: procurement.updatedAt,
      vendorName: vendor.name,
    })
      .from(procurement)
      .leftJoin(vendor, eq(procurement.vendorId, vendor.id))
      .where(eq(procurement.id, parsedInput.id));
    return result ?? null;
  });

// ─── Shared status advancement logic ─────────────────────────────────────────

async function doAdvanceStatus(
  id: string,
  toStatus: string,
  reason: string | null | undefined,
  userId: string,
) {
  return await db.transaction(async (tx) => {
    const [proc] = await tx.select().from(procurement).where(eq(procurement.id, id));
    if (!proc) throw new Error("Procurement not found");

    const fromStatus = proc.status;

    // Validate transition
    const allowed = VALID_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new Error(`Invalid transition from ${fromStatus} to ${toStatus}`);
    }

    // Extra rules
    if (toStatus === "awarded" && (!proc.vendorId || proc.awardedAmount == null)) {
      throw new Error("Vendor and awarded amount must be set before awarding");
    }
    if (toStatus === "contract_active" && !proc.startDate) {
      throw new Error("Start date must be set before contract activation");
    }

    // Log the transition
    await tx.insert(procurementStatusLog).values({
      procurementId: id,
      fromStatus,
      toStatus,
      changedBy: userId,
      reason: reason ?? null,
    });

    // Update procurement
    const updateData: Record<string, unknown> = {
      status: toStatus,
      updatedAt: new Date(),
    };
    if (toStatus === "cancelled") {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = reason ?? null;
    }
    if (toStatus === "suspended") {
      updateData.suspendedAt = new Date();
    }

    const [updated] = await tx.update(procurement).set(updateData).where(eq(procurement.id, id)).returning();
    return updated;
  });

  // Audit log - done outside transaction to avoid circular dependency
  // Note: This is a simplified approach. In production, you might want to
  // integrate this into the transaction or use a separate audit system
  const [proc] = await db.select().from(procurement).where(eq(procurement.id, id));
  if (proc) {
    await createAuditLog({
      entityType: "procurement",
      entityId: id,
      action: "update",
      changes: { 
        status: { from: proc.status, to: toStatus },
        reason: reason || undefined,
      },
      reason: reason || undefined,
    });
  }
}

export const advanceProcurementStatus = userAction
  .schema(z.object({
    id: z.string(),
    toStatus: z.enum(["draft", "published", "offers_open", "evaluation", "awarded", "contract_active", "completed", "cancelled", "suspended"]),
    reason: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    let userId: string;
    const toStatus = parsedInput.toStatus;
    if (toStatus === "cancelled") {
      userId = await requirePermission("procurement", "cancel");
    } else if (toStatus === "suspended") {
      userId = await requirePermission("procurement", "suspend");
    } else if (toStatus === "awarded") {
      userId = await requirePermission("procurement", "award");
    } else {
      userId = await requirePermission("procurement", "update");
    }
    return await doAdvanceStatus(parsedInput.id, parsedInput.toStatus, parsedInput.reason, userId);
  });

export const awardProcurement = userAction
  .schema(z.object({
    id: z.string(),
    vendorId: z.string(),
    awardedAmount: z.number().positive(),
  }))
  .action(async ({ parsedInput }) => {
    const userId = await requirePermission("procurement", "award");
    return await db.transaction(async (tx) => {
      const [proc] = await tx.select().from(procurement).where(eq(procurement.id, parsedInput.id));
      if (!proc) throw new Error("Procurement not found");
      if (proc.status !== "evaluation") {
        throw new Error("Can only award procurements in evaluation stage");
      }

      // Log status change
      await tx.insert(procurementStatusLog).values({
        procurementId: parsedInput.id,
        fromStatus: "evaluation",
        toStatus: "awarded",
        changedBy: userId,
        reason: "Awarded to vendor",
      });

      const [result] = await tx.update(procurement).set({
        vendorId: parsedInput.vendorId,
        awardedAmount: parsedInput.awardedAmount,
        status: "awarded",
        updatedAt: new Date(),
      }).where(eq(procurement.id, parsedInput.id)).returning();

      return result;
    });
  });

export const cancelProcurement = userAction
  .schema(z.object({
    id: z.string(),
    reason: z.string().min(1),
  }))
  .action(async ({ parsedInput }) => {
    const userId = await requirePermission("procurement", "cancel");
    return await doAdvanceStatus(parsedInput.id, "cancelled", parsedInput.reason, userId);
  });

export const suspendProcurement = userAction
  .schema(z.object({
    id: z.string(),
    reason: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    const userId = await requirePermission("procurement", "suspend");
    return await doAdvanceStatus(parsedInput.id, "suspended", parsedInput.reason, userId);
  });

// ═════════════════════════════════════════════════════════════════════════════
// BUDGETS
// ═════════════════════════════════════════════════════════════════════════════

export const createBudget = userAction
  .schema(z.object({
    name: z.string().min(1),
    referenceNumber: z.string().min(1),
    economicCode: z.string().min(1),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("budget", "create");
    const [result] = await db.insert(budget).values(parsedInput).returning();
    return result;
  });

export const updateBudget = userAction
  .schema(z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    referenceNumber: z.string().optional(),
    economicCode: z.string().optional(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("budget", "update");
    const { id, ...data } = parsedInput;
    const [result] = await db.update(budget).set(data).where(eq(budget.id, id)).returning();
    return result;
  });

export const listBudgets = userAction
  .schema(z.object({}).optional())
  .action(async () => {
    await requirePermission("budget", "read");
    return db.select().from(budget).orderBy(budget.name);
  });

export const getBudgetWithYears = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("budget", "read");
    const [b] = await db.select().from(budget).where(eq(budget.id, parsedInput.id));
    if (!b) return null;
    const years = await db.select().from(budgetYear)
      .where(eq(budgetYear.budgetId, parsedInput.id))
      .orderBy(desc(budgetYear.year));
    return { ...b, years };
  });

// ═════════════════════════════════════════════════════════════════════════════
// BUDGET YEARS
// ═════════════════════════════════════════════════════════════════════════════

export const createBudgetYear = userAction
  .schema(z.object({
    budgetId: z.string(),
    year: z.number().int().min(2000),
    cash: z.number().min(0).default(0),
    credit: z.number().min(0).default(0),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("budget", "create");
    const [result] = await db.insert(budgetYear).values({
      ...parsedInput,
      consumedCash: 0,
      consumedCredit: 0,
      status: "open",
    }).returning();
    return result;
  });

export const updateBudgetYearAllocations = userAction
  .schema(z.object({
    id: z.string(),
    cash: z.number().min(0).optional(),
    credit: z.number().min(0).optional(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("budget", "update");
    const { id, ...data } = parsedInput;

    return await db.transaction(async (tx) => {
      const [by] = await tx.select().from(budgetYear).where(eq(budgetYear.id, id));
      if (!by) throw new Error("Budget year not found");
      if (by.status !== "open") throw new Error("Can only update open budget years");

      // Check no active obligations
      const activeObs = await tx.select({ id: obligation.id })
        .from(obligation)
        .where(and(eq(obligation.budgetYearId, id), eq(obligation.status, "active")))
        .limit(1);
      if (activeObs.length > 0) {
        throw new Error("Cannot update allocations when active obligations exist");
      }

      const [result] = await tx.update(budgetYear).set(data).where(eq(budgetYear.id, id)).returning();
      return result;
    });
  });

export const closeBudgetYear = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("budget", "close");
    const [result] = await db.update(budgetYear)
      .set({ status: "closed" })
      .where(eq(budgetYear.id, parsedInput.id))
      .returning();
    return result;
  });

export const freezeBudgetYear = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("budget", "freeze");
    const [result] = await db.update(budgetYear)
      .set({ status: "frozen" })
      .where(eq(budgetYear.id, parsedInput.id))
      .returning();
    return result;
  });

export const unfreezeBudgetYear = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("budget", "update");
    const [result] = await db.update(budgetYear)
      .set({ status: "open" })
      .where(eq(budgetYear.id, parsedInput.id))
      .returning();
    return result;
  });

export const getBudgetYearBalances = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("budget", "read");
    const [by] = await db.select().from(budgetYear).where(eq(budgetYear.id, parsedInput.id));
    if (!by) return null;
    return {
      ...by,
      remainingCash: by.cash - by.consumedCash,
      remainingCredit: by.credit - by.consumedCredit,
    };
  });

// ═════════════════════════════════════════════════════════════════════════════
// BUDGET TRANSFERS
// ═════════════════════════════════════════════════════════════════════════════

export const createBudgetTransfer = userAction
  .schema(z.object({
    fromBudgetYearId: z.string(),
    toBudgetYearId: z.string(),
    type: z.enum(["cash", "credit"]),
    amount: z.number().positive(),
    reason: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("budget", "transfer");
    if (parsedInput.fromBudgetYearId === parsedInput.toBudgetYearId) {
      throw new Error("Source and destination budget years must be different");
    }
    const [result] = await db.insert(budgetTransfer).values({
      ...parsedInput,
      status: "pending",
    }).returning();
    return result;
  });

export const approveBudgetTransfer = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    const userId = await requirePermission("budget", "transfer");

    return await db.transaction(async (tx) => {
      const [transfer] = await tx.select().from(budgetTransfer).where(eq(budgetTransfer.id, parsedInput.id));
      if (!transfer) throw new Error("Transfer not found");
      if (transfer.status !== "pending") throw new Error("Only pending transfers can be approved");

      // Validate both budget years are open
      const years = await tx.select().from(budgetYear)
        .where(inArray(budgetYear.id, [transfer.fromBudgetYearId, transfer.toBudgetYearId]));
      
      const fromYear = years.find(y => y.id === transfer.fromBudgetYearId);
      const toYear = years.find(y => y.id === transfer.toBudgetYearId);
      
      if (!fromYear || !toYear) throw new Error("Budget year not found");
      if (fromYear.status !== "open" || toYear.status !== "open") {
        throw new Error("Both budget years must be open");
      }

      // Validate source has sufficient balance
      if (transfer.type === "cash") {
        const remaining = fromYear.cash - fromYear.consumedCash;
        if (remaining < transfer.amount) throw new Error("Insufficient cash balance in source budget year");
      } else {
        const remaining = fromYear.credit - fromYear.consumedCredit;
        if (remaining < transfer.amount) throw new Error("Insufficient credit balance in source budget year");
      }

      // Update transfer status
      await tx.update(budgetTransfer).set({
        status: "approved",
        transferredAt: new Date(),
        transferredBy: userId,
      }).where(eq(budgetTransfer.id, parsedInput.id));

      // Adjust budget year balances
      if (transfer.type === "cash") {
        await tx.update(budgetYear).set({
          cash: fromYear.cash - transfer.amount,
        }).where(eq(budgetYear.id, transfer.fromBudgetYearId));
        await tx.update(budgetYear).set({
          cash: toYear.cash + transfer.amount,
        }).where(eq(budgetYear.id, transfer.toBudgetYearId));
      } else {
        await tx.update(budgetYear).set({
          credit: fromYear.credit - transfer.amount,
        }).where(eq(budgetYear.id, transfer.fromBudgetYearId));
        await tx.update(budgetYear).set({
          credit: toYear.credit + transfer.amount,
        }).where(eq(budgetYear.id, transfer.toBudgetYearId));
      }

      return { success: true };
    });
  });

export const rejectBudgetTransfer = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("budget", "transfer");
    const [result] = await db.update(budgetTransfer)
      .set({ status: "rejected" })
      .where(and(eq(budgetTransfer.id, parsedInput.id), eq(budgetTransfer.status, "pending")))
      .returning();
    if (!result) throw new Error("Transfer not found or not pending");
    return { success: true };
  });

export const listPendingTransfers = userAction
  .schema(z.object({}).optional())
  .action(async () => {
    await requirePermission("budget", "read");
    return db.select({
      id: budgetTransfer.id,
      fromBudgetYearId: budgetTransfer.fromBudgetYearId,
      toBudgetYearId: budgetTransfer.toBudgetYearId,
      type: budgetTransfer.type,
      amount: budgetTransfer.amount,
      reason: budgetTransfer.reason,
      status: budgetTransfer.status,
      createdAt: budgetTransfer.createdAt,
      fromYear: budgetYear.year,
    })
      .from(budgetTransfer)
      .innerJoin(budgetYear, eq(budgetTransfer.fromBudgetYearId, budgetYear.id))
      .where(eq(budgetTransfer.status, "pending"))
      .orderBy(desc(budgetTransfer.createdAt));
  });

// ═════════════════════════════════════════════════════════════════════════════
// OBLIGATIONS
// ═════════════════════════════════════════════════════════════════════════════

export const createObligation = userAction
  .schema(z.object({
    referenceNumber: z.string().min(1),
    amount: z.number().positive(),
    type: z.enum(["cash", "credit"]),
    procurementId: z.string(),
    budgetYearId: z.string(),
    note: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("obligation", "create");
    return await db.transaction(async (tx) => {
      // Validate budget year is open and has sufficient balance
      const [by] = await tx.select().from(budgetYear).where(eq(budgetYear.id, parsedInput.budgetYearId));
      if (!by) throw new Error("Budget year not found");
      if (by.status !== "open") throw new Error("Budget year must be open to create obligations");

      if (parsedInput.type === "cash") {
        const remaining = by.cash - by.consumedCash;
        if (remaining < parsedInput.amount) {
          throw new Error(`Insufficient cash balance. Remaining: ${remaining}, requested: ${parsedInput.amount}`);
        }
      } else {
        const remaining = by.credit - by.consumedCredit;
        if (remaining < parsedInput.amount) {
          throw new Error(`Insufficient credit balance. Remaining: ${remaining}, requested: ${parsedInput.amount}`);
        }
      }

      // Insert obligation
      const [result] = await tx.insert(obligation).values({
        ...parsedInput,
        status: "active",
      }).returning();

      // Reserve funds
      if (parsedInput.type === "cash") {
        await tx.update(budgetYear).set({
          consumedCash: by.consumedCash + parsedInput.amount,
        }).where(eq(budgetYear.id, parsedInput.budgetYearId));
      } else {
        await tx.update(budgetYear).set({
          consumedCredit: by.consumedCredit + parsedInput.amount,
        }).where(eq(budgetYear.id, parsedInput.budgetYearId));
      }

      return result;
    });
  });

export const cancelObligation = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("obligation", "cancel");
    return await db.transaction(async (tx) => {
      const [obl] = await tx.select().from(obligation).where(eq(obligation.id, parsedInput.id));
      if (!obl) throw new Error("Obligation not found");
      if (obl.status !== "active") throw new Error("Only active obligations can be cancelled");

      // Check no paid payments
      const paidPayments = await tx.select({ id: payment.id })
        .from(payment)
        .where(and(eq(payment.obligationId, parsedInput.id), eq(payment.status, "paid")))
        .limit(1);
      if (paidPayments.length > 0) {
        throw new Error("Cannot cancel obligation with paid payments");
      }

      // Update obligation status
      await tx.update(obligation).set({ status: "cancelled" }).where(eq(obligation.id, parsedInput.id));

      // Release reserved funds
      const [by] = await tx.select().from(budgetYear).where(eq(budgetYear.id, obl.budgetYearId));
      if (obl.type === "cash") {
        await tx.update(budgetYear).set({
          consumedCash: Math.max(0, by.consumedCash - obl.amount),
        }).where(eq(budgetYear.id, obl.budgetYearId));
      } else {
        await tx.update(budgetYear).set({
          consumedCredit: Math.max(0, by.consumedCredit - obl.amount),
        }).where(eq(budgetYear.id, obl.budgetYearId));
      }

      return { success: true };
    });
  });

export const listObligationsByProcurement = userAction
  .schema(z.object({ procurementId: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("obligation", "read");
    return db.select({
      id: obligation.id,
      referenceNumber: obligation.referenceNumber,
      amount: obligation.amount,
      type: obligation.type,
      status: obligation.status,
      note: obligation.note,
      createdAt: obligation.createdAt,
      year: budgetYear.year,
      budgetName: budget.name,
      economicCode: budget.economicCode,
    })
      .from(obligation)
      .innerJoin(budgetYear, eq(obligation.budgetYearId, budgetYear.id))
      .innerJoin(budget, eq(budgetYear.budgetId, budget.id))
      .where(eq(obligation.procurementId, parsedInput.procurementId))
      .orderBy(desc(obligation.createdAt));
  });

export const getObligationWithPayments = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("obligation", "read");
    const [obl] = await db.select().from(obligation).where(eq(obligation.id, parsedInput.id));
    if (!obl) return null;

    const paymentsList = await db.select().from(payment)
      .where(eq(payment.obligationId, parsedInput.id))
      .orderBy(payment.dueDate);

    const paidAmount = paymentsList
      .filter(p => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      ...obl,
      payments: paymentsList,
      paidAmount,
      remainingAmount: obl.amount - paidAmount,
    };
  });

// ═════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═════════════════════════════════════════════════════════════════════════════

export const createPayment = userAction
  .schema(z.object({
    referenceNumber: z.string().min(1),
    amount: z.number().positive(),
    dueDate: z.string().optional().nullable(),
    obligationId: z.string(),
    note: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("payment", "create");
    const [result] = await db.insert(payment).values({
      ...parsedInput,
      status: "pending",
    }).returning();
    return result;
  });

export const approvePayment = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("payment", "approve");
    const [result] = await db.update(payment)
      .set({ status: "approved" })
      .where(and(eq(payment.id, parsedInput.id), eq(payment.status, "pending")))
      .returning();
    if (!result) throw new Error("Payment not found or not pending");
    return result;
  });

export const markPaymentPaid = userAction
  .schema(z.object({
    id: z.string(),
    paymentMethod: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("payment", "mark-paid");
    const paidDate = new Date().toISOString().split("T")[0];
    const [result] = await db.update(payment)
      .set({
        status: "paid",
        paidDate,
        paymentMethod: parsedInput.paymentMethod ?? null,
      })
      .where(and(eq(payment.id, parsedInput.id), eq(payment.status, "approved")))
      .returning();
    if (!result) throw new Error("Payment not found or not approved");
    return result;
  });

export const rejectPayment = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("payment", "reject");
    const [result] = await db.update(payment)
      .set({ status: "rejected" })
      .where(and(eq(payment.id, parsedInput.id), inArray(payment.status, ["pending", "approved"])))
      .returning();
    if (!result) throw new Error("Payment not found or cannot be rejected");
    return result;
  });

export const listPaymentsByObligation = userAction
  .schema(z.object({ obligationId: z.string() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("payment", "read");
    return db.select().from(payment)
      .where(eq(payment.obligationId, parsedInput.obligationId))
      .orderBy(payment.dueDate);
  });

export const listBudgetYears = userAction
  .schema(z.object({}).optional())
  .action(async () => {
    await requirePermission("budget", "read");
    return db.select({
      id: budgetYear.id,
      budgetId: budgetYear.budgetId,
      year: budgetYear.year,
      cash: budgetYear.cash,
      credit: budgetYear.credit,
      consumedCash: budgetYear.consumedCash,
      consumedCredit: budgetYear.consumedCredit,
      status: budgetYear.status,
      budgetName: budget.name,
      budgetRef: budget.referenceNumber,
    })
      .from(budgetYear)
      .innerJoin(budget, eq(budgetYear.budgetId, budget.id))
      .orderBy(desc(budgetYear.year));
  });

export const listAllObligations = userAction
  .schema(z.object({
    page: z.number().default(1).optional(),
    limit: z.number().default(20).optional(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("obligation", "read");
    const { page = 1, limit = 20 } = parsedInput;
    const offset = (page - 1) * limit;

    const obligations = await db.select({
      id: obligation.id,
      referenceNumber: obligation.referenceNumber,
      amount: obligation.amount,
      type: obligation.type,
      status: obligation.status,
      note: obligation.note,
      createdAt: obligation.createdAt,
      procurementId: procurement.id,
      procurementName: procurement.name,
      procurementRef: procurement.referenceNumber,
      budgetYearId: budgetYear.id,
      budgetYear: budgetYear.year,
      budgetName: budget.name,
    })
      .from(obligation)
      .innerJoin(procurement, eq(obligation.procurementId, procurement.id))
      .innerJoin(budgetYear, eq(obligation.budgetYearId, budgetYear.id))
      .innerJoin(budget, eq(budgetYear.budgetId, budget.id))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(obligation.createdAt));

    // Compute paid amounts per obligation
    const oblIds = obligations.map(o => o.id);
    if (oblIds.length === 0) return { obligations: [], total: 0, page, totalPages: 0 };

    const [paidSums, totalResult] = await Promise.all([
      db.select({
        obligationId: payment.obligationId,
        totalPaid: sql<number>`coalesce(sum(${payment.amount}), 0)`,
      })
        .from(payment)
        .where(and(
          inArray(payment.obligationId, oblIds),
          eq(payment.status, "paid"),
        ))
        .groupBy(payment.obligationId),
      db.select({ count: count() }).from(obligation),
    ]);

    const paidMap = new Map(paidSums.map(p => [p.obligationId, p.totalPaid]));

    return {
      obligations: obligations.map(o => ({
        ...o,
        paidAmount: paidMap.get(o.id) ?? 0,
        remainingAmount: o.amount - (paidMap.get(o.id) ?? 0),
      })),
      total: totalResult[0].count,
      page,
      totalPages: Math.ceil(totalResult[0].count / limit),
    };
  });

export const listAllPayments = userAction
  .schema(z.object({
    page: z.number().default(1).optional(),
    limit: z.number().default(20).optional(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("payment", "read");
    const { page = 1, limit = 20 } = parsedInput;
    const offset = (page - 1) * limit;

    const [payments, totalResult] = await Promise.all([
      db.select({
        id: payment.id,
        referenceNumber: payment.referenceNumber,
        amount: payment.amount,
        status: payment.status,
        dueDate: payment.dueDate,
        paidDate: payment.paidDate,
        paymentMethod: payment.paymentMethod,
        note: payment.note,
        createdAt: payment.createdAt,
        obligationId: obligation.id,
        obligationRef: obligation.referenceNumber,
        procurementId: procurement.id,
        procurementName: procurement.name,
      })
        .from(payment)
        .innerJoin(obligation, eq(payment.obligationId, obligation.id))
        .innerJoin(procurement, eq(obligation.procurementId, procurement.id))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(payment.createdAt)),
      db.select({ count: count() }).from(payment),
    ]);

    return {
      payments,
      total: totalResult[0].count,
      page,
      totalPages: Math.ceil(totalResult[0].count / limit),
    };
  });

export const listAllTransfers = userAction
  .schema(z.object({
    page: z.number().default(1).optional(),
    limit: z.number().default(20).optional(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("budget", "read");
    const { page = 1, limit = 20 } = parsedInput;
    const offset = (page - 1) * limit;

    const [transfers, totalResult] = await Promise.all([
      db.select()
        .from(budgetTransfer)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(budgetTransfer.createdAt)),
      db.select({ count: count() }).from(budgetTransfer),
    ]);

    // Enrich with budget year + budget name
    const allYears = await db.select({
      id: budgetYear.id,
      year: budgetYear.year,
      budgetName: budget.name,
    })
      .from(budgetYear)
      .innerJoin(budget, eq(budgetYear.budgetId, budget.id));

    const yearMap = new Map(allYears.map(y => [y.id, y]));

    return {
      transfers: transfers.map(t => ({
        ...t,
        fromYear: yearMap.get(t.fromBudgetYearId)?.year,
        fromBudgetName: yearMap.get(t.fromBudgetYearId)?.budgetName,
        toYear: yearMap.get(t.toBudgetYearId)?.year,
        toBudgetName: yearMap.get(t.toBudgetYearId)?.budgetName,
      })),
      total: totalResult[0].count,
      page,
      totalPages: Math.ceil(totalResult[0].count / limit),
    };
  });

export const getOverduePayments = userAction
  .schema(z.object({}).optional())
  .action(async () => {
    await requirePermission("payment", "read");
    const today = new Date().toISOString().split("T")[0];
    return db.select({
      id: payment.id,
      referenceNumber: payment.referenceNumber,
      amount: payment.amount,
      status: payment.status,
      dueDate: payment.dueDate,
      obligationRef: obligation.referenceNumber,
    })
      .from(payment)
      .innerJoin(obligation, eq(payment.obligationId, obligation.id))
      .where(
        and(
          inArray(payment.status, ["pending", "approved"]),
          sql`payment.due_date < ${today}`,
        )
      );
  });

// ═════════════════════════════════════════════════════════════════════════════
// SOFT DELETE & RESTORE
// ═════════════════════════════════════════════════════════════════════════════

export const softDeleteProcurement = userAction
  .schema(z.object({
    id: z.string(),
    reason: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    const userId = await requirePermission("procurement", "delete");
    const { id, reason } = parsedInput;

    // Check if procurement exists and is not already deleted
    const [existing] = await db.select()
      .from(procurement)
      .where(and(eq(procurement.id, id), isNull(procurement.deletedAt)));
    
    if (!existing) {
      throw new Error("Procurement not found or already deleted");
    }

    // Soft delete
    const [result] = await db.update(procurement)
      .set({
        deletedAt: new Date(),
        deletedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(procurement.id, id))
      .returning();

    // Audit log
    await createAuditLog({
      entityType: "procurement",
      entityId: id,
      action: "delete",
      changes: { deletedAt: new Date(), reason },
      reason: reason || undefined,
    });

    return result;
  });

export const restoreProcurement = userAction
  .schema(z.object({
    id: z.string(),
    reason: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    const userId = await requirePermission("procurement", "update");
    const { id, reason } = parsedInput;

    // Check if procurement exists and is deleted
    const [existing] = await db.select()
      .from(procurement)
      .where(and(eq(procurement.id, id), isNotNull(procurement.deletedAt)));
    
    if (!existing) {
      throw new Error("Procurement not found or not deleted");
    }

    // Restore
    const [result] = await db.update(procurement)
      .set({
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(procurement.id, id))
      .returning();

    // Audit log
    await createAuditLog({
      entityType: "procurement",
      entityId: id,
      action: "restore",
      changes: { restoredAt: new Date(), reason },
      reason: reason || undefined,
    });

    return result;
  });

export const listDeletedProcurements = userAction
  .schema(z.object({
    page: z.number().default(1).optional(),
    limit: z.number().default(20).optional(),
    search: z.string().optional(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("procurement", "read");
    const { page = 1, limit = 20, search } = parsedInput;
    const offset = (page - 1) * limit;
    const conditions = [isNotNull(procurement.deletedAt)];

    if (search) {
      conditions.push(
        or(
          like(procurement.name, `%${search}%`),
          like(procurement.referenceNumber, `%${search}%`),
        )!
      );
    }

    const where = and(...conditions);

    const [procurements, totalResult] = await Promise.all([
      db.select({
        id: procurement.id,
        referenceNumber: procurement.referenceNumber,
        name: procurement.name,
        status: procurement.status,
        type: procurement.type,
        deletedAt: procurement.deletedAt,
        deletedBy: procurement.deletedBy,
        deletedByName: user.name,
        createdAt: procurement.createdAt,
        vendorName: vendor.name,
      })
        .from(procurement)
        .leftJoin(vendor, eq(procurement.vendorId, vendor.id))
        .leftJoin(user, eq(procurement.deletedBy, user.id))
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(procurement.deletedAt)),
      db.select({ count: count() }).from(procurement).where(where),
    ]);

    return {
      procurements,
      total: totalResult[0].count,
      page,
      totalPages: Math.ceil(totalResult[0].count / limit),
    };
  });

// ═════════════════════════════════════════════════════════════════════════════
// PROCUREMENT ACCESS CONTROL
// ═════════════════════════════════════════════════════════════════════════════

export const grantProcurementAccess = userAction
  .schema(z.object({
    userId: z.string().min(1),
    role: z.enum(["read", "write"]),
  }))
  .action(async ({ parsedInput }) => {
    const currentUserId = await getCurrentUserId();
    
    return await db.transaction(async (tx) => {
      // Check if already exists
      const [existing] = await tx.select().from(procurementMember)
        .where(eq(procurementMember.userId, parsedInput.userId));
      
      if (existing) {
        // Update role
        await tx.update(procurementMember)
          .set({ role: parsedInput.role, grantedBy: currentUserId })
          .where(eq(procurementMember.userId, parsedInput.userId));
        return { success: true };
      }
      
      await tx.insert(procurementMember).values({
        userId: parsedInput.userId,
        role: parsedInput.role,
        grantedBy: currentUserId,
      });
      return { success: true };
    });
  });

export const revokeProcurementAccess = userAction
  .schema(z.object({ userId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await db.delete(procurementMember)
      .where(eq(procurementMember.userId, parsedInput.userId));
    return { success: true };
  });

export const listProcurementMembers = userAction
  .schema(z.object({}).optional())
  .action(async () => {
    return db.select({
      id: procurementMember.id,
      userId: procurementMember.userId,
      role: procurementMember.role,
      grantedBy: procurementMember.grantedBy,
      grantedAt: procurementMember.grantedAt,
      userName: user.name,
      userEmail: user.email,
    })
      .from(procurementMember)
      .innerJoin(user, eq(procurementMember.userId, user.id))
      .orderBy(procurementMember.grantedAt);
  });

export const checkProcurementAccess = userAction
  .schema(z.object({ userId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    // Look up the user's role from the auth system
    const [targetUser] = await db.select({ role: user.role })
      .from(user)
      .where(eq(user.id, parsedInput.userId))
      .limit(1);

    if (!targetUser?.role || targetUser.role === "user") {
      return { hasAccess: false, role: null };
    }

    // Staff roles have access
    const staffRoles = ["admin", "viewer", "procurement_manager", "budget_manager"];
    if (!staffRoles.includes(targetUser.role)) {
      return { hasAccess: false, role: null };
    }

    // Determine if read or write based on role
    const readOnlyRoles = ["viewer"];
    const accessRole = readOnlyRoles.includes(targetUser.role) ? "read" : "write";

    return { hasAccess: true, role: accessRole };
  });

// ═════════════════════════════════════════════════════════════════════════════
// YEARLY OVERVIEW
// ═════════════════════════════════════════════════════════════════════════════

export const getProcurementYearlyOverview = userAction
  .schema(z.object({ year: z.number().int() }))
  .action(async ({ parsedInput }) => {
    await requirePermission("budget", "read");
    const years = await db.select().from(budgetYear)
      .where(eq(budgetYear.year, parsedInput.year));

    const totalCash = years.reduce((s, y) => s + y.cash, 0);
    const totalCredit = years.reduce((s, y) => s + y.credit, 0);
    const totalConsumedCash = years.reduce((s, y) => s + y.consumedCash, 0);
    const totalConsumedCredit = years.reduce((s, y) => s + y.consumedCredit, 0);

    // Active obligations for these budget years
    const yearIds = years.map(y => y.id);
    let totalReserved = 0;
    let totalPaid = 0;

    if (yearIds.length > 0) {
      const activeObs = await db.select({
        amount: obligation.amount,
        id: obligation.id,
      })
        .from(obligation)
        .where(and(
          inArray(obligation.budgetYearId, yearIds),
          eq(obligation.status, "active"),
        ));

      totalReserved = activeObs.reduce((s, o) => s + o.amount, 0);

      const oblIds = activeObs.map(o => o.id);
      if (oblIds.length > 0) {
        const paidSums = await db.select({
          total: sql<number>`coalesce(sum(${payment.amount}), 0)`,
        })
          .from(payment)
          .where(and(
            inArray(payment.obligationId, oblIds),
            eq(payment.status, "paid"),
          ));
        totalPaid = paidSums[0]?.total ?? 0;
      }
    }

    return {
      totalCash,
      totalCredit,
      totalConsumedCash,
      totalConsumedCredit,
      remainingCash: totalCash - totalConsumedCash,
      remainingCredit: totalCredit - totalConsumedCredit,
      totalReserved,
      totalPaid,
    };
  });

// ═════════════════════════════════════════════════════════════════════════════
// AUDIT LOG FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

export const getAuditLogs = userAction
  .schema(z.object({
    entityType: z.enum(["procurement", "vendor", "budget", "obligation", "payment"]).optional(),
    entityId: z.string().optional(),
    userId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.number().default(50).optional(),
  }))
  .action(async ({ parsedInput }) => {
    await requirePermission("procurement", "read");
    const { entityType, entityId, userId, startDate, endDate, limit = 50 } = parsedInput;

    const conditions: any[] = [];
    if (entityType) conditions.push(eq(auditLog.entityType, entityType));
    if (entityId) conditions.push(eq(auditLog.entityId, entityId));
    if (userId) conditions.push(eq(auditLog.userId, userId));
    if (startDate) {
      conditions.push(sql`audit_log.timestamp >= ${new Date(startDate).getTime()}`);
    }
    if (endDate) {
      conditions.push(sql`audit_log.timestamp <= ${new Date(endDate).getTime()}`);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await db.select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.timestamp))
      .limit(limit);

    // Parse changes JSON
    return logs.map(log => ({
      ...log,
      changes: log.changes ? JSON.parse(log.changes) : null,
    }));
  });
