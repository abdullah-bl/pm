import { db } from "./db";
import {
  vendor,
  procurement,
  procurementStatusLog,
  budget,
  budgetYear,
  obligation,
  payment,
} from "./db/schema";

export async function seedProcurement() {
  console.log("🌱 Seeding procurement data...");

  // ─── Vendors ────────────────────────────────────────────────────────────
  const vendors = await db.insert(vendor).values([
    { name: "Al-Noor Technologies", email: "info@alnoor.sa", phone: "+966-11-2345678", category: "IT Services", licenseNumber: "IT-2024-001" },
    { name: "Gulf Construction Co.", email: "contact@gulfconst.sa", phone: "+966-11-3456789", category: "Construction", licenseNumber: "CON-2024-015" },
    { name: "Sahara Supplies", email: "sales@sahara.sa", phone: "+966-11-4567890", category: "Office Supplies", licenseNumber: "SUP-2024-032" },
    { name: "Digital Waves LLC", email: "hello@digitalwaves.sa", phone: "+966-11-5678901", category: "Software", licenseNumber: "SW-2024-007" },
    { name: "Greenfield Works", email: "projects@greenfield.sa", phone: "+966-11-6789012", category: "Civil Works", licenseNumber: "CW-2024-022" },
  ]).returning();

  console.log(`  ✓ Created ${vendors.length} vendors`);

  // ─── Budgets ────────────────────────────────────────────────────────────
  const budgets = await db.insert(budget).values([
    { name: "IT Infrastructure Budget", referenceNumber: "BUD-IT-2024", economicCode: "EC-4501" },
    { name: "Facilities Maintenance Budget", referenceNumber: "BUD-FM-2024", economicCode: "EC-4502" },
    { name: "General Procurement Budget", referenceNumber: "BUD-GP-2024", economicCode: "EC-4503" },
  ]).returning();

  console.log(`  ✓ Created ${budgets.length} budgets`);

  // ─── Budget Years ───────────────────────────────────────────────────────
  const budgetYears = await db.insert(budgetYear).values([
    { budgetId: budgets[0].id, year: 2024, cash: 5000000, credit: 2000000 },
    { budgetId: budgets[0].id, year: 2025, cash: 5500000, credit: 2200000 },
    { budgetId: budgets[1].id, year: 2024, cash: 3000000, credit: 1000000 },
    { budgetId: budgets[1].id, year: 2025, cash: 3200000, credit: 1100000 },
    { budgetId: budgets[2].id, year: 2024, cash: 8000000, credit: 3000000 },
    { budgetId: budgets[2].id, year: 2025, cash: 8500000, credit: 3500000 },
  ]).returning();

  console.log(`  ✓ Created ${budgetYears.length} budget years`);

  // ─── Procurements ───────────────────────────────────────────────────────
  const procurements = await db.insert(procurement).values([
    {
      referenceNumber: "PROC-2024-001",
      tenderNumber: "TND-001",
      name: "Data Center Network Upgrade",
      status: "draft",
      type: "goods",
    },
    {
      referenceNumber: "PROC-2024-002",
      tenderNumber: "TND-002",
      name: "Annual IT Support Services",
      status: "published",
      type: "services",
    },
    {
      referenceNumber: "PROC-2024-003",
      tenderNumber: "TND-003",
      name: "Office Building Renovation",
      status: "evaluation",
      type: "works",
      vendorId: vendors[1].id,
    },
    {
      referenceNumber: "PROC-2024-004",
      tenderNumber: "TND-004",
      name: "ERP System Implementation",
      status: "contract_active",
      type: "services",
      vendorId: vendors[3].id,
      awardedAmount: 1500000,
      startDate: "2024-03-01",
      endDate: "2025-02-28",
    },
    {
      referenceNumber: "PROC-2024-005",
      tenderNumber: "TND-005",
      name: "Office Furniture Supply",
      status: "awarded",
      type: "goods",
      vendorId: vendors[2].id,
      awardedAmount: 350000,
    },
  ]).returning();

  console.log(`  ✓ Created ${procurements.length} procurements`);

  // ─── Obligations ────────────────────────────────────────────────────────
  const obligations = await db.insert(obligation).values([
    {
      referenceNumber: "OBL-2024-001",
      amount: 500000,
      type: "cash",
      status: "active",
      procurementId: procurements[3].id,
      budgetYearId: budgetYears[0].id,
      note: "Phase 1 - ERP Implementation",
    },
    {
      referenceNumber: "OBL-2024-002",
      amount: 350000,
      type: "cash",
      status: "active",
      procurementId: procurements[3].id,
      budgetYearId: budgetYears[0].id,
      note: "Phase 2 - ERP Modules",
    },
    {
      referenceNumber: "OBL-2024-003",
      amount: 150000,
      type: "credit",
      status: "active",
      procurementId: procurements[3].id,
      budgetYearId: budgetYears[0].id,
      note: "ERP Training & Support",
    },
  ]).returning();

  // Update consumed amounts for the obligations
  await db.update(budgetYear).set({
    consumedCash: 850000,  // 500k + 350k
    consumedCredit: 150000,
  }).where(eq(budgetYear.id, budgetYears[0].id));

  console.log(`  ✓ Created ${obligations.length} obligations`);

  // ─── Payments ───────────────────────────────────────────────────────────
  const payments = await db.insert(payment).values([
    {
      referenceNumber: "PAY-2024-001",
      amount: 250000,
      status: "paid",
      dueDate: "2024-04-15",
      paidDate: "2024-04-10",
      paymentMethod: "bank_transfer",
      obligationId: obligations[0].id,
      note: "Phase 1 milestone 1",
    },
    {
      referenceNumber: "PAY-2024-002",
      amount: 250000,
      status: "approved",
      dueDate: "2024-08-15",
      obligationId: obligations[0].id,
      note: "Phase 1 milestone 2",
    },
    {
      referenceNumber: "PAY-2024-003",
      amount: 175000,
      status: "pending",
      dueDate: "2024-09-01",
      obligationId: obligations[1].id,
      note: "Phase 2 milestone 1",
    },
    {
      referenceNumber: "PAY-2024-004",
      amount: 75000,
      status: "pending",
      dueDate: "2024-10-01",
      obligationId: obligations[2].id,
      note: "Training batch 1",
    },
  ]).returning();

  console.log(`  ✓ Created ${payments.length} payments`);
  console.log("✅ Procurement seed complete!");
}

// Need to import eq for the update
import { eq } from "drizzle-orm";
