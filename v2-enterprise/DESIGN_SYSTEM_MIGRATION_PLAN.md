# Enterprise Design System v1 — ERP Migration Plan & Roadmap

**Phased Adoption Roadmap Across ERP Modules**

---

## 1. Overview & Strategy

The Enterprise Design System v1 foundation is fully established. The `/sales` module serves as the official reference implementation. This document outlines the phased migration plan for remaining ERP modules to achieve 100% visual and structural consistency without breaking business logic, API contracts, or permissions.

---

## 2. Ranked ERP Module Migration Sequence

| Rank | Module / Page | Visual Inconsistency | Migration Complexity | Risk Level | Business Logic Sensitivity | Key Components Required |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Dashboard** (`/dashboard`) | High | Low | Low | Low | StatCard, DataTable, PageHeader |
| **2** | **Inventory** (`/inventory`) | High | Medium | Medium | Medium | DataTable, FilterDrawer, StatusBadge, ImageLightbox |
| **3** | **Customers / CRM** (`/customers`, `/crm`) | Medium | Low | Low | Medium | DataTable, StatCard, CustomerQuickCard |
| **4** | **Installments** (`/installments`) | High | High | High | High | DataTable, StatCard, InstallmentReceiptA5Document |
| **5** | **Sales** (`/sales`) | **Migrated** (Reference) | High | High | High | Completed in DS v1 |
| **6** | **Purchases** (`/purchases`) | Medium | Medium | Medium | High | DataTable, FilterDrawer, StatusBadge |
| **7** | **Cashier** (`/cashier`) | High | High | High | High | PaymentHero, ConfirmDialog, StatCard |
| **8** | **Suppliers** (`/suppliers`) | Medium | Low | Low | Medium | DataTable, StatCard, LedgerPanel |
| **9** | **Accounting** (`/accounting`) | High | High | High | High | DataTable, StatCard, CurrencySplitter |
| **10** | **Journal Entries** (`/journal-entries`) | High | Medium | High | High | DataTable, FormField, StatusBadge |
| **11** | **Reports** (`/reports/*`) | Medium | Low | Low | Medium | StatCard, DataTable, PrintView |
| **12** | **Settings & Admin** (`/settings`, `/users`) | Low | Low | Low | Low | FormField, Switch, ConfirmDialog |

---

## 3. Migration Execution Guidelines per Phase

For each module migration phase:
1. **Audit & Preserve**: Inspect page-specific hooks and API contracts. Do not rename API parameters or modify DTOs.
2. **Replace Ad-Hoc Styling**: Replace hardcoded Tailwind colors (`#000`, `bg-[#00d4aa]`) with Design System semantic tokens (`bg-primary`, `bg-[#F8FAFC]`, `text-[#111827]`).
3. **Adopt Foundation Components**: Refactor page headers to `PageHeader`, KPI grids to `StatCard`, forms to `FormField`/`Input`/`Select`, and tables to `DataTable`.
4. **Verification**: Run `npm run type-check`, `npm run lint`, and `npm run build` after every module refactor.
