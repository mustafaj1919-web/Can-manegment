from flask import Flask
from .config import Config
from .database import db
from .models import Account

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

# ---------------------------------------------------------------------------
# دليل الحسابات الكامل — ترميز سداسي
# (code, name, type, parent_code)
# الأنواع: Asset | Liability | Expense | Income | Equity
# مجمع الإهلاك (127000) = Asset برصيد سالب (دائن) — بدون ContraAsset الآن
# ---------------------------------------------------------------------------
DEFAULT_ACCOUNTS = [
    # ══════════════════════════════════════
    # 100000  الموجودات
    # ══════════════════════════════════════
    ('100000', 'الموجودات', 'Asset', None),

    ('110000', 'الموجودات المتداولة', 'Asset', '100000'),

    ('111000', 'الصندوق', 'Asset', '110000'),
    ('111001', 'الصندوق الرئيسي', 'Asset', '111000'),
    ('111002', 'صندوق فرع الأصدقاء', 'Asset', '111000'),
    ('111003', 'صندوق فرع الأصدقاء 2', 'Asset', '111000'),

    ('112000', 'البنوك', 'Asset', '110000'),
    ('112001', 'البنك الأهلي العراقي', 'Asset', '112000'),
    ('112002', 'مصرف الرافدين', 'Asset', '112000'),
    ('112003', 'حساب الدولار', 'Asset', '112000'),

    ('113000', 'الذمم المدينة', 'Asset', '110000'),
    ('113001', 'عملاء نقدي', 'Asset', '113000'),
    ('113002', 'عملاء تقسيط', 'Asset', '113000'),
    ('113003', 'أقساط مستحقة', 'Asset', '113000'),
    ('113004', 'شيكات واردة', 'Asset', '113000'),

    ('114000', 'السلف والعهد', 'Asset', '110000'),
    ('114001', 'سلف موظفين', 'Asset', '114000'),
    ('114002', 'سلف إدارية', 'Asset', '114000'),

    ('115000', 'المخزون', 'Asset', '110000'),
    ('115001', 'سيارات جديدة', 'Asset', '115000'),
    ('115002', 'سيارات مستعملة', 'Asset', '115000'),
    ('115003', 'سيارات قيد الشراء', 'Asset', '115000'),
    ('115004', 'سيارات قيد التجهيز', 'Asset', '115000'),
    ('115005', 'قطع غيار', 'Asset', '115000'),
    ('115006', 'إكسسوارات', 'Asset', '115000'),

    ('120000', 'الموجودات الثابتة', 'Asset', '100000'),
    ('121000', 'الأراضي', 'Asset', '120000'),
    ('122000', 'المباني', 'Asset', '120000'),
    ('123000', 'الأثاث', 'Asset', '120000'),
    ('124000', 'أجهزة الحاسوب', 'Asset', '120000'),
    ('125000', 'معدات الورشة', 'Asset', '120000'),
    ('126000', 'سيارات الخدمة', 'Asset', '120000'),

    # مجمع الإهلاك — Asset برصيد دائن (سالب)
    ('127000', 'مجمع الإهلاك', 'Asset', '120000'),
    ('127001', 'إهلاك المباني', 'Asset', '127000'),
    ('127002', 'إهلاك الأثاث', 'Asset', '127000'),
    ('127003', 'إهلاك الأجهزة', 'Asset', '127000'),
    ('127004', 'إهلاك السيارات', 'Asset', '127000'),

    # ══════════════════════════════════════
    # 200000  المطلوبات
    # ══════════════════════════════════════
    ('200000', 'المطلوبات', 'Liability', None),

    ('210000', 'المطلوبات المتداولة', 'Liability', '200000'),

    ('211000', 'الموردون', 'Liability', '210000'),
    ('211001', 'موردو السيارات', 'Liability', '211000'),
    ('211002', 'موردو قطع الغيار', 'Liability', '211000'),

    ('212000', 'الذمم الدائنة', 'Liability', '210000'),
    ('213000', 'رواتب مستحقة', 'Liability', '210000'),
    ('214000', 'ضرائب ورسوم مستحقة', 'Liability', '210000'),
    ('215000', 'دفعات مقدمة من العملاء', 'Liability', '210000'),
    ('216000', 'شيكات صادرة', 'Liability', '210000'),
    ('217000', 'قروض قصيرة الأجل', 'Liability', '210000'),

    ('220000', 'المطلوبات طويلة الأجل', 'Liability', '200000'),
    ('221000', 'قروض مصرفية', 'Liability', '220000'),
    ('222000', 'تمويل طويل الأجل', 'Liability', '220000'),

    # ══════════════════════════════════════
    # 300000  المصاريف
    # ══════════════════════════════════════
    ('300000', 'المصاريف', 'Expense', None),

    ('310000', 'مصاريف الرواتب', 'Expense', '300000'),
    ('310001', 'رواتب الموظفين', 'Expense', '310000'),
    ('310002', 'مكافآت', 'Expense', '310000'),

    ('320000', 'مصاريف التشغيل', 'Expense', '300000'),
    ('320001', 'إيجار المعرض', 'Expense', '320000'),
    ('320002', 'كهرباء', 'Expense', '320000'),
    ('320003', 'ماء', 'Expense', '320000'),
    ('320004', 'إنترنت', 'Expense', '320000'),
    ('320005', 'هاتف', 'Expense', '320000'),

    # 330000 مصاريف تشغيلية فقط — 330001/330002 محذوفان (الشراء يذهب للمخزون)
    ('330000', 'مصاريف السيارات التشغيلية', 'Expense', '300000'),
    # أكواد تكلفة السيارات المباشرة المستخدمة في قيد تكلفة البضاعة المباعة
    ('330001', 'تكلفة سيارات جديدة', 'Expense', '330000'),
    ('330002', 'تكلفة سيارات مستعملة', 'Expense', '330000'),
    ('330003', 'شحن السيارات', 'Expense', '330000'),
    ('330004', 'تخليص كمركي', 'Expense', '330000'),
    ('330005', 'فحص السيارات', 'Expense', '330000'),
    ('330006', 'تجهيز السيارات', 'Expense', '330000'),

    ('340000', 'مصاريف التسويق', 'Expense', '300000'),
    ('340001', 'إعلانات فيسبوك', 'Expense', '340000'),
    ('340002', 'إعلانات تيك توك', 'Expense', '340000'),
    ('340003', 'إعلانات إنستغرام', 'Expense', '340000'),
    ('340004', 'عمولات البيع', 'Expense', '340000'),

    ('350000', 'مصاريف إدارية', 'Expense', '300000'),
    ('350001', 'وقود', 'Expense', '350000'),
    ('350002', 'ضيافة', 'Expense', '350000'),
    ('350003', 'قرطاسية', 'Expense', '350000'),
    ('350004', 'صيانة سيارات', 'Expense', '350000'),
    ('350005', 'صيانة أجهزة', 'Expense', '350000'),
    ('350006', 'رسوم حكومية', 'Expense', '350000'),
    ('350007', 'مصاريف بنكية', 'Expense', '350000'),
    ('350008', 'إهلاك الموجودات', 'Expense', '350000'),
    ('350009', 'مصاريف متنوعة', 'Expense', '350000'),

    # 360000 تكلفة المبيعات — مضافة (كانت مفقودة من الدليل الأصلي)
    ('360000', 'تكلفة المبيعات', 'Expense', '300000'),
    ('360001', 'تكلفة سيارات مباعة', 'Expense', '360000'),

    # ══════════════════════════════════════
    # 400000  الإيرادات
    # ══════════════════════════════════════
    ('400000', 'الإيرادات', 'Income', None),

    ('410000', 'إيرادات بيع السيارات', 'Income', '400000'),
    ('410001', 'بيع سيارات جديدة', 'Income', '410000'),
    ('410002', 'بيع سيارات مستعملة', 'Income', '410000'),

    ('420000', 'إيرادات التقسيط', 'Income', '400000'),
    ('420001', 'أرباح التقسيط', 'Income', '420000'),
    ('420002', 'فوائد التقسيط', 'Income', '420000'),

    ('430000', 'إيرادات الخدمات', 'Income', '400000'),
    ('430001', 'تسجيل المركبات', 'Income', '430000'),
    ('430002', 'نقل الملكية', 'Income', '430000'),
    ('430003', 'عمولات البيع', 'Income', '430000'),

    ('440000', 'إيرادات أخرى', 'Income', '400000'),
    ('440001', 'إيرادات متنوعة', 'Income', '440000'),

    # ══════════════════════════════════════
    # 500000  حقوق الملكية
    # ══════════════════════════════════════
    ('500000', 'حقوق الملكية', 'Equity', None),
    ('510000', 'رأس المال', 'Equity', '500000'),
    ('520000', 'الاحتياطي القانوني', 'Equity', '500000'),
    ('530000', 'الاحتياطي العام', 'Equity', '500000'),
    ('540000', 'الأرباح المحتجزة', 'Equity', '500000'),
    ('550000', 'أرباح السنة الحالية', 'Equity', '500000'),
    ('560000', 'مسحوبات المالك', 'Equity', '500000'),
]


# ---------------------------------------------------------------------------
# تصانيف الحسابات — يُستخدم في التقارير المالية والميزانية وقائمة الدخل
# ---------------------------------------------------------------------------
CLASSIFICATION_LABELS = {
    'current_asset':       'الأصول المتداولة',
    'fixed_asset':         'الأصول الثابتة',
    'current_liability':   'المطلوبات المتداولة',
    'long_term_liability': 'المطلوبات طويلة الأجل',
    'equity':              'حقوق الملكية',
    'operating_revenue':   'الإيرادات التشغيلية',
    'other_revenue':       'الإيرادات الأخرى',
    'cogs':                'تكلفة البضاعة المباعة',
    'operating_expense':   'المصاريف التشغيلية',
    'admin_expense':       'المصاريف الإدارية',
}

# تعيين التصنيف لكل كود حساب
ACCOUNT_CLASSIFICATIONS: dict[str, str] = {
    # ── الموجودات ──────────────────────────────────────────
    # 100000 جذر يجمع متداولة + ثابتة -> لا تصنيف فرعي
    '110000': 'current_asset',    # الموجودات المتداولة
    '111000': 'current_asset', '111001': 'current_asset',
    '111002': 'current_asset', '111003': 'current_asset',
    '112000': 'current_asset', '112001': 'current_asset',
    '112002': 'current_asset', '112003': 'current_asset',
    '113000': 'current_asset', '113001': 'current_asset',
    '113002': 'current_asset', '113003': 'current_asset', '113004': 'current_asset',
    '114000': 'current_asset', '114001': 'current_asset', '114002': 'current_asset',
    '115000': 'current_asset', '115001': 'current_asset', '115002': 'current_asset',
    '115003': 'current_asset', '115004': 'current_asset',
    '115005': 'current_asset', '115006': 'current_asset',
    '120000': 'fixed_asset',      # الموجودات الثابتة
    '121000': 'fixed_asset', '122000': 'fixed_asset', '123000': 'fixed_asset',
    '124000': 'fixed_asset', '125000': 'fixed_asset', '126000': 'fixed_asset',
    '127000': 'fixed_asset', '127001': 'fixed_asset', '127002': 'fixed_asset',
    '127003': 'fixed_asset', '127004': 'fixed_asset',
    # ── المطلوبات ──────────────────────────────────────────
    # 200000 جذر يجمع متداولة + طويلة الأجل -> لا تصنيف فرعي
    '210000': 'current_liability',
    '211000': 'current_liability', '211001': 'current_liability', '211002': 'current_liability',
    '212000': 'current_liability', '213000': 'current_liability',
    '214000': 'current_liability', '215000': 'current_liability',
    '216000': 'current_liability', '217000': 'current_liability',
    '220000': 'long_term_liability',
    '221000': 'long_term_liability', '222000': 'long_term_liability',
    # ── المصاريف ──────────────────────────────────────────
    # 300000 جذر يجمع cogs + operating + admin -> لا تصنيف فرعي
    '310000': 'operating_expense', '310001': 'operating_expense', '310002': 'operating_expense',
    '320000': 'operating_expense', '320001': 'operating_expense', '320002': 'operating_expense',
    '320003': 'operating_expense', '320004': 'operating_expense', '320005': 'operating_expense',
    '330000': 'cogs',
    '330001': 'cogs', '330002': 'cogs', '330003': 'cogs',
    '330004': 'cogs', '330005': 'cogs', '330006': 'cogs',
    '340000': 'operating_expense',
    '340001': 'operating_expense', '340002': 'operating_expense',
    '340003': 'operating_expense', '340004': 'operating_expense',
    '350000': 'admin_expense',
    '350001': 'admin_expense', '350002': 'admin_expense', '350003': 'admin_expense',
    '350004': 'admin_expense', '350005': 'admin_expense', '350006': 'admin_expense',
    '350007': 'admin_expense', '350008': 'admin_expense', '350009': 'admin_expense',
    '360000': 'cogs', '360001': 'cogs',
    # ── الإيرادات ──────────────────────────────────────────
    # 400000 جذر يجمع operating + other revenue -> لا تصنيف فرعي
    '410000': 'operating_revenue', '410001': 'operating_revenue', '410002': 'operating_revenue',
    '420000': 'operating_revenue', '420001': 'operating_revenue', '420002': 'other_revenue',
    '430000': 'other_revenue',
    '430001': 'other_revenue', '430002': 'other_revenue', '430003': 'other_revenue',
    '440000': 'other_revenue', '440001': 'other_revenue',
    # ── حقوق الملكية ──────────────────────────────────────
    '500000': 'equity', '510000': 'equity', '520000': 'equity',
    '530000': 'equity', '540000': 'equity', '550000': 'equity', '560000': 'equity',
}


def create_account(code, name, acct_type, parent_code=None):
    existing = Account.query.filter_by(code=code).first()
    if existing:
        return existing
    parent = None
    if parent_code:
        parent = Account.query.filter_by(code=parent_code).first()
    classification = ACCOUNT_CLASSIFICATIONS.get(code)
    acc = Account(code=code, name=name, type=acct_type, parent=parent, classification=classification)
    db.session.add(acc)
    db.session.flush()
    return acc


def seed_chart_of_accounts():
    """Insert all accounts from DEFAULT_ACCOUNTS if they don't already exist."""
    created = 0
    for code, name, acct_type, parent_code in DEFAULT_ACCOUNTS:
        existing = Account.query.filter_by(code=code).first()
        if not existing:
            create_account(code, name, acct_type, parent_code)
            created += 1
    db.session.commit()
    return created


def assign_classifications():
    """Assign classification to existing accounts that don't have one yet.
    Safe to run multiple times — only updates NULL classification rows.
    """
    updated = 0
    for code, classification in ACCOUNT_CLASSIFICATIONS.items():
        acc = Account.query.filter_by(code=code, classification=None).first()
        if acc:
            acc.classification = classification
            updated += 1
    if updated:
        db.session.commit()
    return updated


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        n = seed_chart_of_accounts()
        print(f'دليل الحسابات: {n} حساب تم إنشاؤه (الحسابات الموجودة مسبقاً تم تخطيها)')
        m = assign_classifications()
        print(f'تصانيف الحسابات: {m} حساب تم تصنيفه')
