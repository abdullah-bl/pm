import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index, real } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

// ─── Vendor ──────────────────────────────────────────────────────────────────

export const vendor = sqliteTable("vendor", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  category: text("category"),
  licenseNumber: text("license_number"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// ─── Procurement ─────────────────────────────────────────────────────────────

export const procurement = sqliteTable(
  "procurement",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    referenceNumber: text("reference_number").notNull().unique(),
    tenderNumber: text("tender_number"),
    name: text("name").notNull(),
    status: text("status", {
      enum: [
        "draft",
        "published",
        "offers_open",
        "evaluation",
        "awarded",
        "contract_active",
        "completed",
        "cancelled",
        "suspended",
      ],
    })
      .default("draft")
      .notNull(),
    type: text("type", { enum: ["goods", "services", "works"] }).notNull(),
    vendorId: text("vendor_id").references(() => vendor.id),
    awardedAmount: real("awarded_amount"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    actualEndDate: text("actual_end_date"),
    cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
    suspendedAt: integer("suspended_at", { mode: "timestamp_ms" }),
    cancellationReason: text("cancellation_reason"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_procurement_status").on(table.status),
    index("idx_procurement_vendor").on(table.vendorId),
  ],
);

// ─── Procurement Status Log ──────────────────────────────────────────────────

export const procurementStatusLog = sqliteTable(
  "procurement_status_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    procurementId: text("procurement_id")
      .notNull()
      .references(() => procurement.id),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    changedAt: integer("changed_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    changedBy: text("changed_by").notNull(),
    reason: text("reason"),
  },
  (table) => [
    index("idx_procurement_status_log_proc").on(table.procurementId),
  ],
);

// ─── Budget ──────────────────────────────────────────────────────────────────

export const budget = sqliteTable("budget", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  referenceNumber: text("reference_number").notNull().unique(),
  economicCode: text("economic_code").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// ─── Budget Year ─────────────────────────────────────────────────────────────

export const budgetYear = sqliteTable(
  "budget_year",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    budgetId: text("budget_id")
      .notNull()
      .references(() => budget.id),
    year: integer("year").notNull(),
    cash: real("cash").notNull().default(0),
    credit: real("credit").notNull().default(0),
    consumedCash: real("consumed_cash").notNull().default(0),
    consumedCredit: real("consumed_credit").notNull().default(0),
    status: text("status", { enum: ["open", "closed", "frozen"] })
      .default("open")
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("idx_budget_year_budget").on(table.budgetId, table.year),
  ],
);

// ─── Budget Transfer ─────────────────────────────────────────────────────────

export const budgetTransfer = sqliteTable(
  "budget_transfer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    fromBudgetYearId: text("from_budget_year_id")
      .notNull()
      .references(() => budgetYear.id),
    toBudgetYearId: text("to_budget_year_id")
      .notNull()
      .references(() => budgetYear.id),
    type: text("type", { enum: ["cash", "credit"] }).notNull(),
    amount: real("amount").notNull(),
    reason: text("reason"),
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .default("pending")
      .notNull(),
    transferredAt: integer("transferred_at", { mode: "timestamp_ms" }),
    transferredBy: text("transferred_by"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("idx_transfer_from").on(table.fromBudgetYearId),
    index("idx_transfer_to").on(table.toBudgetYearId),
  ],
);

// ─── Obligation ──────────────────────────────────────────────────────────────

export const obligation = sqliteTable(
  "obligation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    referenceNumber: text("reference_number").notNull().unique(),
    amount: real("amount").notNull(),
    type: text("type", { enum: ["cash", "credit"] }).notNull(),
    status: text("status", { enum: ["active", "cancelled"] })
      .default("active")
      .notNull(),
    procurementId: text("procurement_id")
      .notNull()
      .references(() => procurement.id),
    budgetYearId: text("budget_year_id")
      .notNull()
      .references(() => budgetYear.id),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("idx_obligation_procurement").on(table.procurementId),
    index("idx_obligation_budget_year").on(table.budgetYearId),
  ],
);

// ─── Payment ─────────────────────────────────────────────────────────────────

export const payment = sqliteTable(
  "payment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    referenceNumber: text("reference_number").notNull().unique(),
    amount: real("amount").notNull(),
    status: text("status", { enum: ["pending", "approved", "paid", "rejected"] })
      .default("pending")
      .notNull(),
    dueDate: text("due_date"),
    paidDate: text("paid_date"),
    paymentMethod: text("payment_method"),
    obligationId: text("obligation_id")
      .notNull()
      .references(() => obligation.id),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("idx_payment_obligation").on(table.obligationId),
  ],
);

// ─── Procurement Member (Access Control) ─────────────────────────────────────

export const procurementMember = sqliteTable(
  "procurement_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["read", "write"] })
      .default("read")
      .notNull(),
    grantedBy: text("granted_by")
      .notNull()
      .references(() => user.id),
    grantedAt: integer("granted_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("procurement_member_userId_idx").on(table.userId),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const vendorRelations = relations(vendor, ({ many }) => ({
  procurements: many(procurement),
}));

export const procurementRelations = relations(procurement, ({ one, many }) => ({
  vendor: one(vendor, {
    fields: [procurement.vendorId],
    references: [vendor.id],
  }),
  statusLogs: many(procurementStatusLog),
  obligations: many(obligation),
}));

export const procurementStatusLogRelations = relations(procurementStatusLog, ({ one }) => ({
  procurement: one(procurement, {
    fields: [procurementStatusLog.procurementId],
    references: [procurement.id],
  }),
}));

export const budgetRelations = relations(budget, ({ many }) => ({
  years: many(budgetYear),
}));

export const budgetYearRelations = relations(budgetYear, ({ one, many }) => ({
  budget: one(budget, {
    fields: [budgetYear.budgetId],
    references: [budget.id],
  }),
  obligations: many(obligation),
  transfersFrom: many(budgetTransfer, { relationName: "fromBudgetYear" }),
  transfersTo: many(budgetTransfer, { relationName: "toBudgetYear" }),
}));

export const budgetTransferRelations = relations(budgetTransfer, ({ one }) => ({
  fromBudgetYear: one(budgetYear, {
    fields: [budgetTransfer.fromBudgetYearId],
    references: [budgetYear.id],
    relationName: "fromBudgetYear",
  }),
  toBudgetYear: one(budgetYear, {
    fields: [budgetTransfer.toBudgetYearId],
    references: [budgetYear.id],
    relationName: "toBudgetYear",
  }),
}));

export const obligationRelations = relations(obligation, ({ one, many }) => ({
  procurement: one(procurement, {
    fields: [obligation.procurementId],
    references: [procurement.id],
  }),
  budgetYear: one(budgetYear, {
    fields: [obligation.budgetYearId],
    references: [budgetYear.id],
  }),
  payments: many(payment),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  obligation: one(obligation, {
    fields: [payment.obligationId],
    references: [obligation.id],
  }),
}));

export const procurementMemberRelations = relations(procurementMember, ({ one }) => ({
  user: one(user, {
    fields: [procurementMember.userId],
    references: [user.id],
  }),
  grantedByUser: one(user, {
    fields: [procurementMember.grantedBy],
    references: [user.id],
    relationName: "procurementGrantedBy",
  }),
}));
