"""
Integration tests for the v2-enterprise .NET API endpoints.
Requires the Docker stack to be running at http://localhost (port 80).
Authenticate once and reuse the JWT token for all tests.
"""

import pytest
import requests

BASE_URL = "http://localhost/api"
ADMIN_CREDENTIALS = {"username": "admin", "password": "Aldulimi99"}

_token: str | None = None


def get_token() -> str:
    global _token
    if _token is None:
        r = requests.post(f"{BASE_URL}/auth/login", json=ADMIN_CREDENTIALS, timeout=10)
        assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
        data = r.json()
        _token = data.get("token") or data.get("access_token") or data.get("accessToken")
        assert _token, f"No token in response: {data}"
    return _token


def auth_headers() -> dict:
    return {"Authorization": f"Bearer {get_token()}"}


# ─── Dashboard ────────────────────────────────────────────────────────────────

class TestDashboard:
    def test_dashboard_returns_200(self):
        r = requests.get(f"{BASE_URL}/dashboard", headers=auth_headers(), timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_dashboard_has_required_fields(self):
        r = requests.get(f"{BASE_URL}/dashboard", headers=auth_headers(), timeout=10)
        data = r.json()
        for field in ("available_cars_count", "sold_cars_count", "customers_count",
                      "sales_count", "purchases_count", "monthly_profit"):
            assert field in data, f"Missing field: {field}"

    def test_dashboard_requires_auth(self):
        r = requests.get(f"{BASE_URL}/dashboard", timeout=10)
        assert r.status_code == 401

    def test_dashboard_non_zero_with_seeded_data(self):
        """Regression: seeded data (4 vehicles, 2 sales, 2 purchases) must yield non-zero dashboard."""
        r = requests.get(f"{BASE_URL}/dashboard", headers=auth_headers(), timeout=10)
        data = r.json()
        assert data.get("available_cars_count", 0) > 0,  "available_cars_count must be > 0"
        assert data.get("customers_count", 0) > 0,       "customers_count must be > 0"
        assert data.get("sales_count", 0) > 0,           "sales_count must be > 0"
        assert data.get("purchases_count", 0) > 0,       "purchases_count must be > 0"
        assert data.get("cashbox_balance", 0) > 0,       "cashbox_balance must be > 0 (journal entries seeded)"
        assert data.get("total_revenue", 0) > 0,         "total_revenue must be > 0"
        assert data.get("inventory_value", 0) > 0,       "inventory_value must be > 0"
        inst = data.get("installment_summary", {})
        assert inst.get("total_receivables", 0) > 0,     "installment_summary.total_receivables must be > 0"


# ─── Monthly Profit Report ───────────────────────────────────────────────────

class TestMonthlyProfitReport:
    def test_monthly_profit_returns_200(self):
        r = requests.get(f"{BASE_URL}/reports/monthly-profit?months=6",
                         headers=auth_headers(), timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_monthly_profit_has_months_and_totals(self):
        r = requests.get(f"{BASE_URL}/reports/monthly-profit?months=3",
                         headers=auth_headers(), timeout=10)
        data = r.json()
        assert "months" in data, "Missing 'months' key"
        assert "totals" in data, "Missing 'totals' key"
        assert len(data["months"]) == 3, f"Expected 3 months, got {len(data['months'])}"

    def test_monthly_profit_requires_auth(self):
        r = requests.get(f"{BASE_URL}/reports/monthly-profit", timeout=10)
        assert r.status_code == 401


# ─── Smart Alerts ─────────────────────────────────────────────────────────────

class TestSmartAlerts:
    def test_smart_alerts_returns_200(self):
        r = requests.get(f"{BASE_URL}/smart-alerts", headers=auth_headers(), timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_smart_alerts_has_alerts_and_counts(self):
        r = requests.get(f"{BASE_URL}/smart-alerts", headers=auth_headers(), timeout=10)
        data = r.json()
        assert "alerts" in data,  "Missing 'alerts' key"
        assert "counts" in data,  "Missing 'counts' key"
        assert isinstance(data["alerts"], list), "'alerts' should be a list"
        counts = data["counts"]
        for field in ("total", "critical", "high", "warning", "info"):
            assert field in counts, f"Missing counts.{field}"

    def test_smart_alerts_requires_auth(self):
        r = requests.get(f"{BASE_URL}/smart-alerts", timeout=10)
        assert r.status_code == 401


# ─── Cashbox Closes ───────────────────────────────────────────────────────────

class TestCashboxCloses:
    def test_current_balance_returns_200(self):
        r = requests.get(f"{BASE_URL}/cashbox-closes/current-balance?account_code=111001",
                         headers=auth_headers(), timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_current_balance_has_balance_field(self):
        r = requests.get(f"{BASE_URL}/cashbox-closes/current-balance?account_code=111001",
                         headers=auth_headers(), timeout=10)
        data = r.json()
        assert "balance" in data,       "Missing 'balance' field"
        assert "account_code" in data,  "Missing 'account_code' field"
        assert "account_name" in data,  "Missing 'account_name' field"

    def test_cashbox_closes_list_returns_200(self):
        r = requests.get(f"{BASE_URL}/cashbox-closes", headers=auth_headers(), timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        assert isinstance(r.json(), list), "Expected a list response"

    def test_cashbox_closes_requires_auth(self):
        r = requests.get(f"{BASE_URL}/cashbox-closes", timeout=10)
        assert r.status_code == 401


# ─── Purchases — method filter & permissions ──────────────────────────────────

class TestPurchasesPermissions:
    def test_purchases_installment_filter_returns_200_not_403(self):
        """Installment is not a valid purchase payment method — should return empty 200."""
        r = requests.get(f"{BASE_URL}/purchases?page=1&per_page=1&method=Installment",
                         headers=auth_headers(), timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("total") == 0, f"Expected total=0 for Installment purchases"

    def test_purchases_cash_filter_works(self):
        r = requests.get(f"{BASE_URL}/purchases?method=Cash",
                         headers=auth_headers(), timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_purchases_unknown_method_returns_200_empty(self):
        r = requests.get(f"{BASE_URL}/purchases?method=InvalidMethod",
                         headers=auth_headers(), timeout=10)
        assert r.status_code == 200
        assert r.json().get("total") == 0

    def test_purchases_requires_auth(self):
        r = requests.get(f"{BASE_URL}/purchases", timeout=10)
        assert r.status_code == 401
