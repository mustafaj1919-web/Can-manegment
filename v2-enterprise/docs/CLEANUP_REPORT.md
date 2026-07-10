# Production Cleanup Report
**Date:** 2026-07-10  
**Engineer:** Claude Code (Principal Software Architect / Senior Refactoring Engineer)  
**Branch:** v2-enterprise  
**Baseline:** Production Approved — 136/136 E2E, 31/31 unit tests, 0 ESLint errors, 0 TS errors

---

## 1. Files Archived (moved to `archive/`)

### `archive/docs/` — 21 historical documents

| File | Reason |
|---|---|
| `V2_PHASE1_IMPLEMENTATION_REPORT.md` | Historical build report, superseded |
| `V2_PHASE2_IMPLEMENTATION_REPORT.md` | Historical build report, superseded |
| `V2_PHASE3_IMPLEMENTATION_REPORT.md` | Historical build report, superseded |
| `V2_PHASE3_FIX_REPORT.md` | Historical fix report, superseded |
| `V2_PHASE4_IMPLEMENTATION_REPORT.md` | Historical build report, superseded |
| `V2_PHASE5_FRONTEND_REPORT.md` | Historical build report, superseded |
| `V2_PHASE6_DEPLOYMENT_REPORT.md` | Historical build report, superseded |
| `V2_BUILD_TEST_FIX_REPORT.md` | Superseded by QA report |
| `V2_VERIFICATION_GATE_REPORT.md` | Superseded by QA report |
| `V2_VERIFICATION_PASSED.md` | Superseded by QA report |
| `V2_PRODUCTION_READINESS_REPORT.md` | Superseded by `docs/FULL_SYSTEM_QA_REPORT.md` |
| `V2_TEST_SEEDING_FIX_REPORT.md` | Superseded |
| `V2_UI_DEPENDENCY_AUDIT.md` | Stale — pre-redesign |
| `V2_LOCAL_VERIFICATION_GUIDE.md` | Superseded by `PRODUCTION_RUNBOOK.md` |
| `V2_FRONTEND_AUDIT_BEFORE_REDESIGN.md` | Pre-redesign state, no longer accurate |
| `V2_FRONTEND_ENTERPRISE_AUDIT.md` | Pre-redesign state, no longer accurate |
| `V2_FRONTEND_REBUILD_PLAN.md` | Planning artifact, rebuild is complete |
| `V2_FRONTEND_REDESIGN_PLAN.md` | Planning artifact, redesign is complete |
| `BUILD_FIX_REPORT.md` | One-time fix log, superseded |
| `SECURITY_REMEDIATION_REPORT.md` | Historical, security issues resolved |
| `V2_FRONTEND_API_INTEGRATION_FIX_REPORT.md` | Historical fix report, superseded |

### `archive/sql/` — 3 legacy seed files

| File | Reason |
|---|---|
| `seed_realistic_data.sql` | Legacy seed, replaced by `scripts/seed_demo_data.sql` |
| `seed_professional_chart_of_accounts.sql` | Integrated into migrations, standalone copy obsolete |
| `seed_v2_data.sql` | Documented as "emergency use only"; archived (not deleted) |

### `archive/k8s/` — Kubernetes manifests

| File | Reason |
|---|---|
| `k8s-manifests.yaml` | Not used in current Docker Compose deployment; retained for reference |

---

## 2. Files Deleted (dead code, zero references)

### Dead Code — Frontend

| File | Lines | Reason |
|---|---|---|
| `frontend/src/lib/api/cost-centers.ts` | 31 | Functions return hardcoded empty results; no imports in any source file |
| `frontend/src/styles/design-tokens.ts` | 62 | Defined `DESIGN_TOKENS` constant; zero imports across entire `src/` tree |

### Orphaned Verification Scripts (frontend root)

| File | Lines | Reason |
|---|---|---|
| `frontend/verify_modules.mjs` | 447 | One-off Playwright audit script; not referenced, not in `package.json` |
| `frontend/verify_search.mjs` | 328 | One-off Playwright audit script; not referenced, not in `package.json` |

### Debug/Capture Scripts (`frontend/scripts/`)

| File | Lines | Reason |
|---|---|---|
| `capture-dark.mjs` | 90 | Debugging screenshot capture |
| `capture-flask-system-screenshots.mjs` | 46 | Flask-era debug script |
| `capture-flask.mjs` | 19 | Flask-era debug script |
| `capture-system-screenshots.mjs` | (unlisted) | Debugging screenshot capture |
| `debug-page.mjs` | 12 | Browser debugging script |
| `debug-wait.mjs` | 13 | Browser debugging script |
| `fetch-login-debug.mjs` | 16 | Login debugging script |
| `flask-post-debug.mjs` | 13 | Flask-era POST debugging |
| `forced-shot.mjs` | 12 | Screenshot debugging script |
| `home-console.mjs` | 12 | Console debugging script |
| `login-console.mjs` | 14 | Login console debugging |
| `login-debug.mjs` | 16 | Login flow debugging |
| `login-enter.mjs` | 14 | Login enter key debugging |
| `make_favicon.py` | 13 | One-time favicon generation Python script |
| `parse-stats.mjs` | 28 | Build stats parser (one-time use) |
| `storage-debug.mjs` | 13 | LocalStorage debugging |
| `style-debug.mjs` | 12 | CSS debugging script |
| `test-channels.mjs` | 12 | Test channel debugging |
| `test-engines.mjs` | 12 | Browser engine test script |
| `test-shot.mjs` | 6 | Screenshot test script |
| **Total** | **373** | |

### OS Artifacts

| Type | Count | Reason |
|---|---|---|
| `.DS_Store` files | 18 | macOS metadata; already in `.gitignore` but present on disk |

### Empty Directories

| Directory | Reason |
|---|---|
| `backups/` | Empty directory (0 files) |
| `k8s/` | Emptied after archiving manifest |

---

## 3. Documents Promoted (root → `docs/`)

These files had reference value but were cluttering the project root:

| From | To |
|---|---|
| `V2_API_ENDPOINTS.md` | `docs/API_ENDPOINTS.md` |
| `V2_DESIGN_SYSTEM.md` | `docs/DESIGN_SYSTEM.md` |
| `V2_FRONTEND_PAGES.md` | `docs/FRONTEND_PAGES.md` |

---

## 4. Lines of Code Removed

| Category | Lines |
|---|---|
| Dead code (cost-centers.ts, design-tokens.ts) | 93 |
| Orphaned verify scripts (verify_modules.mjs, verify_search.mjs) | 775 |
| Debug/capture scripts (19 files) | 373 |
| **Total deleted** | **~1,241 lines** |
| Archived docs (21 files, moved not deleted) | ~2,448 lines |

---

## 5. Files NOT Touched (verified safe to keep)

| File / Area | Reason Kept |
|---|---|
| `frontend/scripts/postbuild.mjs` | Used in `npm run build` via `package.json` |
| `frontend/src/lib/api/cost-centers.ts` | DELETED (confirmed dead) |
| All controllers (`DevController`, `OcrController`, etc.) | Used via DI / routing / frontend |
| `mobile-app/` | Active Flutter mobile app project |
| `website-php/` | Separate customer-facing website project |
| `scripts/seed_demo_data.sql` | Active — used for demo/presentation reset |
| `scripts/backup-db.sh`, `restore-db.sh` | Operational backup scripts |
| `scripts/backup-db.ps1`, `restore-db.ps1` | Windows operational scripts |
| `scripts/deploy.sh` | Active deployment script |
| `docs/FULL_SYSTEM_QA_REPORT.md` | Current production QA report |
| `docs/V2_ARCHITECTURE.md` | Architecture reference |
| `docs/V2_PROJECT_PLAN.md` | Project planning reference |
| `.env.example`, `.env.production.example` | Onboarding documentation |

---

## 6. SQL / Database Objects

No database objects were modified. The cleanup was purely at the file/code level.

**Identified for future consideration (not actioned):**
- `seed_v2_data.sql` (archived) contains accounts/vehicles that may partially overlap with production data; no migration required.

---

## 7. Dependencies — No Changes

All `npm` and NuGet packages are still actively used. No packages were removed.

**Rationale:** The deleted files (`cost-centers.ts`, `design-tokens.ts`, debug scripts) did not introduce any unique package dependencies not already required by other modules.

---

## 8. Build & Test Results (Post-Cleanup)

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 errors, 204 warnings (warnings unchanged) |
| `npm run type-check` | ✅ 0 errors |
| `npm run build` | ✅ Compiled successfully, postbuild ✓ |
| `dotnet build` | ✅ Build succeeded, 0 errors, 5 warnings (unchanged) |
| Playwright E2E suite | ✅ **136/136 passed** — 0 skipped, 0 failed |
| Docker containers | ✅ api (healthy), frontend, postgres (healthy), redis (healthy), adminer |

---

## 9. Final Confirmation

**Application behavior is identical to pre-cleanup state.**

All runtime paths are unchanged:
- Zero source files that are imported by application code were deleted
- Zero API controllers were removed
- Zero database entities were modified
- Zero package dependencies were removed
- All 136 E2E tests pass against the live application confirming functional equivalence

**Production codebase is now lean, organized, and maintainable.**
