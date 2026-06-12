"""
account_map.py — المصدر الوحيد لأسماء حسابات دفتر الأستاذ.

كل رمز حساب يُعرَّف هنا مرة واحدة.
باقي الكود يستورد من هنا ولا يستخدم قيماً نصية مباشرة.
"""

# ── أصول ─────────────────────────────────────────────────────────────────────
CASH_ACCOUNT   = '111001'   # الصندوق الرئيسي (نقد)
BANK_ACCOUNT   = '112001'   # البنك
AR_ACCOUNT     = '113002'   # الذمم المدينة — تقسيط / بيع آجل
INVENTORY_NEW  = '115001'   # مخزون سيارات جديدة
INVENTORY_USED = '115002'   # مخزون سيارات مستعملة

# ── مطلوبات ───────────────────────────────────────────────────────────────────
AP_ACCOUNT     = '211001'   # ذمم دائنة — موردو السيارات

# ── إيرادات ───────────────────────────────────────────────────────────────────
REVENUE_NEW_CAR  = '410001'  # إيرادات بيع سيارات جديدة
REVENUE_USED_CAR = '410002'  # إيرادات بيع سيارات مستعملة

# ── تكلفة البضاعة المباعة ─────────────────────────────────────────────────────
COGS_ACCOUNT   = '360001'   # تكلفة سيارات مباعة (موحَّد لجديدة ومستعملة)

# ── مصروفات ───────────────────────────────────────────────────────────────────
EXPENSE_SALARY       = '310001'  # رواتب
EXPENSE_RENT         = '320001'  # إيجار
EXPENSE_ELECTRICITY  = '320002'  # كهرباء
EXPENSE_WATER        = '320003'  # ماء
EXPENSE_INTERNET     = '320004'  # إنترنت
EXPENSE_PHONE        = '320005'  # هاتف
EXPENSE_FUEL         = '350001'  # وقود
EXPENSE_HOSTING      = '350002'  # استضافة
EXPENSE_STATIONERY   = '350003'  # قرطاسية
EXPENSE_MAINTENANCE  = '350004'  # صيانة
EXPENSE_DEVICE_MAINT = '350005'  # صيانة أجهزة
EXPENSE_GOVERNMENT   = '350006'  # رسوم حكومية
EXPENSE_BANKING      = '350007'  # مصاريف بنكية
EXPENSE_ADVERTISING  = '340001'  # دعاية وإعلان
EXPENSE_COMMISSION   = '340004'  # عمولات
EXPENSE_SHIPPING     = '330003'  # شحن السيارات
EXPENSE_CLEARANCE    = '330004'  # تخليص كمركي
EXPENSE_INSPECTION   = '330005'  # فحص السيارات
EXPENSE_PREPARATION  = '330006'  # تجهيز السيارات
EXPENSE_MISC         = '350009'  # مصاريف متنوعة (الافتراضي للتصنيفات غير المعروفة)

# ── خرائط التصنيف ─────────────────────────────────────────────────────────────

EXPENSE_CATEGORY_ACCOUNTS: dict[str, str] = {
    'salary':             EXPENSE_SALARY,
    'rent':               EXPENSE_RENT,
    'electricity':        EXPENSE_ELECTRICITY,
    'water':              EXPENSE_WATER,
    'internet':           EXPENSE_INTERNET,
    'phone':              EXPENSE_PHONE,
    'fuel':               EXPENSE_FUEL,
    'hosting':            EXPENSE_HOSTING,
    'stationery':         EXPENSE_STATIONERY,
    'maintenance':        EXPENSE_MAINTENANCE,
    'device_maintenance': EXPENSE_DEVICE_MAINT,
    'government':         EXPENSE_GOVERNMENT,
    'banking':            EXPENSE_BANKING,
    'advertising':        EXPENSE_ADVERTISING,
    'commission':         EXPENSE_COMMISSION,
    'shipping':           EXPENSE_SHIPPING,
    'clearance':          EXPENSE_CLEARANCE,
    'inspection':         EXPENSE_INSPECTION,
    'preparation':        EXPENSE_PREPARATION,
}

VEHICLE_COST_ACCOUNTS: dict[str, str] = {
    'shipping':    EXPENSE_SHIPPING,
    'clearance':   EXPENSE_CLEARANCE,
    'inspection':  EXPENSE_INSPECTION,
    'preparation': EXPENSE_PREPARATION,
    'other':       EXPENSE_MISC,
}

# ── دوال المساعدة ─────────────────────────────────────────────────────────────

def acct_cash(payment_method: str | None) -> str:
    """Returns BANK_ACCOUNT if payment_method contains 'bank', otherwise CASH_ACCOUNT."""
    return BANK_ACCOUNT if (payment_method and 'bank' in payment_method.lower()) else CASH_ACCOUNT


def acct_sale_revenue(car) -> str:
    """Returns REVENUE_USED_CAR for used cars, REVENUE_NEW_CAR for all others."""
    return REVENUE_USED_CAR if (getattr(car, 'condition', '') or '').lower() == 'used' else REVENUE_NEW_CAR


def acct_sale_cogs(car) -> str:  # noqa: ARG001
    """Returns the unified COGS account (same for all car types)."""
    return COGS_ACCOUNT


def acct_inventory(car) -> str:
    """Returns INVENTORY_USED for used cars, INVENTORY_NEW for all others."""
    return INVENTORY_USED if (getattr(car, 'condition', '') or '').lower() == 'used' else INVENTORY_NEW


def acct_expense_category(category: str | None) -> str:
    """Returns the expense account code for a given expense category key.
    Falls back to EXPENSE_MISC for unknown categories."""
    return EXPENSE_CATEGORY_ACCOUNTS.get((category or '').lower(), EXPENSE_MISC)


def acct_vehicle_cost(cost_type: str | None) -> str:
    """Returns the expense account code for a given vehicle cost type.
    Falls back to EXPENSE_MISC for unknown types."""
    return VEHICLE_COST_ACCOUNTS.get((cost_type or '').lower(), EXPENSE_MISC)
