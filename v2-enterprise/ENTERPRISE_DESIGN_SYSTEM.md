# Enterprise Design System v1 — Core Foundation & Hardening Specification

**Car Showroom ERP — Production UI/UX Architecture & Component Standard**

---

## 1. Design Principles & Production Protection

Enterprise Design System v1 establishes a hardened, unified, scalable visual foundation for the Car Showroom ERP codebase (inspired by **SAP Fiori**, **Microsoft Dynamics 365**, **Oracle Fusion Cloud**, **Stripe Dashboard**, **Linear**, and **Atlassian Admin**).

### Route Protection Policy (`/design-system`)
- The internal component showcase at `src/app/design-system/page.tsx` is strictly protected against public production exposure.
- In production builds (`process.env.NODE_ENV === 'production'`), it triggers `notFound()`, returning a standard Next.js 404 page.
- It is excluded from all public navigation menus and exists solely for development component validation.

---

## 2. Token Source of Truth

- **Runtime Visual Source of Truth**: `src/styles/tokens.css` defines canonical CSS variables (`--ds-background`, `--ds-surface`, `--ds-border`, `--ds-text-primary`, `--ds-primary`, `--ds-ring`, `--ds-focus-ring`).
- **TypeScript Metadata Source**: `src/lib/design-system/tokens.ts` exports references to these CSS variables (`var(--ds-...)`) and non-CSS constants (spacing, motion ms).
- **Zero Raw Hex Duplication**: Components use semantic CSS variables instead of hardcoded hex values (`#0F766E`, `#111827`, `#E5E7EB`).

---

## 3. Canonical Data Table Decision

- **Canonical Enterprise Data Table**: `src/components/enterprise/data-table/DataTable.tsx`
  - Features: Server/client pagination, current-page sorting, density toggle (compact 44px vs comfortable 56px), sticky headers, RTL resizer handle, column manager, export, print, and local preferences persistence (`car_showroom_v2_ds_config_v1`).
- **Legacy Compatibility Layer**: `src/components/shared/AdvancedTable.tsx`
  - Marked with `@deprecated` JSDoc annotation. Preserved strictly for backward compatibility with unmigrated legacy pages.

---

## 4. Typography Policy

- **Primary Arabic UI Font**: `Tajawal` (`var(--font-tajawal)`), loaded via `next/font/google` in `layout.jsx` (weights `[300, 400, 500, 700, 800, 900]`).
- **Secondary Receipt / Document Font**: `IBM Plex Sans Arabic` (`var(--font-receipt)`), loaded for printable receipts and contract documents.
- **Numeric & Financial Font**: `Inter` (`var(--font-inter)`), loaded for `font-numeric` tabular figures.
- **Code & Invoice Font**: `JetBrains Mono` (`var(--font-mono)`), loaded for `font-mono` invoice numbers and VIN codes.
- **Print Fallback**: `Arial, sans-serif`.

---

## 5. Domain-Specific Status Mappers

Domain statuses are handled by dedicated mappers in `src/lib/design-system/status-maps.ts`:
- `salesStatusMap`: `Active` (success), `Cancelled` (danger), `Draft` (neutral)
- `paymentStatusMap`: `Paid` (success), `Partial` (warning), `Pending` (warning), `Overdue` (danger)
- `inventoryStatusMap`: `Available` (success), `Reserved` (info), `Sold` (neutral), `Maintenance` (warning)
- `installmentStatusMap`: `Active` (success), `Completed` (info), `Defaulted` (danger), `GracePeriod` (warning)
- `receiptStatusMap`: `Posted` (success), `Unposted` (warning), `Voided` (danger)

Unknown statuses resolve to `{ variant: 'neutral', label: status, dot: false }`, preserving readable text without crashing.

---

## 6. Client Preferences Policy

- **Canonical Key**: `car_showroom_v2_ds_config_v1`
- **Legacy Fallback**: `car_showroom_v2_sales_table_config_v1`
- Storage includes safe JSON parsing, fallback defaults, SSR checks, and **NEVER** stores PII, financial amounts, VINs, or tokens.

---

## 7. Scoped Print System

Print styles in `tokens.css` use explicit semantic print utility classes (`.ds-print-hidden`, `.ds-print-only`, `.ds-print-table`). Generic tag hiding is avoided to preserve specialized printable documents (e.g. A5 installment receipts).

---

## 8. Verification & Automation

- **Automated Test Suite**: `node scripts/test-design-system.mjs` (runnable via `npm run test:ds`).
- **Full Type Check**: `npm run type-check` (PASSED 0 errors).
- **ESLint Validation**: `npm run lint` (PASSED 0 errors, 279 baseline warnings).
- **Next.js Production Build**: `npm run build` (PASSED 74/74 routes compiled successfully).

---

## 9. Reference Implementations

1. **`/sales`**: Reference Implementation #1 (Sales Management & POS Workspace)
2. **`/` (Dashboard)**: Reference Implementation #2 (Executive Overview Command Center)
3. **`/inventory`**: Reference Implementation #3 (Automotive Inventory & Spec Management)
4. **`/customers`**: Reference Implementation #4 (Customers / CRM Workspace)
5. **`/chart-of-accounts`**: Reference Implementation #5 (Chart of Accounts & Tree Grid Workspace)

