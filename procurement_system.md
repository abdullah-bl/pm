# Procurement & Budget System — AI Agent Reference

This document is the single source of truth for an AI agent to understand the data model, create the SQLite schema, perform all CRUD operations, and apply all business calculations correctly.

---

## 1. Overview

This system manages the full lifecycle of government/enterprise procurement — from tendering through contract execution — linked to a structured budget system with annual tracking and inter-budget transfers.

### Core concepts

- A **Vendor** is awarded a **Procurement** (which starts as a tender and becomes a contract on award)
- A **Procurement** generates **Obligations** that reserve funds from a **Budget Year**
- A **Budget** is written once; each year a new **Budget Year** row is created with fresh figures
- **Obligations** are paid via **Payments**
- **Budget Transfers** move cash or credit between budget years
- Every procurement status change is logged in **Procurement Status Log**

---

## 2. SQLite Schema

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Vendors
CREATE TABLE vendor (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  address           TEXT,
  category          TEXT,
  license_number    TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Procurement (tender + contract unified)
CREATE TABLE procurement (
  id                   TEXT PRIMARY KEY,
  reference_number     TEXT NOT NULL UNIQUE,
  tender_number        TEXT,
  name                 TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'draft',
  type                 TEXT NOT NULL,             -- e.g. 'goods', 'services', 'works'
  vendor_id            TEXT REFERENCES vendor(id),
  awarded_amount       REAL,
  start_date           TEXT,
  end_date             TEXT,
  actual_end_date      TEXT,
  cancelled_at         TEXT,
  suspended_at         TEXT,
  cancellation_reason  TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),

  CHECK (status IN ('draft','published','offers_open','evaluation','awarded','contract_active','completed','cancelled','suspended'))
);

-- Procurement status log (full audit trail)
CREATE TABLE procurement_status_log (
  id               TEXT PRIMARY KEY,
  procurement_id   TEXT NOT NULL REFERENCES procurement(id),
  from_status      TEXT,
  to_status        TEXT NOT NULL,
  changed_at       TEXT NOT NULL DEFAULT (datetime('now')),
  changed_by       TEXT NOT NULL,
  reason           TEXT
);

-- Budget (identity — written once)
CREATE TABLE budget (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  reference_number  TEXT NOT NULL UNIQUE,
  economic_code     TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Budget year (annual figures — one row per year per budget)
CREATE TABLE budget_year (
  id               TEXT PRIMARY KEY,
  budget_id        TEXT NOT NULL REFERENCES budget(id),
  year             INTEGER NOT NULL,
  cash             REAL NOT NULL DEFAULT 0,
  credit           REAL NOT NULL DEFAULT 0,
  consumed_cash    REAL NOT NULL DEFAULT 0,
  consumed_credit  REAL NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'open',  -- open | closed | frozen
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (budget_id, year),
  CHECK (cash >= 0),
  CHECK (credit >= 0),
  CHECK (consumed_cash >= 0),
  CHECK (consumed_credit >= 0),
  CHECK (consumed_cash <= cash),
  CHECK (consumed_credit <= credit),
  CHECK (status IN ('open','closed','frozen'))
);

-- Budget transfers (between budget years)
CREATE TABLE budget_transfer (
  id                  TEXT PRIMARY KEY,
  from_budget_year_id TEXT NOT NULL REFERENCES budget_year(id),
  to_budget_year_id   TEXT NOT NULL REFERENCES budget_year(id),
  type                TEXT NOT NULL,   -- 'cash' | 'credit'
  amount              REAL NOT NULL,
  reason              TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  transferred_at      TEXT,
  transferred_by      TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),

  CHECK (from_budget_year_id != to_budget_year_id),
  CHECK (amount > 0),
  CHECK (type IN ('cash','credit')),
  CHECK (status IN ('pending','approved','rejected'))
);

-- Obligations (reserves funds from a budget year)
CREATE TABLE obligation (
  id               TEXT PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  amount           REAL NOT NULL,
  type             TEXT NOT NULL,   -- 'cash' | 'credit'
  status           TEXT NOT NULL DEFAULT 'active',  -- active | cancelled
  procurement_id   TEXT NOT NULL REFERENCES procurement(id),
  budget_year_id   TEXT NOT NULL REFERENCES budget_year(id),
  note             TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),

  CHECK (amount > 0),
  CHECK (type IN ('cash','credit')),
  CHECK (status IN ('active','cancelled'))
);

-- Payments (against obligations)
CREATE TABLE payment (
  id               TEXT PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  amount           REAL NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | paid | rejected
  due_date         TEXT,
  paid_date        TEXT,
  payment_method   TEXT,
  obligation_id    TEXT NOT NULL REFERENCES obligation(id),
  note             TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),

  CHECK (amount > 0),
  CHECK (status IN ('pending','approved','paid','rejected'))
);

-- Indexes for common lookups
CREATE INDEX idx_procurement_status       ON procurement(status);
CREATE INDEX idx_procurement_vendor       ON procurement(vendor_id);
CREATE INDEX idx_budget_year_budget       ON budget_year(budget_id, year);
CREATE INDEX idx_obligation_procurement   ON obligation(procurement_id);
CREATE INDEX idx_obligation_budget_year   ON obligation(budget_year_id);
CREATE INDEX idx_payment_obligation       ON payment(obligation_id);
CREATE INDEX idx_transfer_from            ON budget_transfer(from_budget_year_id);
CREATE INDEX idx_transfer_to              ON budget_transfer(to_budget_year_id);
```

---

## 3. Status Lifecycles

### 3.1 Procurement status flow

```
draft → published → offers_open → evaluation → awarded → contract_active → completed
                                                        ↓
                          cancelled  ←─ (from any stage except draft and completed)
                          suspended  ←─ (from published, offers_open, evaluation, awarded, contract_active)
                          suspended  →  (resume back to previous active status)
```

**Rules:**
- `cancelled` is terminal — no further transitions allowed
- `completed` is terminal — no further transitions allowed
- `suspended` is recoverable — must resume to a valid active status
- `vendor_id` and `awarded_amount` must be set before transitioning to `awarded`
- `start_date` must be set before transitioning to `contract_active`

### 3.2 Obligation status flow

```
active → cancelled
```

**Rules:**
- Cancelling an obligation releases the reserved amount back to the budget year
- An obligation cannot be cancelled if any of its payments have status `paid`

### 3.3 Payment status flow

```
pending → approved → paid
pending → rejected
approved → rejected
```

### 3.4 Budget year status flow

```
open → closed
open → frozen
frozen → open   (unfreeze)
```

**Rules:**
- A `closed` budget year rejects new obligations and transfers
- A `frozen` budget year rejects new obligations but allows read operations
- Transfers can only be approved when both source and destination budget years are `open`

### 3.5 Budget transfer status flow

```
pending → approved
pending → rejected
```

---

## 4. Business Rules & Calculations

### 4.1 Budget year balances

```
remaining_cash   = cash - consumed_cash
remaining_credit = credit - consumed_credit
```

A new obligation must satisfy:
- `obligation.type = 'cash'`   → `remaining_cash >= obligation.amount`
- `obligation.type = 'credit'` → `remaining_credit >= obligation.amount`
- `budget_year.status = 'open'`

### 4.2 Creating an obligation (reserve funds)

```sql
-- Step 1: validate budget year is open and has sufficient balance
SELECT cash, credit, consumed_cash, consumed_credit, status
FROM budget_year WHERE id = :budget_year_id;

-- Step 2: insert obligation
INSERT INTO obligation (id, reference_number, amount, type, status, procurement_id, budget_year_id, note, created_at)
VALUES (:id, :ref, :amount, :type, 'active', :procurement_id, :budget_year_id, :note, datetime('now'));

-- Step 3: update consumed amount based on type
-- If type = 'cash':
UPDATE budget_year SET consumed_cash = consumed_cash + :amount WHERE id = :budget_year_id;
-- If type = 'credit':
UPDATE budget_year SET consumed_credit = consumed_credit + :amount WHERE id = :budget_year_id;
```

### 4.3 Cancelling an obligation (release funds)

```sql
-- Step 1: ensure no paid payments exist
SELECT COUNT(*) FROM payment WHERE obligation_id = :id AND status = 'paid';
-- If count > 0: reject cancellation

-- Step 2: update obligation status
UPDATE obligation SET status = 'cancelled' WHERE id = :id;

-- Step 3: release reserved amount back to budget year
-- If type = 'cash':
UPDATE budget_year SET consumed_cash = consumed_cash - :amount WHERE id = :budget_year_id;
-- If type = 'credit':
UPDATE budget_year SET consumed_credit = consumed_credit - :amount WHERE id = :budget_year_id;
```

### 4.4 Approving a budget transfer

```sql
-- Step 1: validate both budget years are open
SELECT status FROM budget_year WHERE id IN (:from_id, :to_id);
-- Both must be 'open'

-- Step 2: validate source has sufficient balance
-- If type = 'cash':   remaining_cash   >= amount
-- If type = 'credit': remaining_credit >= amount

-- Step 3: update transfer status
UPDATE budget_transfer
SET status = 'approved', transferred_at = datetime('now')
WHERE id = :transfer_id;

-- Step 4: adjust budget year balances
-- If type = 'cash':
UPDATE budget_year SET cash = cash - :amount WHERE id = :from_budget_year_id;
UPDATE budget_year SET cash = cash + :amount WHERE id = :to_budget_year_id;
-- If type = 'credit':
UPDATE budget_year SET credit = credit - :amount WHERE id = :from_budget_year_id;
UPDATE budget_year SET credit = credit + :amount WHERE id = :to_budget_year_id;
```

### 4.5 Advancing procurement status

```sql
-- Always log the transition first
INSERT INTO procurement_status_log (id, procurement_id, from_status, to_status, changed_at, changed_by, reason)
VALUES (:id, :procurement_id, :from_status, :to_status, datetime('now'), :user, :reason);

-- Then update the procurement
UPDATE procurement
SET status = :to_status, updated_at = datetime('now')
WHERE id = :procurement_id;

-- For cancellation: also set cancelled_at and reason
UPDATE procurement
SET status = 'cancelled', cancelled_at = datetime('now'),
    cancellation_reason = :reason, updated_at = datetime('now')
WHERE id = :procurement_id;

-- For suspension: also set suspended_at
UPDATE procurement
SET status = 'suspended', suspended_at = datetime('now'), updated_at = datetime('now')
WHERE id = :procurement_id;
```

---

## 5. CRUD Operations

### 5.1 Vendor

```sql
-- Create
INSERT INTO vendor (id, name, email, phone, address, category, license_number, created_at)
VALUES (:id, :name, :email, :phone, :address, :category, :license_number, datetime('now'));

-- Read one
SELECT * FROM vendor WHERE id = :id;

-- Read all
SELECT * FROM vendor ORDER BY name;

-- Update
UPDATE vendor SET name=:name, email=:email, phone=:phone, address=:address,
  category=:category, license_number=:license_number WHERE id = :id;

-- Delete (only if no procurements linked)
DELETE FROM vendor WHERE id = :id
  AND NOT EXISTS (SELECT 1 FROM procurement WHERE vendor_id = :id);
```

### 5.2 Procurement

```sql
-- Create
INSERT INTO procurement (id, reference_number, tender_number, name, status, type, created_at, updated_at)
VALUES (:id, :ref, :tender_num, :name, 'draft', :type, datetime('now'), datetime('now'));

-- Read one with vendor
SELECT p.*, v.name AS vendor_name
FROM procurement p LEFT JOIN vendor v ON v.id = p.vendor_id
WHERE p.id = :id;

-- Read all by status
SELECT * FROM procurement WHERE status = :status ORDER BY created_at DESC;

-- Update fields (before award)
UPDATE procurement SET name=:name, tender_number=:tender_number, updated_at=datetime('now')
WHERE id = :id AND status IN ('draft','published');

-- Award (set vendor and amount)
UPDATE procurement
SET vendor_id=:vendor_id, awarded_amount=:amount, status='awarded', updated_at=datetime('now')
WHERE id = :id AND status = 'evaluation';

-- Soft check before delete: only draft procurements can be deleted
DELETE FROM procurement WHERE id = :id AND status = 'draft';
```

### 5.3 Budget

```sql
-- Create budget (identity only)
INSERT INTO budget (id, name, reference_number, economic_code, created_at)
VALUES (:id, :name, :ref, :economic_code, datetime('now'));

-- Create budget year
INSERT INTO budget_year (id, budget_id, year, cash, credit, consumed_cash, consumed_credit, status, created_at)
VALUES (:id, :budget_id, :year, :cash, :credit, 0, 0, 'open', datetime('now'));

-- Read budget with all years
SELECT b.*, by.*
FROM budget b
JOIN budget_year by ON by.budget_id = b.id
WHERE b.id = :id
ORDER BY by.year DESC;

-- Read budget year balances
SELECT *,
  (cash - consumed_cash)   AS remaining_cash,
  (credit - consumed_credit) AS remaining_credit
FROM budget_year WHERE id = :id;

-- Update budget identity
UPDATE budget SET name=:name, economic_code=:economic_code WHERE id = :id;

-- Update budget year allocations (only when status = 'open' and no obligations exist)
UPDATE budget_year SET cash=:cash, credit=:credit
WHERE id = :id AND status = 'open'
  AND NOT EXISTS (SELECT 1 FROM obligation WHERE budget_year_id = :id AND status = 'active');

-- Close a budget year
UPDATE budget_year SET status = 'closed' WHERE id = :id;
```

### 5.4 Budget Transfer

```sql
-- Create transfer request
INSERT INTO budget_transfer (id, from_budget_year_id, to_budget_year_id, type, amount, reason, status, created_at)
VALUES (:id, :from_id, :to_id, :type, :amount, :reason, 'pending', datetime('now'));

-- Read pending transfers
SELECT bt.*,
  bf.year AS from_year, bt2.year AS to_year
FROM budget_transfer bt
JOIN budget_year bf ON bf.id = bt.from_budget_year_id
JOIN budget_year bt2 ON bt2.id = bt.to_budget_year_id
WHERE bt.status = 'pending';

-- Approve (see section 4.4 for full logic)
UPDATE budget_transfer SET status='approved', transferred_at=datetime('now'), transferred_by=:user
WHERE id = :id;

-- Reject
UPDATE budget_transfer SET status='rejected' WHERE id = :id;
```

### 5.5 Obligation

```sql
-- Create (see section 4.2 for full logic with balance update)
INSERT INTO obligation (id, reference_number, amount, type, status, procurement_id, budget_year_id, note, created_at)
VALUES (:id, :ref, :amount, :type, 'active', :procurement_id, :budget_year_id, :note, datetime('now'));

-- Read obligations for a procurement
SELECT o.*,
  by.year,
  b.name AS budget_name,
  b.economic_code
FROM obligation o
JOIN budget_year by ON by.id = o.budget_year_id
JOIN budget b ON b.id = by.budget_id
WHERE o.procurement_id = :procurement_id;

-- Read obligation with payment summary
SELECT o.*,
  COALESCE(SUM(CASE WHEN p.status='paid' THEN p.amount ELSE 0 END), 0) AS paid_amount,
  o.amount - COALESCE(SUM(CASE WHEN p.status='paid' THEN p.amount ELSE 0 END), 0) AS remaining_amount
FROM obligation o
LEFT JOIN payment p ON p.obligation_id = o.id
WHERE o.id = :id
GROUP BY o.id;

-- Cancel (see section 4.3 for full logic)
UPDATE obligation SET status = 'cancelled' WHERE id = :id;
```

### 5.6 Payment

```sql
-- Create
INSERT INTO payment (id, reference_number, amount, status, due_date, obligation_id, note, created_at)
VALUES (:id, :ref, :amount, 'pending', :due_date, :obligation_id, :note, datetime('now'));

-- Approve
UPDATE payment SET status = 'approved' WHERE id = :id AND status = 'pending';

-- Mark as paid
UPDATE payment SET status = 'paid', paid_date = datetime('now'), payment_method = :method
WHERE id = :id AND status = 'approved';

-- Reject
UPDATE payment SET status = 'rejected' WHERE id = :id AND status IN ('pending','approved');

-- Read all payments for an obligation
SELECT * FROM payment WHERE obligation_id = :obligation_id ORDER BY due_date;

-- Read overdue payments
SELECT p.*, o.reference_number AS obligation_ref
FROM payment p
JOIN obligation o ON o.id = p.obligation_id
WHERE p.status IN ('pending','approved') AND p.due_date < datetime('now');
```

---

## 6. Useful Reporting Queries

```sql
-- Budget year summary (remaining vs consumed)
SELECT
  b.name,
  b.economic_code,
  by.year,
  by.cash,
  by.credit,
  by.consumed_cash,
  by.consumed_credit,
  (by.cash - by.consumed_cash)     AS remaining_cash,
  (by.credit - by.consumed_credit) AS remaining_credit,
  by.status
FROM budget_year by
JOIN budget b ON b.id = by.budget_id
ORDER BY by.year DESC, b.name;

-- All active procurements with obligation totals
SELECT
  p.reference_number,
  p.name,
  p.status,
  v.name AS vendor,
  p.awarded_amount,
  COALESCE(SUM(o.amount), 0) AS total_obligated
FROM procurement p
LEFT JOIN vendor v ON v.id = p.vendor_id
LEFT JOIN obligation o ON o.procurement_id = p.id AND o.status = 'active'
WHERE p.status NOT IN ('cancelled','completed')
GROUP BY p.id;

-- Payment schedule (upcoming due dates)
SELECT
  pay.reference_number,
  pay.amount,
  pay.due_date,
  pay.status,
  o.reference_number AS obligation_ref,
  p.name AS procurement_name
FROM payment pay
JOIN obligation o ON o.id = pay.obligation_id
JOIN procurement p ON p.id = o.procurement_id
WHERE pay.status IN ('pending','approved')
ORDER BY pay.due_date;

-- Procurement status history
SELECT
  psl.changed_at,
  psl.from_status,
  psl.to_status,
  psl.changed_by,
  psl.reason
FROM procurement_status_log psl
WHERE psl.procurement_id = :id
ORDER BY psl.changed_at;
```

---

## 7. Integrity Rules Summary

| Rule | Where enforced |
|---|---|
| `consumed_cash <= cash` | SQLite CHECK + application |
| `consumed_credit <= credit` | SQLite CHECK + application |
| Obligation type must match budget deduction column | Application logic |
| Cannot cancel obligation with paid payments | Application logic |
| Transfer requires both budget years open | Application logic |
| Transfer reduces source, increases destination | Application logic (atomic transaction) |
| Procurement status transitions are ordered | Application logic |
| Status changes always logged | Application logic |
| Cancelled/completed procurements are terminal | Application logic |
| Budget year allocations locked once obligations exist | Application logic |
| All multi-step operations run in a single transaction | Application logic |

---

## 8. Transaction Pattern

All multi-step operations (create obligation, approve transfer, cancel obligation) must run inside a single SQLite transaction to ensure atomicity:

```sql
BEGIN TRANSACTION;
  -- step 1: validate
  -- step 2: insert/update main record
  -- step 3: update budget_year consumed fields
COMMIT;
-- On any error: ROLLBACK;
```
