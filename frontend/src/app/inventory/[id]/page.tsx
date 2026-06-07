'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle, Car, Edit, ExternalLink, FileText, Image,
  Plus, Trash2,
} from 'lucide-react'
import { cn, formatMoney, formatNumber, getStatusVariant, photoUrl, translateStatus } from '@/lib/utils'
import { getCarById, getVehicleCosts, addVehicleCost, deleteVehicleCost } from '@/lib/api/inventory'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DetailHeader } from '@/components/shared/DetailHeader'
import { SectionCard } from '@/components/shared/SectionCard'

const CONDITION_LABEL: Record<string, string> = {
  New: 'جديدة',
  Used: 'مستعملة',
  Damaged: 'متضررة',
  Salvage: 'سكراب',
}

const FUEL_LABEL: Record<string, string> = {
  Gasoline: 'بنزين',
  Diesel: 'ديزل',
  Hybrid: 'هايبرد',
  Electric: 'كهربائي',
}

const TRANS_LABEL: Record<string, string> = {
  Automatic: 'أوتوماتيك',
  Manual: 'يدوي',
  CVT: 'CVT',
  DCT: 'DCT',
}

const PLATE_LABEL: Record<string, string> = {
  'No Plate': 'بدون لوحة',
  Temporary: 'مؤقتة',
  Registered: 'مسجلة',
}

function SpecRow({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/20 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('break-words text-end text-xs font-medium text-foreground', mono && 'font-numeric')}>{value}</span>
    </div>
  )
}

const COST_TYPE_LABELS: Record<string, string> = {
  shipping: 'مصاريف الشحن',
  clearance: 'مصاريف التخليص',
  inspection: 'مصاريف الفحص',
  preparation: 'مصاريف التجهيز',
  other: 'مصاريف أخرى',
}

export default function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const id = Number.parseInt(rawId, 10)
  const qc = useQueryClient()

  const [newCostType, setNewCostType] = useState('shipping')
  const [newCostAmount, setNewCostAmount] = useState('')
  const [newCostCurrency, setNewCostCurrency] = useState('USD')
  const [newCostDesc, setNewCostDesc] = useState('')

  const { data: car, isLoading, isError } = useQuery({
    queryKey: ['car', id],
    queryFn: () => getCarById(id),
    staleTime: 30_000,
    retry: 1,
    enabled: !Number.isNaN(id),
  })

  const { data: profData } = useQuery({
    queryKey: ['vehicle-costs', id],
    queryFn: () => getVehicleCosts(id),
    staleTime: 30_000,
    enabled: !Number.isNaN(id),
  })

  const addMutation = useMutation({
    mutationFn: () => addVehicleCost(id, {
      cost_type: newCostType,
      amount: parseFloat(newCostAmount),
      currency: newCostCurrency,
      description: newCostDesc || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-costs', id] })
      setNewCostAmount(''); setNewCostDesc('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (costId: number) => deleteVehicleCost(id, costId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-costs', id] }),
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
        <Skeleton className="h-40 rounded-lg" />
      </div>
    )
  }

  if (isError || !car) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertCircle className="h-10 w-10 text-rose-400/60" />
        <p className="text-muted-foreground">تعذر تحميل بيانات السيارة</p>
        <Button asChild variant="ghost" size="sm">
          <Link href="/inventory">العودة للمخزون</Link>
        </Button>
      </div>
    )
  }

  const profit = car.selling_price ? car.selling_price - car.purchase_price : null

  return (
    <div className="mx-auto max-w-4xl space-y-5">

      <DetailHeader
        backHref="/inventory"
        backLabel="المخزون"
        title={`${car.brand} ${car.model} ${car.manufacturing_year}`}
        subtitle={[car.trim, car.color, car.condition ? CONDITION_LABEL[car.condition] ?? car.condition : null].filter(Boolean).join(' · ')}
        status={
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', getStatusVariant(car.status))}>
            {translateStatus(car.status)}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
              <Link href={`/inventory/${id}/specification`}>
                <FileText className="h-3.5 w-3.5" />
                مواصفات
              </Link>
            </Button>
            {car.status === 'Available' && (
              <Button asChild size="sm" className="gap-1.5 bg-violet-600 text-white hover:bg-violet-500">
                <Link href={`/inventory/${id}/edit`}>
                  <Edit className="h-4 w-4" />
                  تعديل
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SectionCard title="التعريف" contentClassName="px-5 py-0">
          <SpecRow label="رقم الشاصي"  value={car.vin} mono />
          <SpecRow label="رقم اللوحة"  value={car.plate_number} mono />
          <SpecRow label="حالة اللوحة" value={car.plate_status ? PLATE_LABEL[car.plate_status] ?? car.plate_status : null} />
          <SpecRow label="الحالة"       value={car.condition ? CONDITION_LABEL[car.condition] ?? car.condition : null} />
          <SpecRow label="سنة الصنع"   value={car.manufacturing_year} />
          <SpecRow label="بلد الاستيراد" value={car.import_country} />
        </SectionCard>

        <SectionCard title="المواصفات الفنية" contentClassName="px-5 py-0">
          <SpecRow label="نوع الوقود"      value={car.fuel_type ? FUEL_LABEL[car.fuel_type] ?? car.fuel_type : null} />
          <SpecRow label="ناقل الحركة"     value={car.transmission ? TRANS_LABEL[car.transmission] ?? car.transmission : null} />
          <SpecRow label="حجم المحرك"      value={car.engine_size} />
          <SpecRow label="عدد الأسطوانات"  value={car.cylinders} />
          <SpecRow label="عدد المقاعد"     value={car.seat_count} />
          <SpecRow label="مادة المقاعد"    value={car.seat_material} />
          <SpecRow label="المسافة المقطوعة" value={car.mileage ? `${formatNumber(car.mileage)} كم` : null} />
        </SectionCard>
      </div>

      <SectionCard title="التسعير">
        <div className="divide-y divide-border/30">
          <div className="flex items-center justify-between py-3">
            <span className="text-xs text-muted-foreground">سعر الشراء</span>
            <span className="font-numeric text-sm font-bold text-foreground">{formatMoney(car.purchase_price, car.currency)}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-xs text-muted-foreground">سعر البيع</span>
            <span className="font-numeric text-sm font-bold text-amber-300">
              {car.selling_price ? formatMoney(car.selling_price, car.currency) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-xs text-muted-foreground">هامش الربح</span>
            <span className={cn('font-numeric text-sm font-bold', profit && profit > 0 ? 'text-emerald-300' : 'text-muted-foreground')}>
              {profit !== null ? formatMoney(profit, car.currency) : '—'}
            </span>
          </div>
        </div>
        {car.notes && (
          <div className="mt-4 border-t border-border/30 pt-4">
            <p className="mb-1 text-[11px] text-muted-foreground">ملاحظات</p>
            <p className="text-sm text-foreground/80">{car.notes}</p>
          </div>
        )}
      </SectionCard>

      {/* ── Vehicle Costs & Profitability ── */}
      <SectionCard title="التكاليف والربحية" noPadding>
        <div className="p-5 space-y-5" dir="rtl">
          {/* Profitability summary */}
          {profData && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {[
                { label: 'سعر الشراء',      value: formatMoney(profData.purchase_price_iqd, 'IQD'), cls: '' },
                { label: 'إجمالي التكاليف', value: formatMoney(profData.costs_total_iqd, 'IQD'),   cls: 'text-amber-300' },
                { label: 'إجمالي التكلفة',  value: formatMoney(profData.total_cost_iqd, 'IQD'),    cls: 'text-orange-300' },
                { label: 'سعر البيع',       value: profData.selling_price_iqd ? formatMoney(profData.selling_price_iqd, 'IQD') : '—', cls: '' },
                {
                  label: 'صافي الربح',
                  value: profData.net_profit_iqd !== null
                    ? `${formatMoney(profData.net_profit_iqd, 'IQD')} (${profData.profit_pct?.toFixed(1)}%)`
                    : '—',
                  cls: profData.net_profit_iqd !== null && profData.net_profit_iqd >= 0 ? 'text-emerald-300' : 'text-rose-400',
                },
              ].map(item => (
                <span key={item.label} className="flex items-baseline gap-1.5 text-[11px]">
                  <span className="text-muted-foreground/60">{item.label}</span>
                  <span className={cn('font-semibold tabular-nums font-numeric', item.cls || 'text-foreground')}>{item.value}</span>
                </span>
              ))}
            </div>
          )}

          {/* Existing costs */}
          {profData?.costs && profData.costs.length > 0 && (
            <div className="rounded-lg border border-border/40 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-secondary/20 border-b border-border/30">
                  <tr>
                    {['النوع', 'الوصف', 'المبلغ', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-start text-[10px] text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profData.costs.map(cost => (
                    <tr key={cost.id} className="border-b border-border/20 last:border-0 hover:bg-secondary/20">
                      <td className="px-3 py-2 font-medium text-foreground/90">{COST_TYPE_LABELS[cost.cost_type] ?? cost.cost_type}</td>
                      <td className="px-3 py-2 text-muted-foreground">{cost.description ?? '—'}</td>
                      <td className="px-3 py-2 font-numeric text-amber-300">{formatMoney(cost.amount, cost.currency as 'USD' | 'IQD')}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => deleteMutation.mutate(cost.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1 rounded text-muted-foreground/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add new cost */}
          <div className="rounded-lg border border-dashed border-border/40 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">إضافة تكلفة جديدة</p>
            <div className="flex flex-wrap gap-2">
              <Select value={newCostType} onValueChange={setNewCostType}>
                <SelectTrigger className="w-[160px] h-8 bg-white/5 border-white/10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COST_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="المبلغ"
                type="number"
                min="0"
                step="0.01"
                value={newCostAmount}
                onChange={e => setNewCostAmount(e.target.value)}
                className="w-[100px] h-8 bg-white/5 border-white/10 text-xs font-numeric"
              />
              <Select value={newCostCurrency} onValueChange={setNewCostCurrency}>
                <SelectTrigger className="w-[80px] h-8 bg-white/5 border-white/10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="IQD">IQD</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="ملاحظة (اختياري)"
                value={newCostDesc}
                onChange={e => setNewCostDesc(e.target.value)}
                className="flex-1 min-w-[150px] h-8 bg-white/5 border-white/10 text-xs"
              />
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={!newCostAmount || parseFloat(newCostAmount) <= 0 || addMutation.isPending}
                onClick={() => addMutation.mutate()}
              >
                <Plus className="h-3 w-3" />
                إضافة
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Photo Gallery ── */}
      <SectionCard
        title="صور السيارة"
        action={<span className="text-xs text-muted-foreground">{(car.photos ?? []).length} صورة</span>}
        noPadding
      >
        {(car.photos ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Image className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/50">
              لا توجد صور — يمكن إضافتها من{' '}
              <a href={`/inventory/${id}/edit`} className="text-violet-400 hover:underline">صفحة التعديل</a>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {(car.photos ?? []).map((photo, index) => (
              <a
                key={photo.id}
                href={photoUrl(photo.filename, photo.subfolder ?? 'vehicles')}
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden rounded-lg border border-border/40 bg-secondary/20 hover:border-amber-500/40 transition-colors"
              >
                <img
                  src={photoUrl(photo.filename, photo.subfolder ?? 'vehicles')}
                  alt={`صورة السيارة ${index + 1}`}
                  className="aspect-square w-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                {index === 0 && (
                  <div className="absolute top-1 right-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    غلاف
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-5 w-5 text-white" />
                </div>
              </a>
            ))}
          </div>
        )}
      </SectionCard>

    </div>
  )
}
