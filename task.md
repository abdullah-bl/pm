# PM App — Task Tracker

## Phase 1: Access Control System

### 1.1 Better Auth Access Control Setup
- [x] Create `lib/auth/permissions.ts` with access control statements
- [x] Define resources: `procurement`, `budget`, `obligation`, `payment`, `vendor`
- [x] Define actions per resource: `read`, `write`, `create`, `delete`, `approve`, etc.
- [x] Create roles: `admin`, `procurement_manager`, `budget_manager`, `viewer`, `user`
- [x] Update `lib/auth/auth.ts` to pass `ac` and `roles` to admin plugin
- [x] Update `lib/auth/auth-client.ts` to pass `ac` and `roles` to adminClient

### 1.2 Admin User Management — Access Control UI
- [x] Role selector with 5 roles (admin, procurement_manager, budget_manager, viewer, user)
- [x] "Set Role" button using `authClient.admin.setRole()`
- [x] Role badge with color coding per user
- [x] Role filter in user listing
- [ ] Resource-level permission checkboxes (procurement read/write, budget read/write, etc.) — future enhancement

## Phase 2: Page Overview Components

### 2.1 Reusable Overview Component
- [x] Create `components/overview-cards.tsx` — reusable stat cards component
- [x] Support grid layout (2, 3, or 4 columns)

### 2.2 Procurements Page Overview
- [x] Overview section at top of procurements page
- [x] Shows: Total procurements, Active, Awarded amount, Completed

### 2.3 Payments Page Overview
- [x] Overview section at top of payments page
- [x] Shows: Total payments, Pending amount, Paid amount, Overdue count

### 2.4 Budgets Page Overview
- [x] Overview section at top of budgets page
- [x] Shows: Total budgets, Allocated, Consumed, Remaining

### 2.5 Obligations Page Overview
- [x] Overview section at top of obligations page
- [x] Shows: Total obligations, Active, Paid, Remaining

## Phase 3: Yearly Procurement Overview

### 3.1 Yearly Overview Data
- [x] Create `getProcurementYearlyOverview` server action
- [x] Aggregate: Total budget, consumed, reserved, remaining
- [x] Filter by year parameter

### 3.2 Yearly Overview UI
- [x] Year selector dropdown on procurements page
- [x] Overview cards: Total Budget, Consumed, Reserved, Cash Remaining
- [ ] Progress bars for consumed vs allocated — future enhancement

## Phase 4: Reusable Components

### 4.1 Created
- [x] `components/page-header.tsx` — consistent page headers
- [x] `components/status-badge.tsx` — reusable status badge with color map
- [x] `components/overview-cards.tsx` — reusable overview stat cards

### 4.2 Refactor Existing Pages
- [ ] Refactor existing pages to use PageHeader and StatusBadge — future cleanup

---

## Build Status
- ✅ Build passes cleanly (2026-04-13 20:17)

## Bugs / Issues
- None reported

## Completed (2026-04-13)
- Access control with 5 custom roles
- Overview cards on all 4 procurement pages
- Yearly procurement overview with year selector
- Reusable components (PageHeader, StatusBadge, OverviewCards)
- User management with role assignment UI
