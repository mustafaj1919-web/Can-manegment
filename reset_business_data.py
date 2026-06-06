"""
reset_business_data.py
======================
تصفير بيانات البزنس من PostgreSQL مع الإبقاء على إعدادات النظام.

ما يُحذف:
  customer, car, sale, purchase, installment_plan, installment_schedule,
  payment, journal_entry, journal_entry_line, voucher, expense,
  car_photo, customer_document, customer_interaction, vehicle_cost,
  sale_pipeline, employee_commission, employee_target,
  cashbox_close, transaction, audit_log

ما يبقى:
  user, branch, account, role_permission, exchange_rate,
  showroom_info, cost_center, employee

خطوات التنفيذ:
  1. Backup كامل عبر Flask API
  2. عدّ السجلات قبل الحذف
  3. TRUNCATE بالترتيب الصحيح + RESTART IDENTITY
  4. حذف ملفات static/uploads (customers + vehicles)
  5. عدّ السجلات بعد الحذف
  6. فحوصات صحة سريعة
  7. تقرير نهائي
"""

import os
import sys
import shutil
import time
import json
import requests
from pathlib import Path
from datetime import datetime

# ── إعداد البيئة ──────────────────────────────────────────────────────────────
PROJECT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT))

try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT / '.env', override=False)
except ImportError:
    pass

DB_URL  = os.environ.get('DATABASE_URL', '')
BASE    = 'http://localhost:5000'
API     = f'{BASE}/api'

# جداول البزنس بالترتيب الصحيح (FK leaf → root)
BUSINESS_TABLES = [
    # ── الجداول الطرفية أولاً (لا يعتمد عليها أحد من المجموعة) ──
    'payment',
    'employee_commission',
    'sale_pipeline',
    'installment_schedule',
    'journal_entry_line',
    'voucher',
    'vehicle_cost',
    'car_photo',
    'customer_document',
    'customer_interaction',
    'employee_target',
    'cashbox_close',
    'transaction',
    'audit_log',
    'expense',
    # ── ثم الجداول الوسطى ──
    'installment_plan',
    'journal_entry',
    # ── ثم الجداول الأساسية ──
    'sale',
    'purchase',
    # ── ثم الجداول الجذر ──
    'car',
    'customer',
]

# الجداول التي يجب أن تبقى صفراً بعد الحذف (للتحقق)
MUST_BE_ZERO = [
    'customer', 'car', 'sale', 'purchase',
    'installment_plan', 'installment_schedule',
    'payment', 'journal_entry', 'journal_entry_line',
    'voucher', 'expense',
]

# الجداول التي يجب أن تبقى محتفظة بقيمها
MUST_KEEP = [
    'user', 'branch', 'account', 'role_permission',
    'exchange_rate', 'showroom_info', 'cost_center',
]

# ── مساعدات ──────────────────────────────────────────────────────────────────

def log(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode())

def count_rows(conn, table):
    import sqlalchemy as sa
    try:
        return conn.execute(sa.text(f'SELECT COUNT(*) FROM "{table}"')).scalar()
    except Exception:
        return -1

# ── الخطوة 0: تأكد أن Flask شغال ────────────────────────────────────────────

def check_flask():
    try:
        r = requests.get(f'{API}/health', timeout=5)
        return r.status_code == 200
    except Exception:
        return False

# ── الخطوة 1: Backup ─────────────────────────────────────────────────────────

def take_backup(session):
    log('\n[1/7] جاري أخذ backup...')
    r = session.post(f'{API}/backups', json={'reason': 'pre_reset_business_data'}, timeout=60)
    if r.status_code in (200, 201):
        d = r.json()
        fname = d.get('filename', '')
        size  = d.get('size', 0)
        log(f'  [PASS] Backup: {fname} ({size // 1024} KB)')
        return fname
    else:
        log(f'  [FAIL] Backup فشل: HTTP {r.status_code}')
        return None

# ── الخطوة 2: عدّ السجلات قبل الحذف ─────────────────────────────────────────

def count_all(conn, tables):
    return {t: count_rows(conn, t) for t in tables}

# ── الخطوة 3: TRUNCATE ────────────────────────────────────────────────────────

def truncate_business_data(conn):
    import sqlalchemy as sa
    log('\n[3/7] جاري TRUNCATE بيانات البزنس...')

    # نفذ TRUNCATE لكل الجداول دفعة واحدة (PostgreSQL يتعامل مع FKs بينها)
    tables_sql = ', '.join(f'"{t}"' for t in BUSINESS_TABLES)
    try:
        conn.execute(sa.text(f'TRUNCATE {tables_sql} RESTART IDENTITY CASCADE'))
        conn.commit()
        log(f'  [PASS] TRUNCATE نجح لـ {len(BUSINESS_TABLES)} جدول')
        return True
    except Exception as e:
        conn.rollback()
        log(f'  [FAIL] TRUNCATE فشل: {e}')

        # fallback: truncate واحد واحد بالترتيب
        log('  محاولة واحد واحد بالترتيب...')
        for table in BUSINESS_TABLES:
            try:
                conn.execute(sa.text(f'TRUNCATE "{table}" RESTART IDENTITY CASCADE'))
                conn.commit()
                log(f'    [OK] {table}')
            except Exception as e2:
                conn.rollback()
                log(f'    [ERR] {table}: {e2}')
        return True

# ── الخطوة 4: حذف ملفات الصور ────────────────────────────────────────────────

def delete_upload_files():
    log('\n[4/7] جاري حذف ملفات الصور والمرفقات...')
    upload_root = PROJECT / 'static' / 'uploads'

    # المجلدات التي تُحذف محتوياتها
    target_dirs = ['customers', 'vehicles']
    total_deleted = 0

    for subdir in target_dirs:
        d = upload_root / subdir
        if not d.exists():
            log(f'  [SKIP] {subdir}/ غير موجود')
            continue

        files = list(d.glob('*'))
        # احذف الملفات فقط، ابقِ على المجلد نفسه
        count = 0
        for f in files:
            if f.is_file():
                f.unlink()
                count += 1
            elif f.is_dir():
                shutil.rmtree(f)
                count += 1
        total_deleted += count
        log(f'  [PASS] {subdir}/  — حُذف {count} ملف/مجلد')

    log(f'  إجمالي الملفات المحذوفة: {total_deleted}')

    # التأكد من بقاء مجلدات النظام
    for keep_dir in ['images']:
        d = upload_root / keep_dir
        if d.exists():
            log(f'  [OK] static/uploads/{keep_dir}/ محفوظ')
        # بقية مجلدات النظام
    static_images = PROJECT / 'static' / 'images'
    if static_images.exists():
        img_count = len(list(static_images.glob('*.*')))
        log(f'  [OK] static/images/ محفوظ ({img_count} ملف)')

    return total_deleted

# ── الخطوة 5: فحوصات سريعة ───────────────────────────────────────────────────

def run_health_checks(session):
    log('\n[6/7] فحوصات الصحة بعد التصفير...')
    results = []

    def chk(status, name, detail=''):
        results.append((status, name, detail))
        tag = f'  [{status}] {name}'
        if detail:
            tag += f' | {detail}'
        log(tag)

    # Login
    r = session.post(f'{API}/auth/login',
                     json={'username': 'owner', 'password': 'TestPass2024!'})
    chk('PASS' if r.status_code == 200 else 'FAIL', 'Login owner')

    # PostgreSQL فقط
    chk('PASS' if DB_URL.startswith('postgresql') else 'FAIL',
        'PostgreSQL only', DB_URL.split('@')[-1])

    # Dashboard
    r = session.get(f'{API}/dashboard')
    if r.status_code == 200:
        d = r.json()
        stats = d.get('stats', {})
        total_cars = stats.get('total_cars', stats.get('inventory', -1))
        total_sales = stats.get('total_sales', stats.get('sales', -1))
        chk('PASS', f'Dashboard -> 200 (cars={total_cars}, sales={total_sales})')
    else:
        chk('FAIL', 'Dashboard', f'HTTP {r.status_code}')

    # Inventory فارغ
    r = session.get(f'{API}/inventory')
    if r.status_code == 200:
        total = r.json().get('total', -1)
        chk('PASS' if total == 0 else 'FAIL', f'Inventory فارغ (total={total})')
    else:
        chk('FAIL', 'Inventory', f'HTTP {r.status_code}')

    # Customers فارغ
    r = session.get(f'{API}/customers')
    if r.status_code == 200:
        total = r.json().get('total', -1)
        chk('PASS' if total == 0 else 'FAIL', f'Customers فارغ (total={total})')
    else:
        chk('FAIL', 'Customers', f'HTTP {r.status_code}')

    # Sales فارغة
    r = session.get(f'{API}/sales')
    if r.status_code == 200:
        total = r.json().get('total', -1)
        chk('PASS' if total == 0 else 'FAIL', f'Sales فارغة (total={total})')
    else:
        chk('FAIL', 'Sales', f'HTTP {r.status_code}')

    # Purchases فارغة
    r = session.get(f'{API}/purchases')
    if r.status_code == 200:
        total = r.json().get('total', -1)
        chk('PASS' if total == 0 else 'FAIL', f'Purchases فارغة (total={total})')
    else:
        chk('FAIL', 'Purchases', f'HTTP {r.status_code}')

    # Installments فارغة
    r = session.get(f'{API}/installments')
    if r.status_code == 200:
        total = r.json().get('total', -1)
        chk('PASS' if total == 0 else 'FAIL', f'Installments فارغة (total={total})')
    else:
        chk('FAIL', 'Installments', f'HTTP {r.status_code}')

    # Trial Balance متوازن (يجب أن يكون صفر/متوازن بعد حذف القيود)
    r = session.get(f'{API}/trial-balance')
    if r.status_code == 200:
        d = r.json()
        td   = float(d.get('total_debit',  0) or 0)
        tc   = float(d.get('total_credit', 0) or 0)
        diff = abs(td - tc)
        if diff < 0.02:
            chk('PASS', f'Trial Balance متوازن (debit={td:,.2f} == credit={tc:,.2f})')
        else:
            chk('FAIL', 'Trial Balance', f'diff={diff:.2f}')
    else:
        chk('FAIL', 'Trial Balance', f'HTTP {r.status_code}')

    # Balance Sheet
    r = session.get(f'{API}/reports/balance-sheet')
    chk('PASS' if r.status_code == 200 else 'FAIL',
        f'Balance Sheet -> {r.status_code}')

    # Notifications (لا 500)
    r = session.get(f'{API}/notifications')
    chk('PASS' if r.status_code == 200 else 'FAIL',
        f'Notifications -> {r.status_code}')

    # Chart of Accounts محفوظ
    r = session.get(f'{API}/chart-of-accounts')
    if r.status_code == 200:
        acc_count = len(r.json().get('flat', []))
        chk('PASS' if acc_count > 0 else 'FAIL',
            f'Chart of Accounts محفوظ ({acc_count} حساب)')
    else:
        chk('FAIL', 'Chart of Accounts', f'HTTP {r.status_code}')

    passed = sum(1 for s, *_ in results if s == 'PASS')
    failed = sum(1 for s, *_ in results if s == 'FAIL')
    return passed, failed

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    log('=' * 68)
    log('  تصفير بيانات البزنس — Car Showroom Management System')
    log(f'  {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    log('=' * 68)

    # تحقق من Flask
    if not check_flask():
        log('\n[ABORT] Flask غير متاح على localhost:5000 — شغّل start_flask_qa.py أولاً')
        return

    if not DB_URL.startswith('postgresql'):
        log(f'\n[ABORT] DATABASE_URL ليس PostgreSQL: {DB_URL[:40]}')
        return

    # Session للـ API
    session = requests.Session()

    # ── Login ─────────────────────────────────────────────────────────────────
    log('\n[0/7] تسجيل دخول...')
    lr = session.post(f'{API}/auth/login',
                      json={'username': 'owner', 'password': 'TestPass2024!'}, timeout=10)
    if lr.status_code != 200:
        log(f'  [ABORT] فشل Login: HTTP {lr.status_code}')
        return
    log('  [PASS] Login owner نجح')

    # ── Backup ────────────────────────────────────────────────────────────────
    backup_fname = take_backup(session)
    if not backup_fname:
        log('\n[ABORT] فشل الـ Backup — لن يتم الحذف للسلامة.')
        return
    log(f'  الـ Backup محفوظ: {backup_fname}')

    # ── عدّ قبل الحذف ─────────────────────────────────────────────────────────
    log('\n[2/7] عدّ السجلات قبل الحذف...')
    import sqlalchemy as sa
    engine = sa.create_engine(DB_URL)

    all_tables = BUSINESS_TABLES + MUST_KEEP
    with engine.connect() as conn:
        before = count_all(conn, all_tables)

    log('  جداول البزنس (ستُحذف):')
    for t in BUSINESS_TABLES:
        if before.get(t, 0) > 0:
            log(f'    {t:30s}: {before[t]}')
    log('  جداول النظام (ستبقى):')
    for t in MUST_KEEP:
        log(f'    {t:30s}: {before.get(t, 0)}')

    # ── TRUNCATE ──────────────────────────────────────────────────────────────
    with engine.connect() as conn:
        ok = truncate_business_data(conn)
    if not ok:
        log('\n[ABORT] فشل TRUNCATE')
        return

    # ── حذف الصور ─────────────────────────────────────────────────────────────
    total_files = delete_upload_files()

    # ── عدّ بعد الحذف ─────────────────────────────────────────────────────────
    log('\n[5/7] عدّ السجلات بعد الحذف...')
    with engine.connect() as conn:
        after = count_all(conn, all_tables)

    errors_after = []
    for t in MUST_BE_ZERO:
        cnt = after.get(t, -1)
        if cnt != 0:
            errors_after.append(f'{t}={cnt}')
    for t in MUST_KEEP:
        b = before.get(t, 0)
        a = after.get(t, 0)
        if a != b:
            log(f'  [WARN] {t} تغيّر: {b} -> {a}')

    # ── فحوصات الصحة ──────────────────────────────────────────────────────────
    passed, failed = run_health_checks(session)

    # ── Backup نهائي بعد التصفير ──────────────────────────────────────────────
    log('\n[7/7] أخذ backup نهائي بعد التصفير...')
    r = session.post(f'{API}/backups', json={'reason': 'post_reset_clean_state'}, timeout=60)
    post_backup = r.json().get('filename', '?') if r.status_code in (200, 201) else 'FAILED'
    log(f'  Post-reset backup: {post_backup}')

    # ── التقرير النهائي ────────────────────────────────────────────────────────
    log('\n' + '=' * 68)
    log('  التقرير النهائي')
    log('=' * 68)

    log('\n  قبل / بعد الحذف:')
    log(f'  {"الجدول":30s} {"قبل":>8} {"بعد":>8} {"الحالة":>10}')
    log('  ' + '-' * 60)
    for t in BUSINESS_TABLES:
        b = before.get(t, 0)
        a = after.get(t, 0)
        status = 'مُصفَّر' if a == 0 else f'تبقّى {a}'
        log(f'  {t:30s} {b:>8} {a:>8} {status:>10}')

    log('\n  جداول النظام المحفوظة:')
    log(f'  {"الجدول":30s} {"قبل":>8} {"بعد":>8}')
    log('  ' + '-' * 50)
    for t in MUST_KEEP:
        b = before.get(t, 0)
        a = after.get(t, 0)
        status = '' if a == b else ' [تغيّر!]'
        log(f'  {t:30s} {b:>8} {a:>8}{status}')

    log(f'\n  ملفات الصور المحذوفة : {total_files}')
    log(f'  Backup قبل الحذف    : {backup_fname}')
    log(f'  Backup بعد الحذف    : {post_backup}')
    log(f'\n  فحوصات الصحة: {passed} نجاح, {failed} فشل')

    if errors_after:
        log(f'\n  [WARN] جداول لم تُصفَّر: {", ".join(errors_after)}')
    else:
        log('\n  [PASS] جميع جداول البزنس = 0')

    is_clean = (failed == 0 and not errors_after)
    log(f'\n  حالة النظام: {"نظيف كالجديد تماماً" if is_clean else "يحتاج مراجعة"}')
    log('=' * 68 + '\n')


if __name__ == '__main__':
    main()
