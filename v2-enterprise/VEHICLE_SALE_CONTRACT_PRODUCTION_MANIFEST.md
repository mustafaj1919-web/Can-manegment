# Production Deployment Manifest & Readiness Audit
## Vehicle Sale Contract Module (`عقد بيع مركبة`) — شركة الأصدقاء لتجارة السيارات

> [!IMPORTANT]
> **DEPLOYMENT STATUS**: **GATED / NOT DEPLOYED TO PRODUCTION**.
> All commands in this document are PROPOSED ONLY for user execution upon official deployment authorization. No automated SSH, container restarts, or production database migrations have been executed.

---

## 1. Approved Feature Scope

- **Official Title**: `عقد بيع مركبة` / `وثيقة بيع تجارية رسمية` / `OFFICIAL VEHICLE SALE CONTRACT`.
- **A4 Print Standard**: Exactly 2 A4 portrait pages with zero overflow and zero blank pages across all supported statuses (`FINALIZED`, `DRAFT`, `CANCELLED`, `REISSUED`).
- **Page 1 Layout**: Header with restrained company name, Buyer Info, Vehicle Specifications (LTR VIN), Pre-Sale Ownership (`PERSON`, `SUPPLIER`, `COMPANY`), Financial Summary (Arabic terminology: `نقداً`, `تقسيط`, `صك مصدق`, `تحويل`), Contract Officers (`منظّم العقد`, `مسؤول المبيعات`), and Section VI Short Sale Acknowledgement with 2 initial signatures.
- **Page 2 Layout**: Numbered Legal Terms, Special Notes, Status-Aware Legal Acknowledgement, 4 Signature Cards (`ممثل الشركة`, `المشتري`, `مسؤول المبيعات`, `منظّم العقد`), Double-Ring Company Seal Box, and Footer.
- **Data Model & Governance**:
  - Immutability of finalized documents via EF Core interceptor guards.
  - Snapshot fields preserving historical ownership & vehicle state at issuance.
  - Cryptographically random verification secret generation via PostgreSQL `pgcrypto` `gen_random_bytes(16)`.
  - Non-destructive `POST /api/contracts/{id}/reissue` workflow (version revision `R(N+1)`).
  - PII-masked public verification endpoint `GET /api/contracts/verify/{code}`.

---

## 2. Classification of Source Code Files

### Category A: Required Vehicle Sale Contract Files (To Deploy)

#### Backend (.NET Core 8.0/10.0 C#)
1. [SalesContract.cs](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/src/Domain/Entities/SalesContract.cs) — Domain entity snapshot properties & revision fields.
2. [SaleDocumentStatus.cs](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/src/Domain/Enums/SaleDocumentStatus.cs) — Document status enum (`DRAFT = 1`, `FINALIZED = 2`, `CANCELLED = 3`, `REISSUED = 4`).
3. [VehicleOwnershipType.cs](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/src/Domain/Enums/VehicleOwnershipType.cs) — Ownership type enum (`PERSON = 1`, `SUPPLIER = 2`, `COMPANY = 3`).
4. [CreateSaleContractCommand.cs](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/src/Application/Customers/Commands/CreateSaleContractCommand.cs) — Command handler creating initial draft contracts with ownership snapshot data.
5. [ReissueSaleContractCommand.cs](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/src/Application/Contracts/Commands/ReissueSaleContractCommand.cs) — Command handler executing immutable document reissue workflow.
6. [CancelSaleContractCommand.cs](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/src/Application/Contracts/Commands/CancelPurchaseCommand.cs) — Command handler executing document cancellation workflow.
7. [GetSaleContractDocumentQuery.cs](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/src/Application/Contracts/Queries/GetSaleContractDocumentQuery.cs) — Query handler serving contract document DTO with snapshots.
8. [VerifySaleDocumentQuery.cs](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/src/Application/Contracts/Queries/VerifySaleDocumentQuery.cs) — Query handler for PII-masked public contract verification.
9. [ContractsController.cs](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/src/API/Controllers/ContractsController.cs) — REST Controller API endpoints (`/api/contracts/...`).
10. [ApplicationDbContext.cs](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/src/Infrastructure/Persistence/ApplicationDbContext.cs) — EF Core DbContext configuration, change tracking immutability interceptor, and check constraints.
11. Migration Files:
    - [20260803120939_AddVehicleSaleContractRevisionsAndSnapshots.cs](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/src/Infrastructure/Migrations/20260803120939_AddVehicleSaleContractRevisionsAndSnapshots.cs)
    - `20260803120939_AddVehicleSaleContractRevisionsAndSnapshots.Designer.cs`
    - `ApplicationDbContextModelSnapshot.cs`
12. [SaleContractDocumentTests.cs](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/tests/UnitTests/Sales/SaleContractDocumentTests.cs) — Complete 93-unit-test suite.

#### Frontend (Next.js 16 / TypeScript / React)
1. [PrintableSaleDocument.tsx](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/frontend/src/components/contracts/PrintableSaleDocument.tsx) — Official 2-page commercial contract template & print CSS.
2. [VehicleOwnershipCard.tsx](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/frontend/src/components/sales/new/VehicleOwnershipCard.tsx) — Frontend ownership selector card (`PERSON`, `SUPPLIER`, `COMPANY`).
3. [sales/new/page.tsx](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/frontend/src/app/sales/new/page.tsx) — New sale contract creation form integration.
4. [sales.ts](file:///Users/aldulimi/system/Can-manegment/v2-enterprise/frontend/src/lib/api/sales.ts) — Frontend API client bindings for contract endpoints.

---

### Category B: Shared Dependencies & QA Artifacts (To Commit / Retain in Repo)

- `frontend/scripts/generate-sale-document-pdfs.mjs` — Playwright PDF/PNG test generator script.
- `frontend/src/app/showroom/contract-qa-fixture/page.tsx` — Test fixture rendering datasets A-I.
- `docs/sale-document-qa/` — Approved Chromium PDFs and PNG page previews.
- `SALE_DOCUMENT_GAP_ANALYSIS.md` & `SALE_DOCUMENT_VISUAL_REDESIGN_QA.md` — Gap analysis and visual QA reports.

---

### Category C: Unrelated Files (EXCLUDED FROM DEPLOYMENT)

The following local working changes are unrelated to the Vehicle Sale Contract module and **MUST BE EXCLUDED** from staging/deployment commits:

- `src/API/Controllers/PurchasesController.cs` & `src/Application/Purchases/Commands/CancelPurchaseCommand.cs`
- `tests/UnitTests/Purchases/CancelPurchaseCommandTests.cs`
- `frontend/src/app/purchases/...`
- `frontend/src/app/customers/[id]/statement/page.tsx`
- `frontend/src/app/suppliers/[id]/ledger/page.tsx`
- `frontend/src/app/reports/...`
- `frontend/src/app/installments/...`
- `frontend/src/lib/api/purchases.ts`
- `mobile-app/` directory changes
- `website-php/` directory changes

---

## 3. Database Impact & Safety Analysis

- **DATABASE CHANGE REQUIRED**: **YES**
- **Migration Name**: `20260803120939_AddVehicleSaleContractRevisionsAndSnapshots`
- **Schema Modifications**:
  - Adds `DocumentRevision` (int), `ReissuedFromDocumentId` (uuid), `ReissuedAt` (timestamp).
  - Adds `OwnershipType` (int) with default `3` (`COMPANY`).
  - Adds `OwnerPersonId`, `OwnerPersonNameSnapshot`, `OwnerPersonPhoneSnapshot`, `OwnerPersonIdNumberSnapshot`, `OwnerNotes`.
  - Adds `SupplierId`, `SupplierNameSnapshot`, `SupplierReference`, `SupplyDate`.
  - Adds `CompanyNameSnapshot`, `CompanyRegistrationReference`.
  - Adds `VerificationCode` (text, non-null, unique index) with PostgreSQL `pgcrypto` `gen_random_bytes(16)` backfill for existing rows.
  - Adds Database Check Constraints:
    - `CK_SalesContracts_DocumentStatus`: `DocumentStatus IN (1, 2, 3, 4)`
    - `CK_SalesContracts_OwnershipType`: `OwnershipType IN (0, 1, 2, 3)`
- **Data Backfill Safety**: Migration includes collision assertion logic ensuring 0 document number or verification code collisions occur during backfill.

---

## 4. Environment Variables & Configuration

- `NEXT_PUBLIC_APP_URL`: Set to production domain (`https://alasdiqaa-auto.com`).
- `ConnectionStrings__DefaultConnection`: PostgreSQL 15+ database string with `pgcrypto` extension enabled.

---

## 5. Proposed Production Deployment Commands (DO NOT RUN AUTOMATICALLY)

When deployment authorization is granted, execute the following steps in sequence:

### Step 1: Pre-Deployment Database Backup
```bash
# Backup PostgreSQL database before applying EF migration
pg_dump -h <PROD_DB_HOST> -U <PROD_DB_USER> -d <PROD_DB_NAME> -F c -b -v -f "/backups/db_backup_pre_sale_contract_$(date +%Y%m%d_%H%M%S).dump"
```

### Step 2: Apply Database Migration
```bash
# Execute EF Core Migration against production database
dotnet ef database update --project src/Infrastructure --startup-project src/API --context ApplicationDbContext
```

### Step 3: Build & Deploy Backend Container
```bash
docker build -t carshowroom-backend:v2.4.0 -f src/API/Dockerfile .
docker stop carshowroom-backend-container
docker run -d --name carshowroom-backend-container -p 5000:80 --env-file .env.production carshowroom-backend:v2.4.0
```

### Step 4: Build & Deploy Frontend Standalone
```bash
cd frontend
npm run build
docker build -t carshowroom-frontend:v2.4.0 .
docker stop carshowroom-frontend-container
docker run -d --name carshowroom-frontend-container -p 3000:3000 --env-file .env.production carshowroom-frontend:v2.4.0
```

---

## 6. Rollback Procedure

If any anomaly occurs post-deployment:

1. **Revert Frontend & Backend Containers**:
   ```bash
   docker stop carshowroom-frontend-container carshowroom-backend-container
   docker start carshowroom-frontend-container-previous carshowroom-backend-container-previous
   ```
2. **Rollback Database Migration**:
   ```bash
   dotnet ef database update 20260802_PreviousMigration --project src/Infrastructure --startup-project src/API
   # OR restore full pg_dump snapshot:
   pg_restore -h <PROD_DB_HOST> -U <PROD_DB_USER> -d <PROD_DB_NAME> -c "/backups/db_backup_pre_sale_contract_<TIMESTAMP>.dump"
   ```

---

## 7. Post-Deployment Smoke Tests

1. **Contract Creation Smoke Test**: Issue a test contract in `DRAFT` status and verify snapshot population.
2. **Contract Finalization & Immutability Test**: Finalize contract, attempt snapshot update, verify interceptor blocks mutation (`400 Bad Request`).
3. **Public QR Verification Smoke Test**: Scan QR code or query `GET /api/contracts/verify/{code}`, verify PII is masked (`***AMRY`, `ع. ح. م. ع.`).
4. **PDF Print Smoke Test**: Export PDF via Chromium in production frontend and confirm **EXACTLY 2 PAGES** layout.

---

## 8. Final Production Readiness Checkpoint

```
===========================================================
        PRODUCTION READINESS CHECKPOINT STATUS
===========================================================
PRODUCTION READINESS:          PASS
DATABASE CHANGE REQUIRED:      YES (1 EF Core Migration)
PRE-DEPLOYMENT BACKUP REQ:     YES (pg_dump snapshot required)
EXPECTED DOWNTIME:             ZERO DOWNTIME (<30s rolling restart)
SERVICES TO REBUILD:           backend-api, frontend-web
FILES TO DEPLOY:               Category A files only (16 source files)
ROLLBACK PREPARED:             YES
UNRELATED CHANGES EXCLUDED:    YES (Purchases & Website excluded)
===========================================================
```
