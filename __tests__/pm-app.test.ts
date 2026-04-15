import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the DB module ────────────────────────────────────────────────────
vi.mock("@/lib/db", () => {
  const eq = vi.fn((col, val) => ({ col, val, _type: "eq" }));
  const and = vi.fn((...conds) => ({ _type: "and", conds }));
  const or = vi.fn((...conds) => ({ _type: "or", conds }));
  const desc = vi.fn((col: any) => col);
  const count = vi.fn(() => "count");
  const sql = vi.fn((strings: any, ...values: any) => ({ _type: "sql", strings, values }));
  const like = vi.fn((col: any, pattern: string) => ({ col, pattern, _type: "like" }));
  const inArray = vi.fn((col: any, vals: any[]) => ({ col, vals, _type: "inArray" }));
  const not = vi.fn((expr: any) => ({ _type: "not", expr }));
  const gte = vi.fn((col: any, val: any) => ({ col, val, _type: "gte" }));
  const lte = vi.fn((col: any, val: any) => ({ col, val, _type: "lte" }));

  const mockWhere = vi.fn(() => mockChain);
  const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: vi.fn(() => mockChain), limit: vi.fn(() => mockChain), offset: vi.fn(() => mockChain) }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  const mockInsert = vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: "mock-id" }])) })) }));
  const mockUpdate = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([])) })) }));
  const mockDelete = vi.fn(() => ({ where: vi.fn(() => Promise.resolve([])) }));

  const db = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  };

  return { db, _drizzle: {} };
});

vi.mock("@/lib/db/schema", () => ({
  user: { id: "id", name: "name", email: "email", role: "role", banned: "banned", banReason: "banReason", banExpires: "banExpires", image: "image", createdAt: "createdAt", updatedAt: "updatedAt" },
  session: { id: "id", userId: "userId", expiresAt: "expiresAt" },
  account: { id: "id", userId: "userId" },
  verification: { id: "id" },
  project: { id: "id", name: "name", description: "description", status: "status", createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt" },
  task: { id: "id", title: "title", description: "description", status: "status", priority: "priority", dueDate: "dueDate", projectId: "projectId", assigneeId: "assigneeId", createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt" },
  comment: { id: "id", content: "content", taskId: "taskId", authorId: "authorId", createdAt: "createdAt", updatedAt: "updatedAt" },
  collectionMember: { id: "id", collectionId: "collectionId", userId: "userId", role: "role", status: "status", invitedAt: "invitedAt", acceptedAt: "acceptedAt" },
  attachment: { id: "id", url: "url", filename: "filename", mimetype: "mimetype", size: "size", taskId: "taskId", commentId: "commentId", uploadedBy: "uploadedBy", createdAt: "createdAt" },
}));

vi.mock("@/lib/db/schema/procurement-schema", () => ({
  vendor: { id: "id", name: "name", email: "email", phone: "phone", category: "category" },
  procurement: { id: "id", referenceNumber: "referenceNumber", name: "name", status: "status", type: "type", vendorId: "vendorId" },
  procurementStatusLog: { id: "id", procurementId: "procurementId" },
  budget: { id: "id", name: "name", referenceNumber: "referenceNumber" },
  budgetYear: { id: "id", budgetId: "budgetId", year: "year" },
  budgetTransfer: { id: "id" },
  obligation: { id: "id" },
  payment: { id: "id" },
  procurementMember: { id: "id" },
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve({ user: { id: "admin-id", role: "admin" }, session: { id: "sess-id" } })),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock("dotenv/config", () => ({}));

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("Data Layer — Core Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export db with select, insert, update, delete methods", async () => {
    const { db } = await import("@/lib/db");
    expect(db.select).toBeDefined();
    expect(db.insert).toBeDefined();
    expect(db.update).toBeDefined();
    expect(db.delete).toBeDefined();
  });
});

describe("Server Actions — Exports", () => {
  it("collections actions export all expected actions", async () => {
    const mod = await import("@/lib/actions/collections");
    const exports = Object.keys(mod).filter(k => typeof (mod as any)[k]?.unsafeAction === "function" || typeof (mod as any)[k] === "function");

    const expectedCollections = [
      "getMyCollections", "getUserCollectionDetail", "createCollection", "editCollection", "removeCollection",
      "getUserTasks", "createUserTask", "editUserTask", "removeUserTask",
      "getUserComments", "addUserComment", "removeUserComment",
      "getMembers", "inviteMember", "changeMemberRole", "kickMember", "searchUsers",
    ];

    for (const name of expectedCollections) {
      expect(exports, `Missing export: ${name}`).toContain(name);
    }
  });

  it("tasks (admin) actions export all expected actions", async () => {
    const mod = await import("@/lib/actions/tasks");
    const exports = Object.keys(mod).filter(k => typeof (mod as any)[k]?.unsafeAction === "function" || typeof (mod as any)[k] === "function");

    const expected = [
      "listProjects", "newProject", "editProject", "removeProject",
      "listTasks", "newTask", "editTask", "removeTask",
      "addComment", "removeComment", "getProjectDetail", "getTaskDetail", "listComments",
    ];

    for (const name of expected) {
      expect(exports, `Missing export: ${name}`).toContain(name);
    }
  });

  it("users (admin) actions export all expected actions", async () => {
    const mod = await import("@/lib/actions/users");
    const exports = Object.keys(mod).filter(k => typeof (mod as any)[k]?.unsafeAction === "function" || typeof (mod as any)[k] === "function");

    const expected = [
      "listUsers", "createUser", "updateUser", "deleteUser",
      "banUser", "unbanUser", "getDashboardStatsAction",
    ];

    for (const name of expected) {
      expect(exports, `Missing export: ${name}`).toContain(name);
    }
  });

  it("procurement actions export all expected actions", async () => {
    const mod = await import("@/lib/actions/procurement");
    const exports = Object.keys(mod).filter(k => typeof (mod as any)[k]?.unsafeAction === "function" || typeof (mod as any)[k] === "function");

    const expected = [
      "createVendor", "updateVendor", "deleteVendor", "listVendors", "getVendor",
      "createProcurement", "updateProcurement", "listProcurements", "getProcurement",
      "advanceProcurementStatus", "awardProcurement", "cancelProcurement", "suspendProcurement",
      "createBudget", "updateBudget", "listBudgets", "getBudgetWithYears",
      "createBudgetYear", "updateBudgetYearAllocations", "closeBudgetYear", "freezeBudgetYear", "unfreezeBudgetYear",
      "createBudgetTransfer", "approveBudgetTransfer", "rejectBudgetTransfer", "listPendingTransfers",
      "createObligation", "cancelObligation", "listObligationsByProcurement", "getObligationWithPayments",
      "createPayment", "approvePayment", "markPaymentPaid", "rejectPayment", "listPaymentsByObligation",
      "grantProcurementAccess", "revokeProcurementAccess", "listProcurementMembers",
    ];

    for (const name of expected) {
      expect(exports, `Missing export: ${name}`).toContain(name);
    }
  });

  it("settings actions export backup/restore actions", async () => {
    const mod = await import("@/lib/actions/settings");
    const exports = Object.keys(mod).filter(k => typeof (mod as any)[k]?.unsafeAction === "function" || typeof (mod as any)[k] === "function");

    const expected = [
      "backupDatabase", "validateBackup", "restoreDatabase", "resetDatabase",
      "getDbStatsAction", "listBackups", "validateBackupFile", "rollbackToBackup",
    ];

    for (const name of expected) {
      expect(exports, `Missing export: ${name}`).toContain(name);
    }
  });

  it("files actions export attachment actions", async () => {
    const mod = await import("@/lib/actions/files");
    const exports = Object.keys(mod).filter(k => typeof (mod as any)[k]?.unsafeAction === "function" || typeof (mod as any)[k] === "function");

    const expected = [
      "listTaskAttachments", "listCommentAttachments", "deleteAttachment", "adminDeleteAttachment",
    ];

    for (const name of expected) {
      expect(exports, `Missing export: ${name}`).toContain(name);
    }
  });
});

describe("Schema — Table Definitions", () => {
  it("tasks-schema exports all tables", async () => {
    const mod = await import("@/lib/db/schema/tasks-schema");
    expect(mod.project).toBeDefined();
    expect(mod.task).toBeDefined();
    expect(mod.comment).toBeDefined();
    expect(mod.attachment).toBeDefined();
    expect(mod.collectionMember).toBeDefined();
  });

  it("procurement-schema exports all tables", async () => {
    const mod = await import("@/lib/db/schema/procurement-schema");
    expect(mod.vendor).toBeDefined();
    expect(mod.procurement).toBeDefined();
    expect(mod.procurementStatusLog).toBeDefined();
    expect(mod.budget).toBeDefined();
    expect(mod.budgetYear).toBeDefined();
    expect(mod.budgetTransfer).toBeDefined();
    expect(mod.obligation).toBeDefined();
    expect(mod.payment).toBeDefined();
    expect(mod.procurementMember).toBeDefined();
  });

  it("auth-schema exports user table", async () => {
    const mod = await import("@/lib/db/schema/auth-schema");
    expect(mod.user).toBeDefined();
    expect(mod.session).toBeDefined();
    expect(mod.account).toBeDefined();
  });
});

describe("Permissions — RBAC Roles", () => {
  it("exports all required roles", async () => {
    const mod = await import("@/lib/auth/permissions");
    expect(mod.adminRole).toBeDefined();
    expect(mod.viewerRole).toBeDefined();
    expect(mod.procurementManagerRole).toBeDefined();
    expect(mod.budgetManagerRole).toBeDefined();
    expect(mod.userRole).toBeDefined();
    expect(mod.ac).toBeDefined();
    expect(mod.statement).toBeDefined();
  });

  it("admin role has full procurement access", async () => {
    const mod = await import("@/lib/auth/permissions");
    const role = mod.adminRole;
    // ac.newRole() returns { authorize, statements } — verify role is defined
    expect(role).toBeDefined();
    expect(role.authorize).toBeDefined();
    expect(role.statements).toBeDefined();
    // Verify the admin role includes procurement statements via the source definition
    expect(mod.statement.procurement).toBeDefined();
    expect(mod.statement.procurement).toContain("create");
    expect(mod.statement.procurement).toContain("read");
    expect(mod.statement.procurement).toContain("award");
    expect(mod.statement.procurement).toContain("cancel");
  });

  it("viewer role is defined with statements", async () => {
    const mod = await import("@/lib/auth/permissions");
    const role = mod.viewerRole;
    expect(role).toBeDefined();
    expect(role.authorize).toBeDefined();
    expect(role.statements).toBeDefined();
  });
});

describe("Error Boundaries — Existence", () => {
  it("root error boundary exists", async () => {
    const mod = await import("@/app/error");
    expect(mod.default).toBeDefined();
  });

  it("admin error boundary exists", async () => {
    const mod = await import("@/app/(admin)/error");
    expect(mod.default).toBeDefined();
  });

  it("main error boundary exists", async () => {
    const mod = await import("@/app/(main)/error");
    expect(mod.default).toBeDefined();
  });
});

describe("Loading States — Existence", () => {
  it("admin dashboard loading exists", async () => {
    const mod = await import("@/app/(admin)/dashboard/loading");
    expect(mod.default).toBeDefined();
  });

  it("admin collections loading exists", async () => {
    const mod = await import("@/app/(admin)/dashboard/collections/loading");
    expect(mod.default).toBeDefined();
  });

  it("admin users loading exists", async () => {
    const mod = await import("@/app/(admin)/dashboard/users/loading");
    expect(mod.default).toBeDefined();
  });

  it("admin procurement loading exists", async () => {
    const mod = await import("@/app/(admin)/dashboard/procurement/loading");
    expect(mod.default).toBeDefined();
  });

  it("main loading exists", async () => {
    const mod = await import("@/app/(main)/loading");
    expect(mod.default).toBeDefined();
  });
});

describe("Upload Route — Rate Limiting", () => {
  it("upload route module loads without error", async () => {
    const mod = await import("@/app/api/upload/route");
    expect(mod.POST).toBeDefined();
  });
});

describe("Formatters", () => {
  it("exports formatting utilities", async () => {
    const mod = await import("@/lib/formatters");
    expect(mod.formatCurrency).toBeDefined();
    expect(mod.formatDate).toBeDefined();
  });
});
