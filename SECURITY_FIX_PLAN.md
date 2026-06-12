# Security Fix Plan — Car Showroom Management
## Based on VA/PT Report 2026-06-09

### Files to Modify
| File | Findings |
|------|----------|
| `car_showroom_management/.gitignore` | C-01 — verify .env and .secret_key are excluded |
| `car_showroom_management/.env` | C-01 — rotate SECRET_KEY |
| `car_showroom_management/backend/models.py` | H-03 — add LoginAttempt model |
| `car_showroom_management/backend/app.py` | C-02, H-01, H-02, H-03, H-04, H-05, H-07, M-01, M-02 |
| `car_showroom_management/backend/backup_utils.py` | H-06 |
| `car_showroom_management/backend/config.py` | H-08 |

---

### CRITICAL

**C-01 — Credentials in .env (CVSS 9.8)**
- `.gitignore` already contains `.env` and `.secret_key` ✅
- Action: rotate SECRET_KEY in `.env` (old key was exposed in report)
- Action: delete `.secret_key` if it exists on disk

**C-02 — Unbounded per_page (CVSS 9.1)**
- File: `backend/app.py`
- Fix: `per_page = min(int(request.args.get('per_page', N)), 100)` in all paginated endpoints
- Affected lines (approx): 2141, 2187, 2226, 2294, 2630, 3914, 4633, 5200, 8289, 8367

**C-03 — No CSRF (CVSS 8.8)**
- Already implemented in current code (session token + X-XSRF-TOKEN header) ✅
- Cookie set via XSRF-TOKEN, validated in `_csrf_validate()` before_request

---

### HIGH

**H-01 — Missing Permission on 8 endpoints (CVSS 7.5)**
- File: `backend/app.py`
- Add `@api_permission_required('manage_reports')` to:
  - `/api/smart-alerts`
  - `/api/reports/smart-summary`
  - `/api/reports/cash-flow-forecast`
  - `/api/reports/mom-comparison`
  - `/api/reports/monthly-profit`
  - `/api/reports/anomalies`
- Add `@api_permission_required('manage_users')` to:
  - `GET /api/employees`
  - `GET /api/employees/<id>`

**H-02 — Scanner triggerable by any user (CVSS 7.1)**
- File: `backend/app.py` — `api_scan_preview`
- Add `@api_permission_required('manage_customers')` after `@api_login_required`

**H-03 — In-Memory Rate Limiting reset on restart (CVSS 7.5)**
- File: `backend/models.py` — add `LoginAttempt` model
- File: `backend/app.py` — update `_record_failure` / `_is_locked_out` / `_record_success` to persist to DB
- db.create_all() will auto-create the table

**H-04 — system-health exposes infrastructure data (CVSS 7.5)**
- File: `backend/app.py` — `api_system_health`
- Change permission: `manage_reports` → `manage_database`
- Filter response: hide `runtime` and `error_log` keys for non-Owner users

**H-05 — Admin logs expose log_path (CVSS 7.3)**
- File: `backend/app.py` — `api_admin_logs`
- Remove `'log_path': log_path` from the JSON response

**H-06 — Backup restore without integrity check (CVSS 7.4)**
- File: `backend/backup_utils.py` — `restore_backup_archive`
- Add check: require `metadata.json` in backup archive

**H-07 — Path Traversal in Backup URLs (CVSS 7.5)**
- `get_backup_path()` already has `os.path.realpath` + `startswith` protection ✅
- Extra defense: sanitize filename with `os.path.basename` at route level in:
  - `api_download_backup`
  - `api_restore_backup`

**H-08 — Session Cookie not Secure in Desktop HTTP (CVSS 7.1)**
- `SESSION_COOKIE_HTTPONLY = True` already set ✅
- `SESSION_COOKIE_SAMESITE = 'Lax'` already set ✅
- `SESSION_COOKIE_SECURE = True` in Cloud mode already ✅
- Desktop mode: HTTPS not available without mkcert (outside code scope)
- Mitigation: document in config; cannot force Secure=True on HTTP-only desktop

---

### MEDIUM (in scope per task)

**M-01 — Global Search returns PII without permission (CVSS 6.5)**
- File: `backend/app.py` — `api_global_search`
- Add `@api_permission_required('manage_customers')`

**M-02 — /api/version no auth (CVSS 5.3)**
- File: `backend/app.py` — `api_version`
- Add `@api_login_required`

**L-05 — Missing CSP (CVSS 3.1)**
- Already implemented in `add_local_cors_headers` ✅

---

### Not in scope
- H-03 full DB migration for rate limiting (partial: model + persistence added)
- H-08 HTTPS/mkcert setup (infrastructure, not code)
- M-03 Financial Consistency N² queries (performance refactor, not security)
- M-05 Verbose error messages (separate UI concern)
- L-01~L-04 (LOW severity, out of time scope)
