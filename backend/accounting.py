import re
from datetime import datetime
from sqlalchemy import func
from .database import db
from .models import Account, JournalEntry, JournalEntryLine

# نمط الأكواد النقطية القديمة مثل 1.1.1 أو 4.2 أو 5.1
_DOT_CODE_RE = re.compile(r'^\d+\.\d')


def assert_no_dot_codes(lines):
    """يرفع ValueError إذا وُجد كود نقطي قديم في أي سطر من القيد."""
    for ln in lines:
        code = str(ln.get('account_code', '') or '')
        if _DOT_CODE_RE.match(code):
            raise ValueError(
                f"كود نقطي قديم مكتشف: '{code}' — استخدم الترميز السداسي (مثال: 111001)"
            )


def get_account_by_code(code):
    """يرجع الحساب بالسجل المحدد أو يرفع ValueError إذا لم يوجد."""
    if not code:
        raise ValueError('لم يتم توفير رمز الحساب.')
    account = Account.query.filter_by(code=str(code)).first()
    if not account:
        raise ValueError(f'الحساب غير موجود للكود: {code}')
    return account


def _next_reference_number() -> str:
    """يولد رقم قيد تسلسلي بصيغة JE-000001."""
    last = db.session.query(func.max(JournalEntry.id)).scalar() or 0
    return f'JE-{last + 1:06d}'


def create_journal_entry(
    entry_date=None,
    description=None,
    branch_id=None,
    reference_type=None,
    reference_id=None,
    lines=None,
    auto_post=True,
    posted_by_id=None,
):
    """ينشئ قيداً محاسبياً مع سطوره.

    lines: قائمة من dict تحتوي على مفاتيح: account_code, debit, credit
    auto_post: True → status='posted' مباشرة (للعمليات التلقائية)
               False → status='draft' (للإدخال اليدوي)
    يرفع ValueError إذا:
      - وُجد كود نقطي قديم
      - الحساب غير موجود أو هو حساب أب (له فروع)
      - القيد غير متوازن (مجموع المدين != مجموع الدائن)
    """
    if lines is None:
        lines = []
    if entry_date is None:
        entry_date = datetime.utcnow()

    assert_no_dot_codes(lines)

    status = 'posted' if auto_post else 'draft'
    posted_at = datetime.utcnow() if auto_post else None

    je = JournalEntry(
        entry_date=entry_date,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id,
        branch_id=branch_id,
        status=status,
        posted_by_id=posted_by_id if auto_post else None,
        posted_at=posted_at,
    )
    db.session.add(je)
    db.session.flush()

    # Assign reference number after flush (ID is now available)
    je.reference_number = _next_reference_number()

    total_debit = 0.0
    total_credit = 0.0

    for ln in lines:
        acct_code = ln.get('account_code')
        debit = float(ln.get('debit') or 0)
        credit = float(ln.get('credit') or 0)
        acct = get_account_by_code(acct_code)

        # منع استخدام حسابات الأب (التي لها حسابات فرعية)
        has_children = Account.query.filter_by(parent_id=acct.id).first()
        if has_children:
            raise ValueError(
                f'الحساب "{acct.name}" ({acct_code}) هو حساب أب ولا يمكن استخدامه في القيود — '
                f'استخدم أحد حساباته التفصيلية.'
            )

        jel = JournalEntryLine(
            journal_entry_id=je.id,
            account_id=acct.id,
            debit=debit,
            credit=credit,
        )
        db.session.add(jel)
        total_debit += debit
        total_credit += credit

    if round(total_debit - total_credit, 2) != 0:
        raise ValueError(
            f'القيد غير متوازن — مدين: {total_debit:.2f}، دائن: {total_credit:.2f}'
        )

    db.session.flush()

    if auto_post:
        _update_account_balances_for_entry(je)

    return je


def _update_account_balances_for_entry(je: 'JournalEntry', reverse: bool = False) -> None:
    """يحدّث Account.balance بعد نشر القيد أو عكسه.

    reverse=True يُستخدم عند حذف قيد أو عكسه (يطرح التأثير بدل إضافته).
    """
    sign = -1.0 if reverse else 1.0
    for line in je.lines:
        acct = Account.query.get(line.account_id)
        if acct is None:
            continue
        delta = sign * (float(line.debit or 0) - float(line.credit or 0))
        acct.balance = round((acct.balance or 0.0) + delta, 6)
        _propagate_balance_to_parents(acct)


def _propagate_balance_to_parents(account: 'Account') -> None:
    """يعيد حساب رصيد كل أب بجمع أرصدة أبنائه المباشرة."""
    if not account.parent_id:
        return
    # جمع سلسلة الآباء
    parent_ids = []
    pid = account.parent_id
    while pid:
        parent_ids.append(pid)
        p = db.session.get(Account, pid)
        pid = p.parent_id if p else None
    if not parent_ids:
        return
    # استعلام واحد لمجموع أرصدة الأبناء لكل أب
    children_sums = dict(
        db.session.query(Account.parent_id, func.sum(Account.balance))
        .filter(Account.parent_id.in_(parent_ids))
        .group_by(Account.parent_id)
        .all()
    )
    for pid in parent_ids:
        parent = db.session.get(Account, pid)
        if parent:
            parent.balance = round(float(children_sums.get(pid) or 0.0), 6)


def recompute_all_account_balances() -> None:
    """يُعيد حساب جميع أرصدة الحسابات من الصفر اعتماداً على القيود المسجّلة.

    يُستخدم عند الترقية أو بعد عمليات استعادة قاعدة البيانات.
    """
    Account.query.update({'balance': 0.0}, synchronize_session=False)
    db.session.flush()

    q = (
        db.session.query(
            JournalEntryLine.account_id,
            func.sum(JournalEntryLine.debit).label('d'),
            func.sum(JournalEntryLine.credit).label('c'),
        )
        .join(JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id)
        .filter(JournalEntry.status == 'posted')
        .group_by(JournalEntryLine.account_id)
    )
    for row in q:
        acct = Account.query.get(row.account_id)
        if acct:
            acct.balance = round(float(row.d or 0) - float(row.c or 0), 6)

    db.session.flush()

    # تحديث أرصدة الآباء من الأسفل للأعلى
    leaves = Account.query.filter(
        ~Account.id.in_(
            db.session.query(Account.parent_id).filter(Account.parent_id.isnot(None))
        )
    ).all()
    visited: set = set()
    for leaf in leaves:
        parent = Account.query.get(leaf.parent_id) if leaf.parent_id else None
        while parent and parent.id not in visited:
            child_sum = sum(
                (c.balance or 0.0)
                for c in Account.query.filter_by(parent_id=parent.id).all()
            )
            parent.balance = round(child_sum, 6)
            visited.add(parent.id)
            parent = Account.query.get(parent.parent_id) if parent.parent_id else None

    db.session.commit()


def get_trial_balance(branch_id=None):
    """يرجع ميزان المراجعة بناء على القيود المحاسبية.

    Returns:
      lines  -- list of dict {code, name, type, debit, credit, balance}
      totals -- dict {total_debit, total_credit}
    """
    acct_sums = {}
    q = (
        db.session.query(
            JournalEntryLine.account_id,
            func.sum(JournalEntryLine.debit).label('debits'),
            func.sum(JournalEntryLine.credit).label('credits'),
        )
        .join(JournalEntry)
        .filter(JournalEntry.status == 'posted')
        .group_by(JournalEntryLine.account_id)
    )
    if branch_id is not None:
        q = q.filter(JournalEntry.branch_id == branch_id)
    for row in q:
        acct_sums[row.account_id] = {
            'debits': float(row.debits or 0.0),
            'credits': float(row.credits or 0.0),
        }

    accounts = Account.query.order_by(Account.code).all()
    lines = []
    for a in accounts:
        sums = acct_sums.get(a.id, {'debits': 0.0, 'credits': 0.0})
        bal = round(sums['debits'] - sums['credits'], 2)
        lines.append({
            'code': a.code,
            'name': a.name,
            'type': a.type,
            'debit': round(sums['debits'], 2),
            'credit': round(sums['credits'], 2),
            'balance': bal,
        })

    totals = {
        'total_debit': round(sum(l['debit'] for l in lines), 2),
        'total_credit': round(sum(l['credit'] for l in lines), 2),
    }
    return lines, totals
