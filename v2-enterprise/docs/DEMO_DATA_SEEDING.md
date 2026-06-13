# Demo Data Seeding

This guide explains how to populate the v2-enterprise system with realistic demo business data for development and demonstration purposes.

---

## Quick start

### Seed demo data (Development environment)

```bash
# The API auto-seeds on startup when ASPNETCORE_ENVIRONMENT=Development.
# If already running, call the reset endpoint:

curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<your_admin_password>"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])"
# → <TOKEN>

curl -s -X POST http://localhost/api/dev/reset-demo \
  -H "Authorization: Bearer <TOKEN>" | python3 -m json.tool
```

### Force-seed in any non-production environment

```bash
# docker-compose override:
DEMO_SEED=true docker compose -f docker-compose.prod.yml up -d

# OR set the env var on the running container:
docker exec v2-enterprise-api \
  env DEMO_SEED=true dotnet CarShowroomManagementV2.API.dll
```

### Reset demo data (wipe + re-seed)

```bash
curl -X POST http://localhost/api/dev/reset-demo \
  -H "Authorization: Bearer <TOKEN>"
```

### Check demo status

```bash
curl http://localhost/api/dev/demo-status \
  -H "Authorization: Bearer <TOKEN>"
```

---

## What gets seeded

| Entity            | Count | Details                                              |
|-------------------|-------|------------------------------------------------------|
| Vehicles          | 5     | 4 Available, 1 Sold (Hyundai Tucson)                 |
| Customers         | 2     | Mustafa Jamal (pre-existing) + Ahmed Hassan          |
| Suppliers         | 1     | Iraq Auto Import Co                                  |
| Purchases         | 3     | 2 cash + 1 bank, all in current month               |
| Sales Contracts   | 2     | 1 cash sale (full payment) + 1 installment sale      |
| Installment Plan  | 1     | 12-month plan, 5% profit rate, 1.72M IQD/month       |
| Installments      | 12    | Month 1 = Paid, rest Pending / Overdue based on date |
| Journal Entries   | 2     | Cash receipts for both sales                         |
| Journal Lines     | 7     | Debit/credit entries for 111001, 4101, 5101, 1301    |

### Expected dashboard values after seeding

```json
{
  "available_cars_count": 4,
  "sold_cars_count": 1,
  "customers_count": 2,
  "sales_count": 2,
  "purchases_count": 3,
  "cashbox_balance": 28200000,
  "total_revenue": 48000000,
  "inventory_value": 114800000,
  "installment_summary": {
    "total_receivables": 18961250
  }
}
```

---

## Account codes used

All demo journal entries use the same stable account codes as the production Chart of Accounts:

| Code   | Name                      | Role in demo                        |
|--------|---------------------------|-------------------------------------|
| 111001 | صندوق النقدية الرئيسي    | Cash received from sales            |
| 112001 | حساب البنك المركزي        | Bank account (purchase payments)    |
| 1301   | ذمم المدينين (العملاء)    | Accounts receivable (installments)  |
| 4101   | مبيعات السيارات           | Revenue from vehicle sales          |
| 5101   | تكلفة السيارات المباعة    | Cost of goods sold                  |

---

## Production safety

The seeder will **never run automatically in Production**, even if `DEMO_SEED=true` is accidentally set:

```csharp
// DemoDataSeeder.ShouldSeed() — always returns false for Production
if (env.Equals("Production", StringComparison.OrdinalIgnoreCase))
    return false;
```

The `POST /api/dev/reset-demo` endpoint returns HTTP 403 in Production.

---

## Stable UUIDs

All demo records use fixed UUIDs so that:
1. `SeedAsync` is idempotent — calling it twice does not duplicate data.
2. `ResetAsync` can surgically delete only demo rows without touching real data.

| Record                    | UUID prefix                              |
|---------------------------|------------------------------------------|
| Vehicles V1–V5            | `a1000001..` → `a1000005..`             |
| Customer C2 account       | `b2acc001..`                             |
| Supplier account          | `b2acc002..`                             |
| Customer Ahmed Hassan     | `b2000001..`                             |
| Supplier Iraq Auto Import | `c3000001..`                             |
| Sales Contracts SC1, SC2  | `d4000001..`, `d4000002..`               |
| Purchases P1–P3           | `e5000001..` → `e5000003..`             |
| Installment Plan IP1      | `f6000001..`                             |
| Journal Entries JE1, JE2  | `01000001..`, `01000002..`               |

---

## docker-compose environment variables

To enable demo seeding in `docker-compose.prod.yml`, add the env var to the API service:

```yaml
services:
  v2-enterprise-api:
    environment:
      - ASPNETCORE_ENVIRONMENT=Development   # enables auto-seed on startup
      # OR:
      - DEMO_SEED=true                        # enables auto-seed without changing environment name
```

---

## Files

| File | Purpose |
|------|---------|
| `src/Infrastructure/Persistence/DemoDataSeeder.cs` | Core seeder — `SeedAsync`, `ResetAsync`, `ShouldSeed` |
| `src/API/Controllers/DevController.cs` | `POST /api/dev/reset-demo`, `GET /api/dev/demo-status` |
| `src/API/Program.cs` | Calls `DemoDataSeeder.SeedAsync` on startup when enabled |
| `seed_v2_data.sql` | Standalone SQL equivalent (for manual/emergency use only) |
