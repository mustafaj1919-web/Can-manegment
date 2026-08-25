# Installment Payment Workflow Audit

**System Name**: Al-Asdiqaa Enterprise Automotive Platform (v2-enterprise)  
**Date**: July 23, 2026  
**Auditor**: Senior Enterprise UX Architect & Full-Stack Engineer  

---

## 1. Existing Architecture & Endpoint Audit

### 1.1 Solution Layering & Libraries
- **Backend Stack**: ASP.NET Core 8, EF Core 8, MediatR CQRS, FluentValidation, PostgreSQL.
- **Frontend Stack**: Next.js 16 (App Router), React 19, React Query, Tailwind CSS, Lucide icons.
- **Authentication & Multi-Tenancy**: JWT Bearer auth (`ICurrentUserService`), multi-tenant branch isolation (`BranchId`).

### 1.2 Existing Endpoint Behavior

#### `POST /Installments/schedules/{scheduleId}/payment`
- **Request Body**:
  ```json
  {
    "amount": 1600000,
    "paymentMethod": "Cash",
    "notes": "سداد القسط الشهر الخامس"
  }
  ```
- **Handler (`PayInstallmentCommandHandler`) Execution Steps**:
  1. Validates `scheduleId` and `BranchId` match authenticated user context.
  2. Verifies installment status is not already `"Paid"`.
  3. Calculates remaining installment amount and handles excess distribution to subsequent unpaid schedules.
  4. Updates `SalesContract.RemainingBalance` and `InstallmentPlan.Status` (`"Completed"` if all paid).
  5. Generates financial `Payment` record with reference `REC-YYYYMMDD-XXXXX`.
  6. Generates balanced `JournalEntry` with reference `JV-YYYYMMDD-XXXXX` and sets `IsPosted = true`.
  7. Commits single database transaction and returns `paymentId` (`Guid`).

---

## 2. Identified Architecture Gaps

1. **Idempotency & Retry Protection**:
   - *Current State*: Duplicate submission prevention relies on in-memory button disabling and `Status != "Paid"` check.
   - *Required Capability*: Database-backed `IdempotencyRecord` table storing client-generated `IdempotencyKey` (UUID), `RequestHash`, and `ProcessingStatus`.
2. **Concurrency Locking**:
   - *Current State*: Concurrent updates rely on basic `DbContext` save without explicit `RowVersion` token comparison.
   - *Required Capability*: Optimistic concurrency token check on `SalesContract` and `Installment` entities before transaction commit.
3. **Receiving Account Selection**:
   - *Current State*: Hardcoded default `"111001"` (الصندوق) or `"112001"` (البنك).
   - *Required Capability*: Dynamic receiving account query (`GET /api/Accounts/eligible-receiving`) filtering by branch and payment method (`Cash` ➔ Cashbox accounts, `BankTransfer` ➔ Bank accounts).
4. **Document Control & Archive Persistence**:
   - *Current State*: Receipts are generated dynamically on-screen (`InstallmentReceiptA5Document`) without persistent document control status in the database.
   - *Required Capability*: `ReceiptArchiveRecord` entity storing `PaymentId`, `ReceiptId`, `BranchId`, `ArchiveStatus` (`Pending`, `Uploaded`, `ManuallyConfirmed`), `ConfirmedByUserId`, and `ConfirmedAt`.

---

## 3. Migration & Impact Summary

- **Database Migrations Required in Phase 2**:
  - `IdempotencyRecords` table.
  - `ReceiptArchiveRecords` table.
  - `ConcurrencyToken` string property on `SalesContract` and `Installment`.
- **Zero Breaking Changes**: Existing APIs remain 100% backward compatible for other cashier modals.
