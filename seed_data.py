"""Add initial branches and customers"""
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=False)
sys.path.insert(0, str(BASE_DIR))

from backend.config import Config
from sqlalchemy import create_engine, text

engine = create_engine(Config.SQLALCHEMY_DATABASE_URI, future=True)

BRANCHES = [
    {"name": "الأصدقاء",   "is_main": True},
    {"name": "الأصدقاء 2", "is_main": False},
]

SELLERS = [
    "انور",
    "شركة علي طاهر",
    "سامر معرض الفياض",
    "شركة ذرى الخليج",
    "عمر نجم معرض اللقاء",
    "شركة ذرى الخليج 2",
]

with engine.connect() as conn:
    txn = conn.begin()
    try:
        # أضف الفروع
        for b in BRANCHES:
            exists = conn.execute(
                text("SELECT id FROM branch WHERE name = :n"), {"n": b["name"]}
            ).fetchone()
            if not exists:
                conn.execute(
                    text("INSERT INTO branch (name, is_main, created_at) VALUES (:n, :m, NOW())"),
                    {"n": b["name"], "m": b["is_main"]},
                )
                print(f"  Branch: {b['name']}")

        # أضف الزبائن (بائعين) بدون فرع محدد — يظهرون في الفرعين
        for i, name in enumerate(SELLERS, start=1):
            id_num = f"SELLER-{i:03d}"
            exists = conn.execute(
                text("SELECT id FROM customer WHERE id_number = :n"), {"n": id_num}
            ).fetchone()
            if not exists:
                conn.execute(
                    text("""
                        INSERT INTO customer
                            (name, full_name, phone, id_number, customer_type, created_at)
                        VALUES
                            (:name, :name, '0000000000', :id_num, 'seller', NOW())
                    """),
                    {"name": name, "id_num": id_num},
                )
                print(f"  Seller: {name}")

        txn.commit()
        print("\nDone!")
    except Exception as e:
        txn.rollback()
        print(f"Error: {e}")
        sys.exit(1)
