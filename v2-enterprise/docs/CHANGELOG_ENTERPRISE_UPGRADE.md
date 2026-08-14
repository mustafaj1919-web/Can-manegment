# Changelog - Enterprise Upgrade

This log lists all upgrades, fixes, and improvements implemented in the repository during this upgrade cycle.

---

## 1. Hotfixes & Corrections

### A. Next.js Customer Website
- **Navbar early return fix**: Resolved the rules-of-hooks error in `Navbar.tsx` by moving the conditional pathname check to the end of the hook declarations.
- **Overlapping UI components fix**: Moved the "الرئيسية" / "Home" button in `CinematicShowroom.tsx` next to the slide counter (`start-24 top-6`), resolving overlaps with the floating mode switcher.
- **TypeScript compile fixes**: Destructured `locale` from `useI18n()` in `InventoryExperience.tsx` to fix compile errors.

### B. .NET 8.0 Web API Backend
- **Statement Query CS8602 warning**: Added the bang operator to `ThenInclude(ip => ip!.Installments)` to resolve EF nullable navigation warning.
- **CRM Controller CS8603 warning**: Changed helper function signatures (`CN` and `EN`) to return nullable string `string?` instead of non-nullable.
- **Unused variable CS0219 warnings**: Removed unused local variable `cashOrBankDesc` in `CreatePurchaseCommand.cs` and `BulkCreatePurchaseCommand.cs`.

---

## 2. Infrastructure & Auditing
- **Technology Audits**: Created the comprehensive full project audit `docs/ENTERPRISE_PROJECT_AUDIT.md` and dependency strategy `docs/DEPENDENCY_IMPLEMENTATION_PLAN.md`.
- **Database & Security**: Validated database isolation, local host bindings, and secret handling parameters. Saved findings in `docs/SECURITY_HARDENING_REPORT.md` and `docs/PERFORMANCE_OPTIMIZATION_REPORT.md`.
- **Quality & Tests**: Validated test runner compatibility. Verified all unit tests pass successfully. Created `docs/TESTING_STRATEGY.md` and `docs/DEPLOYMENT_READINESS_REPORT.md`.
