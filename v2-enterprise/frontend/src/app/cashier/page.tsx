'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Wallet,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
  CalendarDays,
  Scale,
  PlusCircle,
  FileCheck,
  AlertCircle,
  Clock,
  Printer
} from 'lucide-react'
import Link from 'next/link'
import { getCashDashboard, getCurrentBalance, getCashboxCloses } from '@/lib/api/vouchers'
import { formatMoney, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'

export default function CashierDashboard() {
  // 1. Fetch current cashbox balance (account 111001)
  const { 
    data: balanceData, 
    isLoading: isBalanceLoading,
    isError: isBalanceError 
  } = useQuery({
    queryKey: ['cashbox-balance', '111001'],
    queryFn: () => getCurrentBalance('111001'),
    staleTime: 30_000,
  })

  // 2. Fetch cash dashboard stats
  const { 
    data: cashDash, 
    isLoading: isDashLoading,
    isError: isDashError 
  } = useQuery({
    queryKey: ['cash-dashboard'],
    queryFn: getCashDashboard,
    staleTime: 30_000,
  })

  // 3. Fetch recent closes
  const { 
    data: closes = [], 
    isLoading: isClosesLoading 
  } = useQuery({
    queryKey: ['cashbox-closes-recent'],
    queryFn: () => getCashboxCloses('111001'),
    staleTime: 60_000,
  })

  const isLoading = isBalanceLoading || isDashLoading || isClosesLoading
  const isError = isBalanceError || isDashError

  const currentBalance = balanceData?.balance ?? 0
  const lastClose = cashDash?.last_close ?? (closes.length > 0 ? {
    date: closes[0].close_date ? formatDate(closes[0].close_date) : '-',
    difference: closes[0].difference,
    note: closes[0].note
  } : null)

  const quickActions = [
    {
      title: 'فاتورة بيع جديدة',
      desc: 'تسجيل عملية بيع سيارة وإصدار الفاتورة',
      href: '/cashier/new-sale',
      icon: PlusCircle,
      color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20',
    },
    {
      title: 'تحصيل قسط عميل',
      desc: 'استلام مبالغ الأقساط الشهرية وتوليد السندات',
      href: '/cashier/installment-payment',
      icon: CalendarDays,
      color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20',
    },
    {
      title: 'تسجيل قيد مصروف',
      desc: 'صرف دفعة نقدية لمصاريف المعرض اليومية',
      href: '/expenses',
      icon: ArrowUpRight,
      color: 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20',
    },
    {
      title: 'سندات الكاشير اليوم',
      desc: 'استعراض ومراجعة إيصالات القبض والصرف لليوم',
      href: '/cashier/receipts',
      icon: ReceiptText,
      color: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20',
    },
    {
      title: 'إقفال الصندوق اليومي',
      desc: 'مطابقة النقد الفعلي وإغلاق الصندوق لليوم',
      href: '/cashier/daily-close',
      icon: Scale,
      color: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="glass rounded-xl py-16 text-center space-y-4" dir="rtl">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
        <h3 className="text-md font-bold text-foreground">خطأ في تحميل البيانات</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          تعذر الاتصال بالخادم لجلب تفاصيل الصندوق والعمليات الجارية. الرجاء التأكد من اتصال الشبكة وإعادة المحاولة.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          تحديث الصفحة
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8 text-right" dir="rtl">
      {/* Header */}
      <PageHeader
        title="صندوق الكاشير (POS)"
        subtitle="متابعة الحركات المالية اليومية المباشرة والمبيعات السريعة"
        icon={<Wallet className="h-5 w-5" />}
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cashbox Balance */}
        <div className="glass rounded-xl p-4 border border-cyan-500/10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs text-muted-foreground">رصيد الصندوق الدفتري</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shrink-0">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric text-xl font-black text-cyan-400">{formatMoney(currentBalance, 'IQD')}</p>
          <span className="text-[10px] text-muted-foreground/70">حساب رئيسي: 111001</span>
        </div>

        {/* Bank Balance */}
        <div className="glass rounded-xl p-4 border border-sky-500/10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs text-muted-foreground">رصيد البنك اليوم</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-400 shrink-0">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric text-xl font-black text-sky-400">{formatMoney(cashDash?.bank_balance_iqd ?? 0, 'IQD')}</p>
          <span className="text-[10px] text-muted-foreground/70">شامل حسابات المصارف</span>
        </div>

        {/* Today's Inflow */}
        <div className="glass rounded-xl p-4 border border-emerald-500/10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs text-muted-foreground">المقبوضات اليوم</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shrink-0">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric text-xl font-black text-emerald-400">{formatMoney(cashDash?.today_inflow_iqd ?? 0, 'IQD')}</p>
          <span className="text-[10px] text-muted-foreground/70">مبيعات وأقساط داخلة</span>
        </div>

        {/* Today's Outflow */}
        <div className="glass rounded-xl p-4 border border-rose-500/10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs text-muted-foreground">المدفوعات اليوم</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 shrink-0">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <p className="font-numeric text-xl font-black text-rose-400">{formatMoney(cashDash?.today_outflow_iqd ?? 0, 'IQD')}</p>
          <span className="text-[10px] text-muted-foreground/70">شراء مركبات ومصاريف تشغيلية</span>
        </div>
      </div>

      {/* Cashbox Open / Close Status Banner */}
      <div className="glass rounded-xl p-4 border border-amber-500/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">حالة الوردية الجارية</h3>
            <p className="text-xs text-muted-foreground mt-0.5">الصندوق مفتوح وجاهز لاستقبال الحركات المالية</p>
          </div>
        </div>
        {lastClose ? (
          <div className="text-xs text-left">
            <span className="text-muted-foreground block">آخر إقفال: <strong className="text-foreground">{lastClose.date}</strong></span>
            <span className="text-muted-foreground">فارق التسوية: <strong className={lastClose.difference === 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatMoney(lastClose.difference, 'IQD')}</strong></span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">لا تتوفر تفاصيل إغلاق سابقة</span>
        )}
      </div>

      {/* Dashboard Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="glass rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">عمليات الصندوق السريعة</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((act) => {
              const Icon = act.icon
              return (
                <Link key={act.title} href={act.href} className="block">
                  <div className={`p-4 rounded-xl border flex flex-col items-start gap-2.5 h-full transition-all duration-150 ${act.color}`}>
                    <Icon className="h-5 w-5" />
                    <div className="text-right">
                      <h4 className="text-xs font-bold">{act.title}</h4>
                      <p className="text-[10px] opacity-75 mt-0.5 leading-normal">{act.desc}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Closes Logs */}
        <div className="glass rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2 flex items-center justify-between">
            <span>سجل الإقفال الأخير</span>
            <Link href="/cashier/daily-close" className="text-xs text-cyan-400 hover:underline">
              كل الإقفالات
            </Link>
          </h3>
          {closes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <FileCheck className="mx-auto h-8 w-8 opacity-30" />
              <p className="text-xs">لم يتم إجراء أي عمليات إغلاق سابقة على هذا الحساب</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {closes.slice(0, 4).map((item: any) => (
                <div key={item.id} className="border border-border/40 rounded-lg p-3 flex items-center justify-between text-xs hover:bg-secondary/10 transition-colors">
                  <div>
                    <span className="font-semibold block">{item.close_date ? formatDate(item.close_date) : '-'}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">بواسطة: {item.closed_by || 'الكاشير'}</span>
                  </div>
                  <div className="text-left">
                    <span className={`font-numeric font-bold block ${item.difference === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.difference > 0 ? '+' : ''}{formatMoney(item.difference, 'IQD')}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">الفعلي: {formatMoney(item.actual_balance, 'IQD')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
