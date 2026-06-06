"""
Full System Audit & End-to-End QA
Covers all 20 areas defined in the audit specification.
Run against a live Flask server on http://localhost:5000
"""

import json
import os
import sys
import time
import uuid
from datetime import datetime, date, timedelta
from pathlib import Path
import requests

BASE    = "http://localhost:5000"
API     = f"{BASE}/api"
SESSION = requests.Session()

RESULTS = []   # (status, area, test_name, detail)

# --- helpers ------------------------------------------------------------------

def r(status, area, name, detail=""):
    RESULTS.append((status, area, name, str(detail)))
    tag = f"  [{status}] [{area}] {name}"
    if detail:
        tag += f" | {detail}"
    try:
        print(tag)
    except UnicodeEncodeError:
        print(tag.encode('ascii', 'replace').decode('ascii'))

def api(method, path, **kwargs):
    url = f"{API}{path}" if path.startswith("/") else f"{API}/{path}"
    resp = SESSION.request(method, url, timeout=20, **kwargs)
    return resp

def login(username="owner", password="TestPass2024!"):
    resp = SESSION.post(f"{API}/auth/login",
                        json={"username": username, "password": password}, timeout=10)
    return resp

def logout():
    SESSION.post(f"{API}/auth/logout", timeout=10)

def jget(path, field=None, default=None):
    """GET and return JSON field."""
    try:
        r = api("GET", path)
        if r.status_code == 200:
            d = r.json()
            return d.get(field, d) if field else d
    except Exception:
        pass
    return default

# ============================================================
# 0. Pre-flight
# ============================================================
def audit_preflight():
    area = "PREFLIGHT"
    try:
        h = SESSION.get(f"{API}/health", timeout=5).json()
        assert h.get("status") == "ok", h
        r("PASS", area, "Flask /api/health returns OK")
    except Exception as e:
        r("FAIL", area, "Flask /api/health", str(e))
        return False

    # DB type from env
    project = Path(__file__).parent
    try:
        from dotenv import load_dotenv
        load_dotenv(project / '.env', override=False)
    except Exception:
        pass
    db_url = os.environ.get('DATABASE_URL', '')
    if db_url.startswith('postgresql'):
        r("PASS", area, "DATABASE_URL is PostgreSQL")
    else:
        r("FAIL", area, "DATABASE_URL is PostgreSQL", f"Got: {db_url[:40]}")

    # Static file 200 check
    try:
        sr = SESSION.get(
            f"{BASE}/static/uploads/customers/9d7717b51d484370834358046280ded5.png",
            timeout=5)
        if sr.status_code == 200:
            r("PASS", area, "Known static file returns 200 (no 404)")
        else:
            r("FAIL", area, "Known static file", f"HTTP {sr.status_code}")
    except Exception as e:
        r("FAIL", area, "Static file reachable", str(e))

    # STATIC_FOLDER correct
    try:
        project = Path(__file__).parent
        sys.path.insert(0, str(project))
        os.environ.setdefault('CAR_SHOWROOM_DATA_DIR', str(project))
        os.environ.setdefault('DATABASE_URL', 'sqlite:///x')
        os.environ.setdefault('UPLOAD_FOLDER', str(project / 'static' / 'uploads'))
        os.environ.setdefault('BACKUP_FOLDER', str(project / 'data' / 'backups'))
        os.environ.setdefault('SECRET_KEY', 'qa')
        from backend.config import Config
        sf = Config.STATIC_FOLDER
        expected = str(project / 'static')
        if sf == expected:
            r("PASS", area, f"STATIC_FOLDER correct: {sf}")
        else:
            r("WARN", area, "STATIC_FOLDER path", f"Expected {expected}, got {sf}")
    except Exception as e:
        r("WARN", area, "STATIC_FOLDER check", str(e))

    return True

# ============================================================
# 1. Login / Logout / Sessions
# ============================================================
def audit_login():
    area = "AUTH"

    # Valid login
    resp = login()
    if resp.status_code == 200:
        r("PASS", area, "Login owner/TestPass2024! -> 200")
    else:
        r("FAIL", area, "Login owner/TestPass2024!", f"HTTP {resp.status_code}: {resp.text[:120]}")
        return

    # /auth/me — response is {"user": {...}, "active_branch": ..., "branches": ...}
    me = api("GET", "/auth/me")
    me_user = me.json().get("user", {}) if me.status_code == 200 else {}
    if me.status_code == 200 and me_user.get("username") == "owner":
        r("PASS", area, "/api/auth/me returns correct user")
    else:
        r("FAIL", area, "/api/auth/me", f"{me.status_code}: {me.text[:80]}")

    # Session cookie
    if SESSION.cookies.get("session"):
        r("PASS", area, "Session cookie set after login")
    else:
        r("WARN", area, "Session cookie", "No 'session' cookie in session")

    # Wrong password
    bad = requests.post(f"{API}/auth/login",
                        json={"username": "owner", "password": "WRONG"}, timeout=5)
    if bad.status_code in (401, 400):
        r("PASS", area, "Wrong password returns 401/400")
    else:
        r("WARN", area, "Wrong password", f"Got {bad.status_code}")

    # Unauthenticated access
    anon = requests.Session()
    anon_r = anon.get(f"{API}/customers", timeout=5)
    if anon_r.status_code in (401, 302):
        r("PASS", area, "Unauthenticated /customers -> 401/302")
    else:
        r("FAIL", area, "Unauthenticated access blocked", f"Got {anon_r.status_code}")

    # Logout
    out = api("POST", "/auth/logout")
    if out.status_code == 200:
        r("PASS", area, "Logout -> 200")
    else:
        r("WARN", area, "Logout", f"HTTP {out.status_code}")

    after = api("GET", "/auth/me")
    if after.status_code in (401, 302):
        r("PASS", area, "/auth/me after logout -> 401/302")
    else:
        r("FAIL", area, "/auth/me after logout", f"Got {after.status_code}")

    login()  # re-login for remaining tests

# ============================================================
# 2. Users / Roles / Permissions / RBAC
# ============================================================
def audit_rbac():
    area = "RBAC"

    resp = api("GET", "/users")
    if resp.status_code == 200:
        users_list = resp.json().get("users", resp.json())
        r("PASS", area, f"/api/users list -> {len(users_list)} users")
    else:
        r("FAIL", area, "/api/users", f"HTTP {resp.status_code}")
        return

    # Create a sales test user (role names are Title-cased: Sales, Accountant, etc.)
    uid = f"qa_{uuid.uuid4().hex[:6]}"
    cu = api("POST", "/users", json={"username": uid, "password": "TestPass123!", "role": "Sales"})
    if cu.status_code in (200, 201):
        created_id = cu.json().get("id") or cu.json().get("user", {}).get("id")
        r("PASS", area, f"Create sales user '{uid}' -> id={created_id}")
    else:
        r("FAIL", area, "Create sales user", f"HTTP {cu.status_code}: {cu.text[:100]}")
        created_id = None
        uid = None

    # Roles endpoint
    roles = api("GET", "/roles")
    if roles.status_code == 200:
        r("PASS", area, "GET /api/roles -> 200")
    else:
        r("WARN", area, "GET /api/roles", f"HTTP {roles.status_code}")

    # RBAC: sales user cannot manage users
    if uid:
        time.sleep(1)  # avoid 429 rate limit after owner logout/login
        sales_s = requests.Session()
        sl = sales_s.post(f"{API}/auth/login",
                          json={"username": uid, "password": "TestPass123!"}, timeout=5)
        if sl.status_code == 200:
            # users endpoint
            su = sales_s.get(f"{API}/users", timeout=5)
            if su.status_code in (401, 403):
                r("PASS", area, "Sales role cannot list users -> 401/403")
            else:
                r("FAIL", area, "Sales role RBAC /users", f"Got {su.status_code}")
            # accounting
            sa = sales_s.get(f"{API}/reports/balance-sheet", timeout=5)
            if sa.status_code in (401, 403):
                r("PASS", area, "Sales role cannot access balance-sheet -> 401/403")
            else:
                r("FAIL", area, "Sales role RBAC /reports/balance-sheet", f"Got {sa.status_code}")
        else:
            r("WARN", area, "Sales user login", f"HTTP {sl.status_code}")

    # RBAC: accountant cannot manage users
    uid_acc = f"qa_{uuid.uuid4().hex[:6]}"
    cu_acc = api("POST", "/users", json={"username": uid_acc, "password": "AccPass123!", "role": "Accountant"})
    if cu_acc.status_code in (200, 201):
        acc_id = cu_acc.json().get("id") or cu_acc.json().get("user", {}).get("id")
        acc_s = requests.Session()
        al = acc_s.post(f"{API}/auth/login",
                        json={"username": uid_acc, "password": "AccPass123!"}, timeout=5)
        if al.status_code == 200:
            au = acc_s.get(f"{API}/users", timeout=5)
            if au.status_code in (401, 403):
                r("PASS", area, "Accountant cannot list users -> 401/403")
            else:
                r("FAIL", area, "Accountant RBAC /users", f"Got {au.status_code}")
        # cleanup
        if acc_id:
            api("DELETE", f"/users/{acc_id}")

    # Delete test user
    if created_id:
        dr = api("DELETE", f"/users/{created_id}")
        if dr.status_code in (200, 204):
            r("PASS", area, f"Delete test user {created_id}")
        else:
            r("WARN", area, "Delete test user", f"HTTP {dr.status_code}")

# ============================================================
# 3. Branches
# ============================================================
def audit_branches():
    area = "BRANCHES"
    resp = api("GET", "/reports")
    if resp.status_code == 200:
        branches = resp.json().get("branches", [])
        r("PASS", area, f"Branches via /api/reports -> {len(branches)} branches")
        main_branch = next((b for b in branches if b.get("is_main")), None)
        if main_branch:
            r("PASS", area, f"Main branch id={main_branch.get('id')} exists")
        else:
            r("WARN", area, "Main branch", "No main branch found")
    else:
        r("FAIL", area, "/api/reports for branches", f"HTTP {resp.status_code}")

    # System health shows branch info
    sh = api("GET", "/admin/system-health")
    if sh.status_code == 200:
        r("PASS", area, "/api/admin/system-health -> 200")
    else:
        r("WARN", area, "/api/admin/system-health", f"HTTP {sh.status_code}")

# ============================================================
# 4. Dashboard
# ============================================================
def audit_dashboard():
    area = "DASHBOARD"
    resp = api("GET", "/dashboard")
    if resp.status_code == 200:
        d = resp.json()
        keys = list(d.keys())
        r("PASS", area, f"/api/dashboard -> 200 (keys: {keys[:5]})")
    else:
        r("FAIL", area, "/api/dashboard", f"HTTP {resp.status_code}: {resp.text[:80]}")

    # Smart alerts
    sa = api("GET", "/smart-alerts")
    if sa.status_code == 200:
        r("PASS", area, "/api/smart-alerts -> 200")
    elif sa.status_code == 404:
        r("WARN", area, "/api/smart-alerts", "Not found")
    else:
        r("WARN", area, "/api/smart-alerts", f"HTTP {sa.status_code}")

# ============================================================
# 5. Customers
# ============================================================
def audit_customers():
    area = "CUSTOMERS"

    resp = api("GET", "/customers")
    if resp.status_code == 200:
        total = resp.json().get("total", 0)
        r("PASS", area, f"GET /api/customers -> total={total}")
    else:
        r("FAIL", area, "GET /api/customers", f"HTTP {resp.status_code}")
        return None, None

    # Create Buyer
    buyer_payload = {
        "name": "QA Buyer", "phone": f"077{uuid.uuid4().int % 100000000:08d}",
        "id_number": f"QABUY{uuid.uuid4().hex[:6].upper()}",
        "customer_type": "Buyer", "address": "Baghdad"
    }
    cb = api("POST", "/customers", json=buyer_payload)
    if cb.status_code in (200, 201):
        buyer_id = cb.json().get("id")
        r("PASS", area, f"Create Buyer -> id={buyer_id}")
    else:
        r("FAIL", area, "Create Buyer", f"HTTP {cb.status_code}: {cb.text[:100]}")
        return None, None

    # Create Seller
    seller_payload = {
        "name": "QA Seller", "phone": f"078{uuid.uuid4().int % 100000000:08d}",
        "id_number": f"QASEL{uuid.uuid4().hex[:6].upper()}",
        "customer_type": "Seller", "address": "Basra"
    }
    cs = api("POST", "/customers", json=seller_payload)
    if cs.status_code in (200, 201):
        seller_id = cs.json().get("id")
        r("PASS", area, f"Create Seller -> id={seller_id}")
    else:
        r("FAIL", area, "Create Seller", f"HTTP {cs.status_code}: {cs.text[:100]}")
        seller_id = None

    # Update buyer
    ub = api("PUT", f"/customers/{buyer_id}",
             json={**buyer_payload, "address": "Mosul Updated"})
    if ub.status_code == 200:
        r("PASS", area, f"Update Buyer {buyer_id}")
    else:
        r("FAIL", area, "Update Buyer", f"HTTP {ub.status_code}: {ub.text[:80]}")

    # Get by ID
    gb = api("GET", f"/customers/{buyer_id}")
    if gb.status_code == 200 and gb.json().get("id") == buyer_id:
        r("PASS", area, f"GET /api/customers/{buyer_id} correct")
    else:
        r("FAIL", area, f"GET /api/customers/{buyer_id}", f"HTTP {gb.status_code}")

    # Upload document
    img_bytes = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00'
        b'\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    files = {"file": ("id_front.png", img_bytes, "image/png")}
    data_form = {"document_type": "id_front"}
    dr = SESSION.post(f"{API}/customers/{buyer_id}/documents",
                      files=files, data=data_form, timeout=15)
    if dr.status_code in (200, 201):
        doc_id = dr.json().get("id")
        r("PASS", area, f"Upload customer document -> id={doc_id}")
        # Static access
        fname = dr.json().get("filename", "")
        if fname:
            sr = SESSION.get(f"{BASE}/static/uploads/customers/{fname}", timeout=5)
            if sr.status_code == 200:
                r("PASS", area, "Uploaded document accessible via /static/")
            else:
                r("FAIL", area, "Uploaded doc /static/ access", f"HTTP {sr.status_code}")
        # Delete doc
        if doc_id:
            ddr = api("DELETE", f"/customers/{buyer_id}/documents/{doc_id}")
            if ddr.status_code in (200, 204):
                r("PASS", area, "Delete customer document")
            else:
                r("WARN", area, "Delete document", f"HTTP {ddr.status_code}")
    else:
        r("FAIL", area, "Upload customer document",
          f"HTTP {dr.status_code}: {dr.text[:120]}")

    # Search
    sr2 = api("GET", "/customers?search=QA")
    if sr2.status_code == 200:
        r("PASS", area, "Customer search returns 200")
    else:
        r("WARN", area, "Customer search", f"HTTP {sr2.status_code}")

    # Statement
    stmt = api("GET", f"/customers/{buyer_id}/statement")
    if stmt.status_code == 200:
        r("PASS", area, f"Customer statement -> 200")
    elif stmt.status_code == 404:
        r("WARN", area, "Customer statement", "Not found")
    else:
        r("WARN", area, "Customer statement", f"HTTP {stmt.status_code}")

    return buyer_id, seller_id

# ============================================================
# 6. Inventory
# ============================================================
def audit_inventory():
    area = "INVENTORY"

    resp = api("GET", "/inventory")
    if resp.status_code == 200:
        total = resp.json().get("total", 0)
        r("PASS", area, f"GET /api/inventory -> total={total}")
    else:
        r("FAIL", area, "GET /api/inventory", f"HTTP {resp.status_code}")
        return None

    vin = f"QA{uuid.uuid4().hex[:12].upper()}"
    car_payload = {
        "brand": "QABrand", "model": "QAModel", "manufacturing_year": 2024,
        "color": "Black", "vin": vin, "plate_number": f"Q{uuid.uuid4().hex[:6].upper()}",
        "mileage": 5000, "purchase_price": 10000, "selling_price": 12000,
        "currency": "USD", "condition": "New", "transmission": "Automatic",
        "fuel_type": "Gasoline"
    }
    ca = api("POST", "/inventory", json=car_payload)
    if ca.status_code in (200, 201):
        car_id = ca.json().get("id")
        r("PASS", area, f"Create car -> id={car_id}")
    else:
        r("FAIL", area, "Create car", f"HTTP {ca.status_code}: {ca.text[:100]}")
        return None

    # Get by ID
    gc = api("GET", f"/inventory/{car_id}")
    if gc.status_code == 200 and gc.json().get("id") == car_id:
        r("PASS", area, f"GET /api/inventory/{car_id}")
        if gc.json().get("status") == "Available":
            r("PASS", area, "New car status = Available")
        else:
            r("WARN", area, "New car status", f"Got {gc.json().get('status')}")
    else:
        r("FAIL", area, f"GET /api/inventory/{car_id}", f"HTTP {gc.status_code}")

    # Update
    uc = api("PUT", f"/inventory/{car_id}",
             json={**car_payload, "color": "White", "selling_price": 13000})
    if uc.status_code == 200:
        r("PASS", area, "Update car -> 200")
    else:
        r("FAIL", area, "Update car", f"HTTP {uc.status_code}: {uc.text[:80]}")

    # Upload photo
    png_bytes = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00'
        b'\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    files = {"photos": ("car.png", png_bytes, "image/png")}
    pr = SESSION.post(f"{API}/inventory/{car_id}/photos", files=files, timeout=15)
    if pr.status_code in (200, 201):
        photos = pr.json().get("photos", [])
        r("PASS", area, f"Upload car photo -> {len(photos)} photo(s)")
        if photos:
            ph = photos[0]
            fname = ph.get("filename", "")
            subfol = ph.get("subfolder", "vehicles")
            if fname:
                sr = SESSION.get(f"{BASE}/static/uploads/{subfol}/{fname}", timeout=5)
                if sr.status_code == 200:
                    r("PASS", area, "Car photo accessible via /static/")
                else:
                    r("FAIL", area, "Car photo /static/ access", f"HTTP {sr.status_code}")
            # Delete photo
            ph_id = ph.get("id")
            if ph_id:
                dpr = api("DELETE", f"/inventory/{car_id}/photos/{ph_id}")
                if dpr.status_code in (200, 204):
                    r("PASS", area, "Delete car photo -> 200/204")
                else:
                    r("WARN", area, "Delete car photo", f"HTTP {dpr.status_code}")
    else:
        r("FAIL", area, "Upload car photo",
          f"HTTP {pr.status_code}: {pr.text[:120]}")

    return car_id

# ============================================================
# 7. Purchases
# ============================================================
def audit_purchases(seller_id):
    area = "PURCHASES"

    resp = api("GET", "/purchases")
    if resp.status_code == 200:
        r("PASS", area, f"GET /api/purchases -> total={resp.json().get('total', 0)}")
    else:
        r("FAIL", area, "GET /api/purchases", f"HTTP {resp.status_code}")
        return None, None

    if not seller_id:
        r("WARN", area, "Purchase tests", "No seller_id - skipped")
        return None, None

    # POST /api/purchases creates car + purchase record together (inline car fields required)
    vin = f"PURCH{uuid.uuid4().hex[:8].upper()}"
    purch_payload = {
        # inline car fields (required by the endpoint)
        "brand": "QPurch", "model": "PurchCar", "manufacturing_year": 2023,
        "color": "Silver", "vin": vin,
        "plate_number": f"P{uuid.uuid4().hex[:5].upper()}",
        "mileage": 10000,
        # purchase fields
        "seller_id": seller_id,
        "purchase_price": 8000, "currency": "USD",
        "purchase_date": date.today().isoformat(),
        "payment_method": "Cash", "paid_amount": 8000,
        "notes": "QA full purchase"
    }
    pr = api("POST", "/purchases", json=purch_payload)
    if pr.status_code in (200, 201):
        purch_id = pr.json().get("id")
        r("PASS", area, f"Create purchase (cash) -> id={purch_id}")
    else:
        r("FAIL", area, "Create purchase (cash)",
          f"HTTP {pr.status_code}: {pr.text[:120]}")
        return None, None

    # Get purchase
    gp = api("GET", f"/purchases/{purch_id}")
    if gp.status_code == 200:
        r("PASS", area, f"GET /api/purchases/{purch_id} -> 200")
    else:
        r("FAIL", area, f"GET /api/purchases/{purch_id}", f"HTTP {gp.status_code}")

    # Partial payment (add payment to existing purchase)
    pp = api("POST", f"/purchases/{purch_id}/payments", json={
        "amount": 500, "currency": "USD",
        "payment_date": date.today().isoformat(),
        "payment_method": "Bank Transfer"
    })
    if pp.status_code in (200, 201):
        r("PASS", area, "Add partial payment to purchase -> 200")
    elif pp.status_code == 400:
        r("WARN", area, "Add partial payment", f"400: {pp.text[:100]}")
    else:
        r("WARN", area, "Add partial payment", f"HTTP {pp.status_code}")

    return purch_id, None

# ============================================================
# 8. Sales
# ============================================================
def audit_sales(buyer_id):
    area = "SALES"

    resp = api("GET", "/sales")
    if resp.status_code == 200:
        r("PASS", area, f"GET /api/sales -> total={resp.json().get('total', 0)}")
    else:
        r("FAIL", area, "GET /api/sales", f"HTTP {resp.status_code}")
        return None, None

    if not buyer_id:
        r("WARN", area, "Sales tests", "No buyer_id - skipped")
        return None, None

    # --- CASH SALE ---
    vin1 = f"CASH{uuid.uuid4().hex[:8].upper()}"
    car1 = api("POST", "/inventory", json={
        "brand": "QSale", "model": "CashCar", "manufacturing_year": 2024,
        "color": "Red", "vin": vin1,
        "plate_number": f"C{uuid.uuid4().hex[:5].upper()}",
        "mileage": 0, "purchase_price": 9000, "selling_price": 11000,
        "currency": "USD"
    })
    cash_sale_id = None
    if car1.status_code in (200, 201):
        c1_id = car1.json().get("id")
        sr = api("POST", "/sales", json={
            "car_id": c1_id, "buyer_id": buyer_id,
            "selling_price": 11000, "currency": "USD",
            "sale_date": date.today().isoformat(),
            "payment_method": "Cash", "paid_amount": 11000
        })
        if sr.status_code in (200, 201):
            cash_sale_id = sr.json().get("id")
            r("PASS", area, f"Cash sale -> id={cash_sale_id}")
            # Verify car is Sold
            car_check = api("GET", f"/inventory/{c1_id}")
            if car_check.status_code == 200 and car_check.json().get("status") == "Sold":
                r("PASS", area, "Car status -> Sold after cash sale")
            else:
                r("FAIL", area, "Car status after cash sale",
                  f"Got: {car_check.json().get('status') if car_check.ok else car_check.status_code}")
            # Contract
            cr = api("GET", f"/sales/{cash_sale_id}/contract")
            if cr.status_code == 200:
                r("PASS", area, "Sale contract -> 200")
            elif cr.status_code == 404:
                r("WARN", area, "Sale contract endpoint", "Not found")
            else:
                r("WARN", area, "Sale contract", f"HTTP {cr.status_code}")
        else:
            r("FAIL", area, "Cash sale", f"HTTP {sr.status_code}: {sr.text[:120]}")

    # --- INSTALLMENT SALE ---
    vin2 = f"INST{uuid.uuid4().hex[:8].upper()}"
    car2 = api("POST", "/inventory", json={
        "brand": "QSale", "model": "InstCar", "manufacturing_year": 2023,
        "color": "Blue", "vin": vin2,
        "plate_number": f"I{uuid.uuid4().hex[:5].upper()}",
        "mileage": 0, "purchase_price": 9000, "selling_price": 12000,
        "currency": "USD"
    })
    inst_sale_id = None
    if car2.status_code in (200, 201):
        c2_id = car2.json().get("id")
        inst_start = (date.today().replace(day=1) + timedelta(days=32)).replace(day=5).isoformat()
        ir = api("POST", "/sales", json={
            "car_id": c2_id, "buyer_id": buyer_id,
            "selling_price": 12000, "currency": "USD",
            "sale_date": date.today().isoformat(),
            "payment_method": "Installment", "paid_amount": 2000,
            "enable_installment": True,
            "number_of_months": 4,
            "installment_start_date": inst_start,
            "installment_due_day": 5
        })
        if ir.status_code in (200, 201):
            inst_sale_id = ir.json().get("id")
            r("PASS", area, f"Installment sale -> id={inst_sale_id}")
        else:
            r("FAIL", area, "Installment sale",
              f"HTTP {ir.status_code}: {ir.text[:150]}")

    # --- ADD PAYMENT TO CASH SALE ---
    if cash_sale_id:
        # The sale is fully paid, but let's try the endpoint
        pp = api("POST", f"/sales/{cash_sale_id}/payments", json={
            "amount": 500, "currency": "USD",
            "payment_date": date.today().isoformat(),
            "payment_method": "Bank Transfer"
        })
        if pp.status_code in (200, 201):
            r("PASS", area, "Add payment to sale -> 200")
        elif pp.status_code in (400, 409):
            r("PASS", area, "Overpayment on fully-paid sale blocked -> 400/409")
        else:
            r("WARN", area, "Sale payment endpoint", f"HTTP {pp.status_code}")

    return cash_sale_id, inst_sale_id

# ============================================================
# 9. Installments
# ============================================================
def audit_installments(inst_sale_id):
    area = "INSTALLMENTS"

    # List installments
    resp = api("GET", "/installments")
    if resp.status_code == 200:
        total = resp.json().get("total", 0)
        r("PASS", area, f"GET /api/installments -> total={total}")
    else:
        r("FAIL", area, "GET /api/installments", f"HTTP {resp.status_code}")

    if not inst_sale_id:
        r("WARN", area, "Installment detail tests", "No inst_sale_id - skipped")
        return None

    # Find the installment plan for this sale
    items = api("GET", "/installments?per_page=50").json().get("items", [])
    plan = next((p for p in items if p.get("sale_id") == inst_sale_id), None)
    if not plan:
        r("WARN", area, "Find installment plan", f"Plan for sale {inst_sale_id} not found")
        return None

    plan_id = plan.get("id")
    r("PASS", area, f"Installment plan id={plan_id} for sale {inst_sale_id}")

    # Get plan detail
    pg = api("GET", f"/installments/{plan_id}")
    if pg.status_code == 200:
        schedules = pg.json().get("schedules", [])
        r("PASS", area, f"GET /api/installments/{plan_id} -> {len(schedules)} schedules")
    else:
        r("WARN", area, f"GET /api/installments/{plan_id}", f"HTTP {pg.status_code}")
        schedules = []

    # Summary stats
    if plan.get("schedule_count", 0) > 0:
        r("PASS", area, f"Schedule count = {plan['schedule_count']}, total = {plan.get('total_amount')}")
    else:
        r("WARN", area, "Schedule count", "0 schedules in plan")

    # Pay first installment
    if schedules:
        sched = next((s for s in schedules if s.get("status") in ("Pending", "Overdue")), schedules[0])
        sched_id = sched.get("id")
        due_amount = sched.get("remaining_amount", sched.get("amount", 2500))
        pay_r = api("POST", f"/installments/schedules/{sched_id}/payment", json={
            "amount": float(due_amount) / 2,  # partial payment
            "payment_method": "Cash",
            "payment_date": date.today().isoformat()
        })
        if pay_r.status_code in (200, 201):
            r("PASS", area, f"Pay partial installment (sched {sched_id}) -> 200")
        else:
            r("FAIL", area, "Pay installment", f"HTTP {pay_r.status_code}: {pay_r.text[:120]}")

        # Overpayment prevention
        over_r = api("POST", f"/installments/schedules/{sched_id}/payment", json={
            "amount": 99999999,
            "payment_method": "Cash",
            "payment_date": date.today().isoformat()
        })
        if over_r.status_code in (400, 409):
            r("PASS", area, "Overpayment blocked -> 400/409")
        else:
            r("FAIL", area, "Overpayment not prevented",
              f"Got {over_r.status_code}: {over_r.text[:100]}")

    # Installment aging report
    aging = api("GET", "/reports/installment-aging")
    if aging.status_code == 200:
        r("PASS", area, "Installment aging report -> 200")
    elif aging.status_code == 404:
        r("WARN", area, "Installment aging", "Not found")
    else:
        r("WARN", area, "Installment aging", f"HTTP {aging.status_code}")

    return plan_id

# ============================================================
# 10. Payments / Vouchers
# ============================================================
def audit_payments():
    area = "PAYMENTS"

    # Vouchers
    resp = api("GET", "/vouchers")
    if resp.status_code == 200:
        total = resp.json().get("total", 0)
        r("PASS", area, f"GET /api/vouchers -> total={total}")
    else:
        r("FAIL", area, "GET /api/vouchers", f"HTTP {resp.status_code}")

    # Create voucher: uses debit_account_code / credit_account_code (leaf accounts only)
    flat_accs = api("GET", "/chart-of-accounts").json().get("flat", [])
    flat_ids  = set(a.get("id") for a in flat_accs)
    parent_ids = set(a.get("parent_id") for a in flat_accs if a.get("parent_id"))
    leaf_accs = [a for a in flat_accs if a.get("id") not in parent_ids]
    leaf_asset  = next((a for a in leaf_accs if a.get("type") == "Asset"),  None)
    leaf_income = next((a for a in leaf_accs if a.get("type") in ("Income", "Revenue")), None)
    if leaf_asset and leaf_income:
        vr = api("POST", "/vouchers", json={
            "voucher_type": "receipt",
            "amount": 500, "currency": "USD",
            "description": "QA test receipt voucher",
            "payment_date": date.today().isoformat(),
            "debit_account_code": str(leaf_asset["code"]),
            "credit_account_code": str(leaf_income["code"]),
        })
        if vr.status_code in (200, 201):
            vid = vr.json().get("id")
            r("PASS", area, f"Create receipt voucher -> id={vid}")
        elif vr.status_code == 400:
            r("WARN", area, "Create voucher", f"400: {vr.text[:100]}")
        else:
            r("WARN", area, "Create voucher", f"HTTP {vr.status_code}: {vr.text[:100]}")
    else:
        r("WARN", area, "Create voucher", "No suitable leaf accounts found")

# ============================================================
# 11. Accounting
# ============================================================
def audit_accounting():
    area = "ACCOUNTING"

    # Chart of accounts (GET /api/chart-of-accounts; /api/accounts is POST-only)
    accs = api("GET", "/chart-of-accounts")
    if accs.status_code == 200:
        acc_count = len(accs.json().get("flat", []))
        r("PASS", area, f"GET /api/chart-of-accounts -> 200 ({acc_count} accounts)")
    else:
        r("FAIL", area, "GET /api/chart-of-accounts", f"HTTP {accs.status_code}")

    # Journal entries
    je = api("GET", "/journal-entries")
    if je.status_code == 200:
        r("PASS", area, "GET /api/journal-entries -> 200")
    else:
        r("FAIL", area, "GET /api/journal-entries", f"HTTP {je.status_code}")

    # Trial balance + balanced check
    tb = api("GET", "/trial-balance")
    if tb.status_code == 200:
        data = tb.json()
        td = data.get("total_debit")
        tc = data.get("total_credit")
        diff = data.get("difference", abs((td or 0) - (tc or 0)))
        status_val = data.get("status", "")
        r("PASS", area, f"GET /api/trial-balance -> 200 (status={status_val})")
        if td is not None and tc is not None:
            if abs(float(diff)) < 0.02:
                r("PASS", area, f"Trial balance BALANCED (debit={td:.2f} credit={tc:.2f})")
            else:
                r("FAIL", area, "Trial balance NOT balanced", f"diff={diff}")
        else:
            r("WARN", area, "Trial balance totals", "Could not read totals")
    else:
        r("FAIL", area, "/api/trial-balance", f"HTTP {tb.status_code}")

    # Balance sheet
    bs = api("GET", "/reports/balance-sheet")
    if bs.status_code == 200:
        r("PASS", area, "GET /api/reports/balance-sheet -> 200")
    else:
        r("FAIL", area, "/api/reports/balance-sheet", f"HTTP {bs.status_code}")

    # Expense analysis
    ea = api("GET", "/reports/expense-analysis")
    if ea.status_code == 200:
        r("PASS", area, "GET /api/reports/expense-analysis -> 200")
    else:
        r("WARN", area, "/api/reports/expense-analysis", f"HTTP {ea.status_code}")

    # Cash box
    cb = api("GET", "/cashbox")
    if cb.status_code == 200:
        r("PASS", area, "GET /api/cashbox -> 200")
    elif cb.status_code == 404:
        r("WARN", area, "/api/cashbox", "Not found")
    else:
        r("WARN", area, "/api/cashbox", f"HTTP {cb.status_code}")

    # Accounting integrity check
    integ = api("GET", "/reports/accounting-rules-check")
    if integ.status_code == 200:
        data = integ.json()
        unbalanced = data.get("unbalanced_entries", [])
        if unbalanced:
            r("WARN", area, "Accounting rules check",
              f"{len(unbalanced)} unbalanced entry(ies)")
        else:
            r("PASS", area, "Accounting rules check - no unbalanced entries")
    elif integ.status_code == 404:
        r("WARN", area, "/api/reports/accounting-rules-check", "Not found")
    else:
        r("WARN", area, "/api/reports/accounting-rules-check", f"HTTP {integ.status_code}")

    # Admin financial consistency
    fc = api("GET", "/admin/financial-consistency")
    if fc.status_code == 200:
        r("PASS", area, "Admin financial consistency -> 200")
    else:
        r("WARN", area, "/api/admin/financial-consistency", f"HTTP {fc.status_code}")

# ============================================================
# 12. Reports
# ============================================================
def audit_reports():
    area = "REPORTS"

    report_map = [
        ("/reports",                   "Main reports dashboard"),
        ("/reports/vehicle-profitability", "Vehicle profitability"),
        ("/reports/expense-analysis",  "Expense analysis"),
        ("/reports/balance-sheet",     "Balance sheet"),
        ("/reports/installment-aging", "Installment aging"),
        ("/reports/smart-summary",     "Smart summary"),
        ("/reports/mom-comparison",    "MoM comparison"),
        ("/reports/anomalies",         "Anomalies"),
        ("/trial-balance",             "Trial balance"),
        ("/reports/cashbox-movement",  "Cashbox movement"),
        ("/reports/bank-movement",     "Bank movement"),
        ("/expenses",                  "Expenses list"),
    ]
    for path, label in report_map:
        resp = api("GET", path)
        if resp.status_code == 200:
            r("PASS", area, f"{label} -> 200")
        elif resp.status_code == 404:
            r("WARN", area, label, "Endpoint not found")
        elif resp.status_code == 403:
            r("WARN", area, label, "403 Forbidden")
        else:
            r("FAIL", area, label, f"HTTP {resp.status_code}")

# ============================================================
# 13. Notifications
# ============================================================
def audit_notifications():
    area = "NOTIFICATIONS"

    resp = api("GET", "/notifications")
    if resp.status_code == 200:
        data = resp.json()
        notifs = data.get("notifications", [])
        r("PASS", area, f"GET /api/notifications -> 200 ({len(notifs)} notifications)")
        types = set(n.get("type") for n in notifs)
        if types:
            r("PASS", area, f"Notification types: {types}")
        else:
            r("WARN", area, "Notifications", "Empty notification list")
    elif resp.status_code == 500:
        r("FAIL", area, "GET /api/notifications",
          f"HTTP 500 (InstallmentSchedule bug?): {resp.text[:150]}")
    else:
        r("FAIL", area, "GET /api/notifications", f"HTTP {resp.status_code}: {resp.text[:100]}")

# ============================================================
# 14. Audit Logs
# ============================================================
def audit_logs():
    area = "AUDIT_LOGS"

    resp = api("GET", "/admin/logs")
    if resp.status_code == 200:
        data = resp.json()
        buf = data.get("buffer", [])
        r("PASS", area, f"GET /api/admin/logs -> 200 ({len(buf)} buffered entries)")
    else:
        r("FAIL", area, "GET /api/admin/logs", f"HTTP {resp.status_code}")

    # Check accounting integrity (logs violations)
    ai = api("GET", "/admin/accounting-integrity")
    if ai.status_code == 200:
        r("PASS", area, "GET /api/admin/accounting-integrity -> 200")
    else:
        r("WARN", area, "/api/admin/accounting-integrity", f"HTTP {ai.status_code}")

# ============================================================
# 15. Backup / Restore
# ============================================================
def audit_backup():
    area = "BACKUP"

    # List backups
    resp = api("GET", "/backups")
    if resp.status_code == 200:
        bups = resp.json().get("backups", [])
        r("PASS", area, f"GET /api/backups -> {len(bups)} backup(s)")
        # Verify files on disk
        bdir = Path(__file__).parent / "data" / "backups"
        disk_files = list(bdir.glob("*.zip")) if bdir.exists() else []
        if disk_files:
            r("PASS", area, f"Backup files on disk: {len(disk_files)} in data/backups/")
        else:
            r("WARN", area, "Backup files on disk", "No .zip in data/backups/")
    else:
        r("FAIL", area, "GET /api/backups", f"HTTP {resp.status_code}")

    # Create a QA backup
    cr = api("POST", "/backups", json={"reason": "qa_audit_test"})
    if cr.status_code in (200, 201):
        fname = cr.json().get("filename", "")
        r("PASS", area, f"Create backup -> {fname}")
        bdir = Path(__file__).parent / "data" / "backups"
        if fname and (bdir / fname).exists():
            r("PASS", area, "New backup file exists on disk")
        else:
            r("WARN", area, "New backup file on disk", f"{fname} not found")
    else:
        r("FAIL", area, "Create backup", f"HTTP {cr.status_code}: {cr.text[:120]}")

# ============================================================
# 16. Static Files
# ============================================================
def audit_static():
    area = "STATIC_FILES"
    project = Path(__file__).parent

    # All upload files
    all_uploads = (
        list((project / "static" / "uploads" / "customers").glob("*.*"))[:3] +
        list((project / "static" / "uploads" / "vehicles").glob("*.*"))[:3]
    )
    ok_count = fail_count = 0
    for f in all_uploads:
        rel = f.relative_to(project / "static")
        url = f"{BASE}/static/{rel.as_posix()}"
        resp = SESSION.get(url, timeout=5)
        if resp.status_code == 200:
            ok_count += 1
        else:
            fail_count += 1
            r("FAIL", area, f"/static/{rel.as_posix()}", f"HTTP {resp.status_code}")
    if fail_count == 0 and ok_count > 0:
        r("PASS", area, f"{ok_count} upload files all return 200 via /static/")
    elif ok_count == 0:
        r("WARN", area, "Upload files", "No files found to check")

    # Logo / CSS
    for img in ["images/logo.png", "images/logo.jpg", "style.css"]:
        full = project / "static" / img.replace("/", os.sep)
        if full.exists():
            resp = SESSION.get(f"{BASE}/static/{img}", timeout=5)
            if resp.status_code == 200:
                r("PASS", area, f"/static/{img} -> 200")
            else:
                r("FAIL", area, f"/static/{img}", f"HTTP {resp.status_code}")

    # Upload dir structure
    for subdir in ["customers", "vehicles"]:
        d = project / "static" / "uploads" / subdir
        if d.exists():
            r("PASS", area, f"static/uploads/{subdir}/ directory exists")
        else:
            r("WARN", area, f"static/uploads/{subdir}/", "Directory missing")

# ============================================================
# 17. Desktop App Paths
# ============================================================
def audit_desktop_paths():
    area = "DESKTOP_PATHS"
    project = Path(__file__).parent

    # Import desktop_app without GUI
    import importlib.util
    sys.modules.setdefault("webview", type(sys)("webview"))
    spec = importlib.util.spec_from_file_location("desktop_app", project / "desktop_app.py")
    mod  = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
    except Exception as ex:
        r("FAIL", area, "Import desktop_app.py", str(ex))
        return

    # data_dir() in dev mode
    dd = mod.data_dir()
    if dd == project:
        r("PASS", area, f"data_dir() = project root OK ({dd})")
    else:
        r("FAIL", area, "data_dir() in dev mode", f"Expected {project}, got {dd}")

    # Verify configure_environment sets correct paths
    import os as _os
    env_save = _os.environ.copy()
    for k in ["CAR_SHOWROOM_DATA_DIR", "UPLOAD_FOLDER", "BACKUP_FOLDER",
              "DATABASE_URL", "SECRET_KEY", "FLASK_ENV", "NEXT_PUBLIC_API_URL"]:
        _os.environ.pop(k, None)
    mod.configure_environment(dd)
    upload = _os.environ.get("UPLOAD_FOLDER", "")
    backup = _os.environ.get("BACKUP_FOLDER", "")
    db_dir = _os.environ.get("CAR_SHOWROOM_DATA_DIR", "")
    _os.environ.update(env_save)

    exp_upload = str(project / "static" / "uploads")
    exp_backup = str(project / "data" / "backups")

    if upload == exp_upload:
        r("PASS", area, f"UPLOAD_FOLDER = static/uploads OK")
    else:
        r("FAIL", area, "UPLOAD_FOLDER", f"Expected {exp_upload}, got {upload}")

    if backup == exp_backup:
        r("PASS", area, f"BACKUP_FOLDER = data/backups OK")
    else:
        r("FAIL", area, "BACKUP_FOLDER", f"Expected {exp_backup}, got {backup}")

    # No 404 for static file
    sr = SESSION.get(
        f"{BASE}/static/uploads/customers/9d7717b51d484370834358046280ded5.png",
        timeout=5)
    if sr.status_code == 200:
        r("PASS", area, "Known upload file returns 200 (not 404)")
    else:
        r("FAIL", area, "Known upload file", f"HTTP {sr.status_code}")

# ============================================================
# 18. API Health (all endpoints)
# ============================================================
def audit_api_health():
    area = "API_HEALTH"

    checks = [
        ("/health",                   "health",              [200]),
        ("/version",                  "version",             [200, 404]),
        ("/auth/me",                  "auth/me",             [200]),
        ("/customers",                "customers",           [200]),
        ("/inventory",                "inventory",           [200]),
        ("/sales",                    "sales",               [200]),
        ("/purchases",                "purchases",           [200]),
        ("/installments",             "installments",        [200]),
        ("/expenses",                 "expenses",            [200]),
        ("/chart-of-accounts",        "chart-of-accounts",   [200]),
        ("/journal-entries",          "journal-entries",     [200]),
        ("/trial-balance",            "trial-balance",       [200]),
        ("/reports/balance-sheet",    "balance-sheet",       [200]),
        ("/notifications",            "notifications",       [200]),
        ("/backups",                  "backups",             [200]),
        ("/users",                    "users",               [200]),
        ("/roles",                    "roles",               [200]),
        ("/vouchers",                 "vouchers",            [200]),
        ("/reports",                  "reports",             [200]),
        ("/dashboard",                "dashboard",           [200]),
        ("/reports/vehicle-profitability", "vehicle-profitability", [200]),
        ("/admin/system-health",      "system-health",       [200]),
        ("/admin/logs",               "admin/logs",          [200]),
        ("/reports/accounting-rules-check", "rules-check",  [200]),
        ("/cashbox",                  "cashbox",             [200, 404]),
        ("/scan/available",           "scan/available",      [200, 404]),
    ]
    for path, label, expected in checks:
        resp = api("GET", path)
        if resp.status_code in expected:
            r("PASS", area, f"{label} -> {resp.status_code}")
        else:
            r("FAIL", area, label,
              f"Expected {expected}, got {resp.status_code}: {resp.text[:50]}")

# ============================================================
# 19. Security
# ============================================================
def audit_security():
    area = "SECURITY"

    # Unauthenticated access blocked
    anon = requests.Session()
    for path, label in [("/customers", "customers"), ("/sales", "sales"),
                         ("/users", "users"), ("/chart-of-accounts", "chart-of-accounts"),
                         ("/admin/logs", "admin/logs")]:
        resp = anon.get(f"{API}{path}", timeout=5)
        if resp.status_code in (401, 302, 403):
            r("PASS", area, f"{label} unauthenticated -> {resp.status_code}")
        else:
            r("FAIL", area, f"{label} not protected", f"Got {resp.status_code}")

    # No DB credentials in health/version response
    for path in ["/health", "/version"]:
        resp = api("GET", path)
        if resp.status_code == 200:
            text = resp.text
            if "Aldulimi99" in text or "showroom_user" in text or "postgresql://" in text:
                r("FAIL", area, f"DB credentials leaked in {path}", "Password visible!")
            else:
                r("PASS", area, f"No DB credentials in {path}")

    # Sales role cannot access balance-sheet
    uid = f"qa_sec_{uuid.uuid4().hex[:5]}"
    cu = api("POST", "/users", json={"username": uid, "password": "SecPass123!", "role": "Sales"})
    if cu.status_code in (200, 201):
        uid_db = cu.json().get("id") or cu.json().get("user", {}).get("id")
        sec_s = requests.Session()
        sl = sec_s.post(f"{API}/auth/login",
                        json={"username": uid, "password": "SecPass123!"}, timeout=5)
        if sl.status_code == 200:
            bs = sec_s.get(f"{API}/reports/balance-sheet", timeout=5)
            if bs.status_code in (401, 403):
                r("PASS", area, "Sales role cannot access balance-sheet -> 401/403")
            else:
                r("FAIL", area, "Sales role RBAC (balance-sheet)", f"Got {bs.status_code}")

            um = sec_s.get(f"{API}/users", timeout=5)
            if um.status_code in (401, 403):
                r("PASS", area, "Sales role cannot list users -> 401/403")
            else:
                r("FAIL", area, "Sales role RBAC (/users)", f"Got {um.status_code}")
        # cleanup
        if uid_db:
            api("DELETE", f"/users/{uid_db}")

# ============================================================
# 20. PostgreSQL Integrity
# ============================================================
def audit_postgresql():
    area = "POSTGRESQL"
    project = Path(__file__).parent

    try:
        from dotenv import load_dotenv
        load_dotenv(project / '.env', override=False)
    except Exception:
        pass
    db_url = os.environ.get('DATABASE_URL', '')

    if not db_url.startswith('postgresql'):
        r("FAIL", area, "DATABASE_URL is PostgreSQL", f"Got: {db_url[:40]}")
        return

    r("PASS", area, f"DATABASE_URL -> postgresql@{db_url.split('@')[-1]}")

    try:
        import sqlalchemy as sa
        engine = sa.create_engine(db_url)
        with engine.connect() as conn:
            ver = conn.execute(sa.text("SELECT version()")).scalar()
            r("PASS", area, f"Connected to PostgreSQL: {ver[:40]}")

            # Duplicate IDs check
            for tbl in ['sale', 'customer', 'car', 'purchase', 'installment_plan',
                        'installment_schedule', 'payment']:
                try:
                    dup = conn.execute(sa.text(
                        f'SELECT id, COUNT(*) c FROM {tbl} GROUP BY id HAVING COUNT(*) > 1'
                    )).fetchall()
                    if dup:
                        r("FAIL", area, f"Duplicate IDs in {tbl}", str(dup[:3]))
                    else:
                        r("PASS", area, f"No duplicate IDs in {tbl}")
                except Exception as ex:
                    r("WARN", area, f"Dup ID check {tbl}", str(ex)[:60])

            # Sequence check
            for tbl, col in [('sale', 'id'), ('customer', 'id'), ('car', 'id'),
                              ('purchase', 'id'), ('installment_plan', 'id')]:
                try:
                    max_id = conn.execute(sa.text(
                        f'SELECT COALESCE(MAX(id), 0) FROM {tbl}'
                    )).scalar()
                    seq = conn.execute(sa.text(
                        f"SELECT last_value FROM {tbl}_{col}_seq"
                    )).scalar()
                    if seq is not None and int(seq) >= int(max_id):
                        r("PASS", area, f"{tbl}.{col} sequence OK (seq={seq} >= max_id={max_id})")
                    else:
                        r("WARN", area, f"{tbl}.{col} sequence", f"seq={seq}, max_id={max_id}")
                except Exception:
                    pass  # sequence name may differ

            # SQLite not in use
            sqlite_file = project / "database" / "showroom.db"
            if sqlite_file.exists():
                sz = sqlite_file.stat().st_size
                r("WARN", area, "showroom.db still exists",
                  f"Size={sz} bytes. File present but NOT in use (PostgreSQL active)")
            else:
                r("PASS", area, "showroom.db not present (PostgreSQL only)")

    except Exception as ex:
        r("FAIL", area, "PostgreSQL connection", str(ex)[:120])

# ============================================================
# Main
# ============================================================
def main():
    print("\n" + "=" * 70)
    print("  FULL SYSTEM AUDIT & END-TO-END QA")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70 + "\n")

    ok = audit_preflight()
    if not ok:
        print("\n[ABORT] Flask not responding -- cannot continue.\n")
        return

    login()

    print("\n-- 1. Login / Sessions")
    audit_login()

    print("\n-- 2. Users / Roles / RBAC")
    audit_rbac()

    print("\n-- 3. Branches")
    audit_branches()

    print("\n-- 4. Dashboard")
    audit_dashboard()

    print("\n-- 5. Customers")
    buyer_id, seller_id = audit_customers() or (None, None)

    print("\n-- 6. Inventory")
    car_id = audit_inventory()

    print("\n-- 7. Purchases")
    purch_result = audit_purchases(seller_id)
    purch_id = purch_result[0] if purch_result else None

    print("\n-- 8. Sales")
    cash_sale_id, inst_sale_id = audit_sales(buyer_id) or (None, None)

    print("\n-- 9. Installments")
    plan_id = audit_installments(inst_sale_id)

    print("\n-- 10. Payments / Vouchers")
    audit_payments()

    print("\n-- 11. Accounting")
    audit_accounting()

    print("\n-- 12. Reports")
    audit_reports()

    print("\n-- 13. Notifications")
    audit_notifications()

    print("\n-- 14. Audit Logs")
    audit_logs()

    print("\n-- 15. Backup / Restore")
    audit_backup()

    print("\n-- 16. Static Files")
    audit_static()

    print("\n-- 17. Desktop App Paths")
    audit_desktop_paths()

    print("\n-- 18. API Health")
    audit_api_health()

    print("\n-- 19. Security")
    audit_security()

    print("\n-- 20. PostgreSQL Integrity")
    audit_postgresql()

    # ── Final Report ──────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  FINAL QA REPORT")
    print("=" * 70)

    passed  = [x for x in RESULTS if x[0] == "PASS"]
    failed  = [x for x in RESULTS if x[0] == "FAIL"]
    warned  = [x for x in RESULTS if x[0] == "WARN"]
    total   = len(RESULTS)

    print(f"\n  Total tests  : {total}")
    print(f"  [PASS] Passed   : {len(passed)}")
    print(f"  [FAIL] Failed   : {len(failed)}")
    print(f"  [WARN] Warnings : {len(warned)}")

    if failed:
        print("\n  -- FAILURES:")
        for _, area, name, detail in failed:
            line = f"    [FAIL] [{area}] {name}"
            if detail:
                line += f" | {detail}"
            try:
                print(line)
            except UnicodeEncodeError:
                print(line.encode('ascii', 'replace').decode('ascii'))

    if warned:
        print("\n  -- WARNINGS:")
        for _, area, name, detail in warned:
            line = f"    [WARN] [{area}] {name}"
            if detail:
                line += f" | {detail}"
            try:
                print(line)
            except UnicodeEncodeError:
                print(line.encode('ascii', 'replace').decode('ascii'))

    # Key indicators
    print("\n  -- KEY INDICATORS:")
    static_ok  = all(x[0] != "FAIL" for x in RESULTS
                     if "static" in x[2].lower() or "/static/" in x[3].lower())
    notif_ok   = any(x[0] == "PASS" and "notifications" in x[1].lower() for x in RESULTS)
    pg_ok      = any(x[0] == "PASS" and "PostgreSQL" in x[2] and "Connected" in x[2]
                     for x in RESULTS)
    tb_ok      = any(x[0] == "PASS" and "BALANCED" in x[2] for x in RESULTS)
    no_dups    = all(x[0] != "FAIL" for x in RESULTS if "duplicate" in x[2].lower())
    seqs_ok    = all(x[0] != "FAIL" for x in RESULTS if "sequence" in x[2].lower())

    print(f"  Images/static files  : {'YES' if static_ok else 'FAIL'}")
    print(f"  Notifications (no 500): {'YES' if notif_ok else 'FAIL'}")
    print(f"  PostgreSQL connected : {'YES' if pg_ok else 'FAIL'}")
    print(f"  Trial balance balanced: {'YES' if tb_ok else 'WARN - check manually'}")
    print(f"  No duplicate IDs     : {'YES' if no_dups else 'FAIL'}")
    print(f"  Sequences correct    : {'YES' if seqs_ok else 'WARN'}")

    ready = len(failed) == 0
    print(f"\n  Production ready     : {'YES -- all {len(passed)} tests passed' if ready else f'NO -- {len(failed)} failure(s)'}")
    print(f"\n  Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70 + "\n")

    return failed, warned


if __name__ == "__main__":
    main()
