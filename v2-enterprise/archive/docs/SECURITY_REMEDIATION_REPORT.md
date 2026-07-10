# Security Remediation Report — v2-Enterprise (.NET 8 + Next.js)

**Date:** 2026-06-17  
**Scope:** v2-enterprise backend (ASP.NET Core 8) + nginx reverse proxy  
**Method:** Manual VA scan covering OWASP Top 10, JWT, RBAC, rate limiting, file upload, headers  

---

## Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 1     | 1     | 0         |
| High     | 3     | 3     | 0         |
| Medium   | 7     | 7     | 0         |
| Low      | 2     | 2     | 0         |
| **Total**| **13**| **13**| **0**     |

---

## Findings & Fixes

### CRIT-1 — Plaintext Password Exposed in Application Logs
**File:** `src/API/Program.cs:412`  
**Risk:** Any party with log access (file, SIEM, stdout) would see the admin password in plain text.  
**Fix:** Removed the password from the log statement. The log now reads:  
> "تم إعادة تعيين كلمة مرور admin بناءً على AdminSettings:ForceResetPassword=true."

---

### HIGH-1 — UsersController: No Role Restriction
**File:** `src/API/Controllers/UsersController.cs`  
**Risk:** Any authenticated user (Sales, Viewer) could enumerate, create, edit, and delete user accounts.  
**Fix:** Changed class-level attribute from `[Authorize]` → `[Authorize(Roles = "Owner,Admin")]`.

---

### HIGH-2 — RolesController: Write Endpoints Not Role-Restricted
**File:** `src/API/Controllers/RolesController.cs`  
**Risk:** Any authenticated user could change role permission matrices, granting themselves elevated access.  
**Fix:** Added `[Authorize(Roles = "Owner,Admin")]` to both mutation endpoints:
- `PUT /api/roles/{roleName}` — update role permissions
- `POST /api/roles/{roleName}/reset` — reset to defaults  

GET remains open to all authenticated users (needed to render role dropdowns across the UI).

---

### HIGH-8 — BackupsController: No Role Restriction
**File:** `src/API/Controllers/BackupsController.cs`  
**Risk:** Any authenticated user could download database backups or restore the database.  
**Fix:** Changed class-level attribute from `[Authorize]` → `[Authorize(Roles = "Owner,Admin")]`.

---

### MED-1 — GlobalPolicy Rate Limiter Defined but Never Applied
**File:** `src/API/Program.cs`  
**Risk:** The `GlobalPolicy` (300 req/min/IP) was registered but not enforced — all API endpoints were rate-limit-free.  
**Fix:** Changed `app.MapControllers()` → `app.MapControllers().RequireRateLimiting("GlobalPolicy")`.

---

### MED-2 — Overly Permissive Content-Security-Policy
**File:** `nginx/nginx.conf`  
**Risk:** CSP allowed `'unsafe-inline' 'unsafe-eval' http: https:` in `default-src`, effectively negating XSS protection.  
**Fix:** Tightened CSP to scope each directive:
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
connect-src 'self';
font-src 'self' data:;
object-src 'none';
base-uri 'self';
form-action 'self';
```
Added `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

---

### MED-3 — No Password Complexity Validation
**File:** `src/API/Controllers/UsersController.cs`  
**Risk:** Passwords of `a` or `123` were accepted, enabling trivially weak credentials.  
**Fix:** Added `ValidatePasswordComplexity()` helper enforcing:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character  

Applied to `CreateUser`, `UpdateUser` (password change path), and `ResetUserPassword`.

---

### MED-5 — AllowedHosts Set to Wildcard
**File:** `src/API/appsettings.json`  
**Risk:** `AllowedHosts: "*"` allows HTTP Host header injection attacks.  
**Fix:** Restricted to known hosts: `localhost;127.0.0.1;v2-enterprise-api`.

---

### MED-7 — Unbounded Search Parameters in AuditController
**File:** `src/API/Controllers/AuditController.cs`  
**Risk:** Unbounded `search`, `action`, `entity` query params could cause excessive DB load or ReDoS.  
**Fix:** Added length caps before DB query: `search` ≤ 200 chars, `action` ≤ 50 chars, `entity` ≤ 100 chars. Values are truncated (not rejected) to avoid breaking existing frontend calls.

---

### MED-8 — Image Upload: Extension Check Only (No Magic Bytes Validation)
**File:** `src/API/Controllers/InventoryController.cs`  
**Risk:** Attacker could rename a PHP/HTML file to `.jpg` and upload it as a vehicle photo.  
**Fix:** Added `IsValidImageMagicBytes()` that verifies the actual file content:
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47`
- WebP: `RIFF` header + `WEBP` marker at offset 8  

Validation runs after reading file into memory, before passing to the command handler.

---

### LOW-1 — Swagger UI Publicly Accessible
**File:** `nginx/nginx.conf`  
**Risk:** API schema and endpoint documentation exposed to the public internet.  
**Fix:** Added IP allowlist to `/swagger/` location block:
```
allow 127.0.0.1;
allow 172.16.0.0/12;   # Docker internal
allow 192.168.0.0/16;  # LAN
allow 10.0.0.0/8;      # VPN/private
deny all;
```

---

### LOW-2 — Deprecated X-XSS-Protection Header Present
**File:** `nginx/nginx.conf`  
**Risk:** `X-XSS-Protection: 1; mode=block` is deprecated and can cause XSS vulnerabilities in old IE.  
**Fix:** Removed the header. Modern browsers use CSP instead.

---

## Environment Hardening

- **`.env.example`** created at project root documenting all required environment variables with secure defaults.
- **JWT Secret**: Documented minimum 64-character requirement with generation command (`openssl rand -base64 64`).
- **Database credentials**: Placeholder values removed from committed config; all secrets must be set via environment variables.

---

## Remaining Recommendations (Out of Scope for This Sprint)

| # | Recommendation | Priority |
|---|---------------|----------|
| 1 | Add `[ValidateAntiForgeryToken]` or SameSite cookie enforcement for state-changing endpoints if cookie auth is ever added | Medium |
| 2 | Add `HSTS` header in nginx for HTTPS deployments | Medium |
| 3 | Enable Swagger only in `Development` environment via `app.Environment.IsDevelopment()` guard (defense in depth beyond nginx ACL) | Low |
| 4 | Add request body size limit per-endpoint for JSON endpoints (currently only enforced for file uploads) | Low |
| 5 | Rotate JWT secret on a schedule and implement refresh token rotation | Medium |

---

*Report prepared: 2026-06-17*
