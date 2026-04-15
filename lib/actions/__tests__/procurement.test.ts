import { describe, it, expect, vi } from "vitest";

// ─── Mock dependencies ──────────────────────────────────────────────────────
vi.mock("@/lib/db", () => {
  const chain = {
    where: vi.fn(() => Promise.resolve([])),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => Promise.resolve([])),
  };
  return {
    db: {
      select: vi.fn(() => ({ from: vi.fn(() => chain) })),
      insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: "mock-id" }])) })) })),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([])) })) })),
      delete: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([])) })),
    },
  };
});

vi.mock("@/lib/db/schema/procurement-schema", () => ({
  vendor: { id: "id", name: "name" },
  procurement: { id: "id", name: "name" },
  procurementStatusLog: { id: "id" },
  budget: { id: "id" },
  budgetYear: { id: "id" },
  budgetTransfer: { id: "id" },
  obligation: { id: "id" },
  payment: { id: "id" },
  procurementMember: { id: "id" },
}));

vi.mock("@/lib/db/schema", () => ({
  user: { id: "id", name: "name" },
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve({ user: { id: "admin-id", role: "admin" }, session: { id: "sess" } })),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock("dotenv/config", () => ({}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Procurement Actions — Export Coverage", () => {
  const getExports = async () => {
    const mod = await import("@/lib/actions/procurement");
    return Object.keys(mod).filter(
      (k) => typeof (mod as any)[k]?.unsafeAction === "function" || typeof (mod as any)[k] === "function"
    );
  };

  it("exports all vendor CRUD actions", async () => {
    const exports = await getExports();
    ["createVendor", "updateVendor", "deleteVendor", "listVendors", "getVendor"].forEach((name) => {
      expect(exports, `Missing: ${name}`).toContain(name);
    });
  });

  it("exports procurement lifecycle actions", async () => {
    const exports = await getExports();
    [
      "createProcurement", "updateProcurement", "listProcurements", "getProcurement",
      "advanceProcurementStatus", "awardProcurement", "cancelProcurement", "suspendProcurement",
    ].forEach((name) => {
      expect(exports, `Missing: ${name}`).toContain(name);
    });
  });

  it("exports budget management actions", async () => {
    const exports = await getExports();
    [
      "createBudget", "updateBudget", "listBudgets", "getBudgetWithYears",
      "createBudgetYear", "updateBudgetYearAllocations",
      "closeBudgetYear", "freezeBudgetYear", "unfreezeBudgetYear",
      "createBudgetTransfer", "approveBudgetTransfer", "rejectBudgetTransfer",
    ].forEach((name) => {
      expect(exports, `Missing: ${name}`).toContain(name);
    });
  });

  it("exports obligation and payment actions", async () => {
    const exports = await getExports();
    [
      "createObligation", "cancelObligation", "listObligationsByProcurement", "getObligationWithPayments",
      "createPayment", "approvePayment", "markPaymentPaid", "rejectPayment",
    ].forEach((name) => {
      expect(exports, `Missing: ${name}`).toContain(name);
    });
  });

  it("exports access control actions", async () => {
    const exports = await getExports();
    ["grantProcurementAccess", "revokeProcurementAccess", "listProcurementMembers"].forEach((name) => {
      expect(exports, `Missing: ${name}`).toContain(name);
    });
  });

  it("has 40+ total actions", async () => {
    const exports = await getExports();
    expect(exports.length).toBeGreaterThanOrEqual(40);
  });
});
