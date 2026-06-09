# Security Remediation Summary
**Report:** VA/PT 2026-06-09  
**Completed:** 2026-06-10

---

## Fixed Findings

| ID | Severity | Description |
|----|----------|-------------|
| C-01 | Critical | SECRET_KEY rotated; `.secret_key` deleted from disk |
| C-02 | Critical | `per_page` capped at 100 on all 10 paginated endpoints |
| H-01 | High | `manage_reports` permission added to 6 report endpoints |
| H-02 | High | `manage_customers` permission added to `/api/scan/preview` |
| H-03 | High | `LoginAttempt` DB model added; rate-limit state persists across restarts |
| H-04 | High | `/api/admin/system-health` restricted to `manage_database`; runtime/error_log hidden from non-Owner |
| H-05 | High | `log_path` removed from `/api/admin/logs` response |
| H-06 | High | `_verify_backup_integrity()` added; restore rejects missing/malformed/path-traversal ZIPs |
| H-07 | High | `os.path.basename()` added to backup download and restore routes |
| H-08 | High | `SESSION_COOKIE_SAMESITE='Strict'` in cloud mode; `Lax` retained for desktop HTTP |
| M-01 | Medium | `manage_customers` permission added to `/api/search` |
| M-02 | Medium | `@api_login_required` added to `/api/version` |

Already implemented before this engagement (no change needed): C-03 (CSRF), L-05 (CSP), H-07 base (`get_backup_path` realpath check), `.gitignore` entries.

---

## Modified Files

- `backend/app.py` — C-02, H-01, H-02, H-03, H-04, H-05, H-07, M-01, M-02
- `backend/models.py` — H-03 (`LoginAttempt` model)
- `backend/backup_utils.py` — H-06 (`_verify_backup_integrity`)
- `backend/config.py` — H-08 (`SESSION_COOKIE_SAMESITE`)
- `.env` — C-01 (SECRET_KEY rotated)

---

## Tests Passed

| # | Test | Result |
|---|------|--------|
| T1 | Login: viewer=200, owner=200, bad_creds=401 | PASS |
| T2 | system-health: viewer=403, owner=200 | PASS |
| T3 | employees list: viewer=403, owner=200 | PASS |
| T4 | global search: viewer=403, owner=200 | PASS |
| T5 | `per_page=999999` → 100 items returned | PASS |
| T6 | `/api/version`: anon=401, authed=200 | PASS |
| T7 | `log_path` absent from admin logs response | PASS |
| T8 | Owner sees `runtime` and `error_log` in system-health | PASS |
| T9 | `npm run build` and `npx tsc --noEmit` clean | PASS |
| T10 | Restore rejects empty zip, missing DB, path traversal, malformed JSON | PASS |

---

## Remaining Items

| ID | Reason not fixed |
|----|-----------------|
| H-08 `Secure` flag on desktop | Desktop runs on HTTP via pywebview — `SESSION_COOKIE_SECURE=True` would break auth. Requires HTTPS infrastructure change outside code scope. |
| M-03 | Financial consistency N² queries — performance refactor, not a security fix. |
| M-05 | Verbose error messages — UI/UX concern, out of scope. |
| L-01–L-04 | Low severity, not in remediation scope. |

---

## Notes on `.env`

- `.env` is listed in `.gitignore` and is **not tracked by git** (`git ls-files --error-unmatch .env` returns non-zero).
- The SECRET_KEY that appeared in the VA/PT report has been rotated. The old key is invalid.
- `.secret_key` (desktop fallback key file) was deleted from disk and is also in `.gitignore`.
- Never commit `.env` to version control.
