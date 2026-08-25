# V2 Frontend — UI Dependency Audit

**Date:** 2026-06-11  
**Scope:** `D:\System\car_showroom_management\v2-enterprise\frontend`

---

## Design Skills Applied (per CLAUDE.md authority ranking)

| Skill | Authority | Domain |
|---|---|---|
| **Impeccable** | 70% | Layout architecture, dashboard structure, surface hierarchy, UX flows, enterprise SaaS standards |
| **Taste Skill** | 25% | Typography, color balance, spacing rhythm, card aesthetics, table polish |
| **Awesome Claude Design** | 5% | Brand reference (Stripe, Linear, Odoo) |

### Design Read (Taste Skill § 0.B)
> *"Enterprise Arabic RTL ERP for internal business operators. Stripe-level clarity, Linear-level navigation precision, light-first with a red brand accent. Target: data-dense but visually calm."*

### Dial Settings
- `DESIGN_VARIANCE: 5` — Professional, consistent grid; not creative-portfolio
- `MOTION_INTENSITY: 4` — Purposeful only: stagger on lists, counter animation, page transitions
- `VISUAL_DENSITY: 7` — ERP = data-first; compact tables, multi-column forms

---

## Installed Package Inventory

| Package | Status | Notes |
|---|---|---|
| `next` 14 App Router | ✅ Active | All 60 pages |
| `tailwindcss` v3 | ✅ Active | CSS variable theming, RTL utilities |
| `tailwindcss-animate` | ✅ Active | `animate-in/out` on dropdowns |
| `framer-motion` | ✅ Active | Page transitions, KPI stagger, card animation |
| `lucide-react` | ✅ Active | Icons throughout |
| `@radix-ui/*` | ✅ Active | dialog, dropdown, select, popover, tooltip, tabs |
| `shadcn/ui` components | ✅ Active | button, badge, input, skeleton, pagination, etc. |
| `recharts` | ✅ Active | `FinancialChartWidget` uses BarChart — **but NOT on dashboard** |
| `@tanstack/react-query` | ✅ Active | All data fetching |
| `zustand` | ✅ Active | auth-store, branch-store |
| `sonner` | ✅ Active | Toast notifications |
| `cmdk` | ✅ Active | `CommandPalette.tsx` |

### Packages NOT to install
- `@tanstack/react-table` — AdvancedTable already covers the need
- `next-themes` — CSS variable + localStorage system works fine
- Any additional animation library

---

## Current State Audit

### ✅ Already Solid
- Light/dark theme system with CSS variables; default light
- TopNav fully rewritten; semantic colors; desktop dropdown nav
- KpiCards: animated number counters + SVG sparklines + framer stagger
- FinancialChartWidget: full Recharts BarChart with tooltips — built but **not on dashboard**
- CommandPalette: cmdk-powered, Ctrl+K, multi-type search results
- AdvancedTable: column toggle, resize handles, row selection, XLSX export, print
- GlobalSearch, NotificationCenter, BranchSelector, UserMenu — all light-mode fixed
- 60 pages with complete routing
- 23 dashboard widgets — all purpose-built

### ⚠️ Why It Still Looks Basic

1. **Dashboard underutilizes its own widgets** — `FinancialChartWidget` is built and real-data-driven but never added to the page
2. **AdvancedTable header is weak** — `bg-secondary/35` is too subtle; col headers at 12px with no uppercase; row hover barely visible
3. **PageHeader is understated** — 15px title, gray icon well, no strong brand moment at page top
4. **FilterBar active state is invisible** — no pill chips for active filters; reset button is tiny ghost
5. **Sidebar** — has residual `text-slate-*` colors that survived bulk replacement
6. **Forms** — `CarForm`, `CustomerForm` flat field layout with no section grouping; dark bg leak on inputs
7. **Reports/accounting pages** — 20+ remaining dark hardcoded colors

---

## Execution Plan

### Phase A — Dashboard Completion (Now) ✦ HIGH IMPACT
**Files:** `app/page.jsx`  
Add `FinancialChartWidget` between KPI row and main grid. Expand desktop grid to show 3 cols on 2xl.  
**Visible impact:** Dashboard goes from 4 widgets to 5; real Recharts bar chart appears.

### Phase B — Table & Header System Upgrade ✦ HIGH IMPACT
**Files:** `components/shared/AdvancedTable.tsx`, `components/shared/PageHeader.tsx`, `components/shared/FilterBar.tsx`  
- AdvancedTable: stronger thead (`bg-muted/60`, uppercase 10px labels, left border accent on hover row, subtle stripe on even rows)
- PageHeader: larger title (18px bold), colored icon well with primary tint, breadcrumb trail
- FilterBar: active filter pill chips, count badge

### Phase C — Sidebar Premium ✦ MEDIUM IMPACT
**Files:** `components/layout/Sidebar.tsx`  
Fix remaining slate colors; add section labels; improve active item left-border indicator

### Phase D — Forms Redesign ✦ MEDIUM IMPACT
**Files:** `components/forms/CarForm.tsx`, `components/forms/CustomerForm.tsx`  
Section cards with headers, field grouping, icon in label prefixes

### Phase E — Reports Pages Color Fix ✦ MEDIUM IMPACT
**Files:** accounting, trial-balance, chart-of-accounts pages  
Bulk replace remaining dark hardcodes

### Build Gate
After each phase: `npm run type-check && npm run build` — both must pass with zero errors.
