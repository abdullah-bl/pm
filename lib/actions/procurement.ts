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
} from "@/lib/db/schema";
import { eq, and, desc, sql, inArray, ne } from "drizzle-orm";

async function getCurrentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? "";
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
    const { id, ...data } = parsedInput;
    const [result] = await db.update(vendor).set(data).where(eq(vendor.id, id)).returning();
    return result;
  });

export const deleteVendor = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
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
  .schema(z.object({}).optional())
  .action(async () => {
    return db.select().from(vendor).orderBy(vendor.name);
  });

export const getVendor = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
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
    const [result] = await db.insert(procurement).values({
      ...parsedInput,
      status: "draft",
    }).returning();
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
    return result;
  });

export const listProcurements = userAction
  .schema(z.object({
    status: z.enum(["draft", "published", "offers_open", "evaluation", "awarded", "contract_active", "completed", "cancelled", "suspended"]).optional(),
    type: z.enum(["goods", "services", "works"]).optional(),
  }).optional())
  .action(async ({ parsedInput }) => {
    const filters = parsedInput ?? {};
    const conditions = [];
    if (filters.status) conditions.push(eq(procurement.status, filters.status));
    if (filters.type) conditions.push(eq(procurement.type, filters.type));

    return db.select({
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
      createdAt: procurement.createdAt,
      updatedAt: procurement.updatedAt,
      vendorName: vendor.name,
    })
      .from(procurement)
      .leftJoin(vendor, eq(procurement.vendorId, vendor.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(procurement.createdAt));
  });

export const getProcurement = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
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
}

export const advanceProcurementStatus = userAction
  .schema(z.object({
    id: z.string(),
    toStatus: z.enum(["draft", "published", "offers_open", "evaluation", "awarded", "contract_active", "completed", "cancelled", "suspended"]),
    reason: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    return await doAdvanceStatus(parsedInput.id, parsedInput.toStatus, parsedInput.reason, userId);
  });

export const awardProcurement = userAction
  .schema(z.object({
    id: z.string(),
    vendorId: z.string(),
    awardedAmount: z.number().positive(),
  }))
  .action(async ({ parsedInput }) => {
    return await db.transaction(async (tx) => {
      const [proc] = await tx.select().from(procurement).where(eq(procurement.id, parsedInput.id));
      if (!proc) throw new Error("Procurement not found");
      if (proc.status !== "evaluation") {
        throw new Error("Can only award procurements in evaluation stage");
      }

      const userId = await getCurrentUserId();

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
    const userId = await getCurrentUserId();
    return await doAdvanceStatus(parsedInput.id, "cancelled", parsedInput.reason, userId);
  });

export const suspendProcurement = userAction
  .schema(z.object({
    id: z.string(),
    reason: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
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
    const { id, ...data } = parsedInput;
    const [result] = await db.update(budget).set(data).where(eq(budget.id, id)).returning();
    return result;
  });

export const listBudgets = userAction
  .schema(z.object({}).optional())
  .action(async () => {
    return db.select().from(budget).orderBy(budget.name);
  });

export const getBudgetWithYears = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
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
    const [result] = await db.update(budgetYear)
      .set({ status: "closed" })
      .where(eq(budgetYear.id, parsedInput.id))
      .returning();
    return result;
  });

export const freezeBudgetYear = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    const [result] = await db.update(budgetYear)
      .set({ status: "frozen" })
      .where(eq(budgetYear.id, parsedInput.id))
      .returning();
    return result;
  });

export const unfreezeBudgetYear = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    const [result] = await db.update(budgetYear)
      .set({ status: "open" })
      .where(eq(budgetYear.id, parsedInput.id))
      .returning();
    return result;
  });

export const getBudgetYearBalances = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
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
    const userId = await getCurrentUserId();

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
    const [result] = await db.insert(payment).values({
      ...parsedInput,
      status: "pending",
    }).returning();
    return result;
  });

export const approvePayment = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
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
    return db.select().from(payment)
      .where(eq(payment.obligationId, parsedInput.obligationId))
      .orderBy(payment.dueDate);
  });

export const listBudgetYears = userAction
  .schema(z.object({}).optional())
  .action(async () => {
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
  .schema(z.object({}).optional())
  .action(async () => {
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
      .orderBy(desc(obligation.createdAt));

    // Compute paid amounts per obligation
    const oblIds = obligations.map(o => o.id);
    if (oblIds.length === 0) return [];

    const paidSums = await db.select({
      obligationId: payment.obligationId,
      totalPaid: sql<number>`coalesce(sum(${payment.amount}), 0)`,
    })
      .from(payment)
      .where(and(
        inArray(payment.obligationId, oblIds),
        eq(payment.status, "paid"),
      ))
      .groupBy(payment.obligationId);

    const paidMap = new Map(paidSums.map(p => [p.obligationId, p.totalPaid]));

    return obligations.map(o => ({
      ...o,
      paidAmount: paidMap.get(o.id) ?? 0,
      remainingAmount: o.amount - (paidMap.get(o.id) ?? 0),
    }));
  });

export const listAllPayments = userAction
  .schema(z.object({}).optional())
  .action(async () => {
    return db.select({
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
      .orderBy(desc(payment.createdAt));
  });

export const listAllTransfers = userAction
  .schema(z.object({}).optional())
  .action(async () => {
    const transfers = await db.select()
      .from(budgetTransfer)
      .orderBy(desc(budgetTransfer.createdAt));

    // Enrich with budget year + budget name
    const allYears = await db.select({
      id: budgetYear.id,
      year: budgetYear.year,
      budgetName: budget.name,
    })
      .from(budgetYear)
      .innerJoin(budget, eq(budgetYear.budgetId, budget.id));

    const yearMap = new Map(allYears.map(y => [y.id, y]));

    return transfers.map(t => ({
      ...t,
      fromYear: yearMap.get(t.fromBudgetYearId)?.year,
      fromBudgetName: yearMap.get(t.fromBudgetYearId)?.budgetName,
      toYear: yearMap.get(t.toBudgetYearId)?.year,
      toBudgetName: yearMap.get(t.toBudgetYearId)?.budgetName,
    }));
  });

export const getOverduePayments = userAction
  .schema(z.object({}).optional())
  .action(async () => {
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
