'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, ChevronRight, Edit, FileText, Plus, ArrowUpRight,
  Fuel, Gauge, Settings, Calendar, MapPin, Palette, Shield, Tag, Hash,
  Armchair, Cylinder, Zap, Info, Upload, X, Loader2, ImageOff, Search,
  Check, Bookmark, Sparkles, MessageSquare, Copy, ExternalLink, HelpCircle,
  FileCheck, ShieldAlert, BadgePercent, TrendingUp, DollarSign, Clock, Layers
} from 'lucide-react'
import { cn, formatMoney, formatNumber, getStatusVariant, photoUrl, translateStatus } from '@/lib/utils'
import { getCarById, getVehicleCosts, addVehicleCost, uploadCarPhotos, deleteCarPhoto } from '@/lib/api/inventory'
import type { CarPhoto, VehicleProfitability } from '@/lib/api/inventory'
import { getExchangeRate } from '@/lib/api/exchange-rate'
import type { ExchangeRate } from '@/lib/api/exchange-rate'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

const CONDITION_LABEL: Record<string, string> = {
  New: 'جديدة', Used: 'مستعملة', Damaged: 'متضررة', Salvage: 'سكراب',
}
const FUEL_LABEL: Record<string, string> = {
  Gasoline: 'بنزين', Diesel: 'ديزل', Hybrid: 'هايبرد', Electric: 'كهربائي',
}
const TRANS_LABEL: Record<string, string> = {
  Automatic: 'أوتوماتيك', Manual: 'يدوي', CVT: 'CVT', DCT: 'DCT',
}
const PLATE_LABEL: Record<string, string> = {
  'No Plate': 'بدون لوحة', Temporary: 'مؤقتة', Registered: 'مسجلة',
}
const COST_TYPE_LABELS: Record<string, string> = {
  shipping: 'مصاريف الشحن', clearance: 'مصاريف التخليص',
  inspection: 'مصاريف الفحص', preparation: 'مصاريف التجهيز', other: 'مصاريف أخرى',
}

interface ChatMessageType {
  role: 'user' | 'model'
  content: string
}

export default function CarDetailPage() {
  const routeParams = useParams<{ id: string }>()
  const id = routeParams?.id ? String(routeParams.id) : ""
  const qc = useQueryClient()
  const { user, token } = useAuthStore()

  // Mount State for Hydration Guard
  const [hasMounted, setHasMounted] = useState(false)
  const [exchangeRate, setExchangeRateData] = useState<ExchangeRate | null>(null)
  
  useEffect(() => {
    setHasMounted(true)
    getExchangeRate().then(data => {
      if (data) setExchangeRateData(data)
    })
  }, [])

  const canShowInternalInfo = user && (user.role === 'Owner' || user.role === 'Admin' || user.role === 'Accountant')

  // UI States
  const [activePhotoIdx, setActivePhotoIdx] = useState(0)
  const [showPhotoManager, setShowPhotoManager] = useState(false)
  const [showReadinessDetails, setShowReadinessDetails] = useState(false)

  // Cost Creator Fields
  const [newCostType, setNewCostType] = useState('preparation')
  const [newCostAmount, setNewCostAmount] = useState('')
  const [newCostCurrency, setNewCostCurrency] = useState('USD')
  const [newCostDesc, setNewCostDesc] = useState('')

  // AI Copilot Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([
    { role: 'model', content: 'مرحباً! أنا المساعد الذكي للمعرض. اسألني أي سؤال حول مواصفات أو حالة هذه السيارة الفنية.' }
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, aiLoading])

  // Queries
  const { data: car, isLoading, isError, refetch } = useQuery({
    queryKey: ['car', id],
    queryFn: () => getCarById(id),
    staleTime: 30_000,
    retry: 1,
    enabled: !!id,
  })

  const { data: profData, isError: isProfError, refetch: refetchProf } = useQuery<VehicleProfitability>({
    queryKey: ['vehicle-costs', id],
    queryFn: () => getVehicleCosts(id),
    staleTime: 30_000,
    enabled: !!id && !!canShowInternalInfo,
  })

  // Mutations
  const addCostMutation = useMutation({
    mutationFn: () => addVehicleCost(id, {
      cost_type: newCostType,
      amount: parseFloat(newCostAmount),
      currency: newCostCurrency,
      description: newCostDesc || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-costs', id] })
      toast.success('تم تسجيل المصروف بنجاح وتحديث القيمة الدفترية')
      setNewCostAmount('')
      setNewCostDesc('')
    },
    onError: () => {
      toast.error('فشل تسجيل المصروف. يرجى التحقق من المدخلات')
    }
  })

  // Mapped operational status items (Explicit Mappings & Rules)
  const getImagesStatus = () => {
    if (!car) return { status: 'red', label: 'بدون صور' }
    const hasCover = !!car.cover_photo
    const totalPhotos = (car.photos ?? []).length
    if (hasCover && totalPhotos > 0) return { status: 'green', label: 'كاملة الملحقات' }
    if (totalPhotos > 0 && !hasCover) return { status: 'yellow', label: 'صور بدون غلاف' }
    return { status: 'red', label: 'مفقودة بالكامل' }
  }

  const getDocsStatus = () => {
    if (!car) return { status: 'red', label: 'مفقودة' }
    const hasVin = !!car.vin && car.vin.length >= 5
    const hasPlate = !!car.plate_status
    if (hasVin && hasPlate) return { status: 'green', label: 'مكتمل المعرفات' }
    if (hasVin || hasPlate) return { status: 'yellow', label: 'معرفات جزئية' }
    return { status: 'red', label: 'ناقصة المعرفات' }
  }

  const getInspectionStatus = () => {
    if (!car) return { status: 'neutral', label: 'غير مهيأ' }
    if (car.notes && car.notes.trim().length > 10) return { status: 'green', label: 'فحص مكتمل' }
    if (car.notes) return { status: 'yellow', label: 'ملاحظات أولية' }
    return { status: 'neutral', label: 'لا يتوفر تقرير فحص' }
  }

  const getAccountingStatus = () => {
    if (!canShowInternalInfo) return { status: 'neutral', label: 'محجوب الصلاحية' }
    if (!profData) return { status: 'neutral', label: 'قيد التحميل' }
    const hasPurchase = profData.purchase_price_iqd > 0
    const hasCosts = (profData.costs ?? []).length > 0
    if (hasPurchase && hasCosts) return { status: 'green', label: 'القيود مسواة' }
    if (hasPurchase) return { status: 'yellow', label: 'سعر الشراء فقط' }
    return { status: 'neutral', label: 'البيانات غير مدخلة' }
  }

  const getReservationStatus = () => {
    if (!car) return { status: 'neutral', label: 'غير متوفر' }
    if (car.status === 'Available') return { status: 'green', label: 'متاحة للبيع الفوري' }
    if (car.status === 'Reserved') return { status: 'yellow', label: 'محجوزة مؤقتاً' }
    return { status: 'neutral', label: 'مباعة أو خارج الخدمة' }
  }

  const imgStat = getImagesStatus()
  const docStat = getDocsStatus()
  const inspStat = getInspectionStatus()
  const accStat = getAccountingStatus()
  const resStat = getReservationStatus()

  // Deterministic scoring breakdown model
  const scoreBreakdown = [
    { name: 'صورة الغلاف والألبوم', met: imgStat.status === 'green', weight: 20 },
    { name: 'بيانات اللوحة والهيكل كاملة', met: docStat.status === 'green', weight: 20 },
    { name: 'ملاحظات الفحص الفني والتقييم', met: inspStat.status === 'green', weight: 20 },
    { name: 'البيانات المالية الأساسية للدفاتر', met: accStat.status === 'green', weight: 20 },
    { name: 'حالة التوفر والعرض النشط', met: resStat.status === 'green', weight: 20 }
  ]
  const totalReadinessScore = scoreBreakdown.reduce((acc, curr) => acc + (curr.met ? curr.weight : 0), 0)
  
  const getReadinessLabel = (score: number) => {
    if (score >= 80) return { label: 'جاهزة للبيع', variant: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    if (score >= 50) return { label: 'تحتاج مراجعة', variant: 'bg-amber-50 text-amber-700 border-amber-200' }
    return { label: 'غير جاهزة بعد', variant: 'bg-rose-50 text-rose-700 border-rose-200' }
  }
  const readinessBadge = getReadinessLabel(totalReadinessScore)

  // Local Rule-Based Deterministic AI Insights
  const getRuleBasedInsights = () => {
    const insights = []
    if (!car) return []

    // 1. Cover photo insight
    if (!car.cover_photo) {
      insights.push({
        text: 'لم يتم تعيين صورة غلاف رئيسية للسيارة لجذب المتصفحين على الموقع العام.',
        type: 'تنبيه للنظام',
        timestamp: new Date().toLocaleTimeString('ar-IQ'),
        source: 'قاعدة بيانات النظام'
      })
    }
    // 2. Selling price check
    if (!car.selling_price || car.selling_price === 0) {
      insights.push({
        text: 'لم يحدد سعر البيع المطلوب للسيارة. لا يمكن عرضها للمشترين حتى تسوية السعر.',
        type: 'تنبيه مالي',
        timestamp: new Date().toLocaleTimeString('ar-IQ'),
        source: 'قاعدة بيانات النظام'
      })
    }
    // 3. Days in inventory check
    if (car.created_at) {
      const days = Math.floor((Date.now() - new Date(car.created_at).getTime()) / (1000 * 60 * 60 * 24))
      if (days > 15) {
        insights.push({
          text: `المركبة معلقة في المخزن منذ ${days} يوماً دون حجز أو تسجيل عقد بيع.`,
          type: 'تنبيه حركة المخزون',
          timestamp: new Date().toLocaleTimeString('ar-IQ'),
          source: 'تحليل المخزون'
        })
      }
    }
    // 4. Expenses relative to purchase price
    if (canShowInternalInfo && profData && profData.purchase_price_iqd > 0) {
      const ratio = (profData.costs_total_iqd / profData.purchase_price_iqd) * 100
      if (ratio > 15) {
        insights.push({
          text: `المصاريف المضافة على السيارة تمثل نسبة عالية تعادل ${ratio.toFixed(1)}% من قيمتها الأصلية.`,
          type: 'تنبيه ربحية ومصاريف',
          timestamp: new Date().toLocaleTimeString('ar-IQ'),
          source: 'تحليل الحسابات'
        })
      }
    }
    return insights
  }
  const systemInsights = hasMounted ? getRuleBasedInsights() : []

  // AI Stream Fetch Handler
  const handleAiSend = async (messageText: string) => {
    if (!messageText.trim() || aiLoading) return
    setAiInput('')
    setAiLoading(true)
    setAiStatus('جاري استدعاء خادم المساعد الفني...')

    const updated = [...chatMessages, { role: 'user' as const, content: messageText }]
    setChatMessages(updated)

    // Add temporary empty assistant response
    const assistantIdx = updated.length
    setChatMessages(prev => [...prev, { role: 'model', content: '' }])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: messageText.trim(),
          history: updated.slice(0, -1),
          vehicleId: id
        })
      })

      if (!response.ok) {
        throw new Error('فشل الاتصال بالمساعد الذكي')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('لا يوجد بث مقروء')

      let responseText = ''
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '') continue
          if (line.startsWith('event: ')) {
            const eventType = line.replace('event: ', '').trim()
            const nextLine = lines[lines.indexOf(line) + 1] || buffer
            if (nextLine && nextLine.startsWith('data: ')) {
              const dataStr = nextLine.replace('data: ', '').trim()

              if (eventType === 'status') {
                setAiStatus(dataStr)
              } else if (eventType === 'content') {
                responseText += dataStr
                setChatMessages(prev => {
                  const copy = [...prev]
                  copy[assistantIdx] = { role: 'model', content: responseText }
                  return copy
                })
              } else if (eventType === 'done') {
                setAiStatus(null)
              }
            }
          }
        }
      }
      setAiStatus(null)
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ في الاتصال بالمساعد')
      setChatMessages(prev => {
        const copy = [...prev]
        copy[assistantIdx] = { role: 'model', content: 'عذراً، فشل الاتصال بخادم الذكاء الاصطناعي حالياً. يرجى المحاولة لاحقاً.' }
        return copy
      })
      setAiStatus(null)
    } finally {
      setAiLoading(false)
    }
  }

  // VIN Copy Action
  const copyVin = () => {
    if (car?.vin) {
      navigator.clipboard.writeText(car.vin)
      toast.success('تم نسخ رقم الهيكل إلى الحافظة')
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-8 bg-slate-50 min-h-screen" dir="rtl">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48 bg-slate-200 rounded-xl" />
          <Skeleton className="h-10 w-24 bg-slate-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-96 w-full rounded-[24px] bg-slate-200" />
            <Skeleton className="h-32 w-full rounded-[24px] bg-slate-200" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-48 w-full rounded-[24px] bg-slate-200" />
            <Skeleton className="h-96 w-full rounded-[24px] bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !car) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-32 bg-slate-50 min-h-screen text-slate-900" dir="rtl">
        <div className="h-16 w-16 rounded-full bg-rose-50 flex items-center justify-center border border-rose-200">
          <AlertCircle className="h-8 w-8 text-rose-600" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold font-family-cairo text-slate-900">عذراً، لم نتمكن من جلب بيانات السيارة</h2>
          <p className="text-sm text-slate-500 font-family-cairo">تحقق من حالة الاتصال بالشبكة أو صلاحيات الدخول، ثم حاول مجدداً.</p>
        </div>
        <Button onClick={() => refetch()} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-6">
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  const photos = car.photos ?? []
  const hasPhotos = photos.length > 0
  const activePhoto = photos[activePhotoIdx]

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-900 font-family-cairo" dir="rtl">
      
      {/* ── Top Premium Breadcrumb Header ── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/inventory"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all"
              aria-label="الرجوع إلى المعرض"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>المخزن الرئيسي</span>
                <ChevronRight className="h-3 w-3" />
                <span>{car.branch?.name || 'الفرع العام'}</span>
              </div>
              <h1 className="text-sm font-semibold text-slate-900 mt-0.5">مركز تحكم السيارة</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                toast.success('تم نسخ رابط مشاركة السيارة')
              }}
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-xs px-4 text-slate-700"
            >
              مشاركة الرابط
            </Button>
            {canShowInternalInfo && (
              <Button
                onClick={() => setShowPhotoManager(true)}
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-xs px-4 text-slate-700"
              >
                إدارة الصور ({photos.length})
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-xs px-4 text-slate-700"
            >
              <Link href={`/inventory/${car.id}/edit`}>
                تعديل المواصفات
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-8 py-8 space-y-8">

        {/* ── Section 1: Hero & Identity ("What vehicle am I viewing?") ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Media Viewport (60-68% width on desktop) */}
          <div className="lg:col-span-8 bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
            <div className="relative h-[480px] w-full flex items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
              {hasPhotos && activePhoto ? (
                <img
                  src={photoUrl(activePhoto.filename, activePhoto.subfolder ?? 'vehicles')}
                  alt={`${car.brand} ${car.model}`}
                  className="max-h-[95%] max-w-[95%] object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.06)]"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <ImageOff className="h-12 w-12 stroke-[1.2]" />
                  <p className="text-xs">لا تتوفر صور فوتوغرافية حالياً</p>
                </div>
              )}

              {/* Status Indicator Tag */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <span className={cn('rounded-full px-3 py-1 text-xs font-semibold border backdrop-blur-md', getStatusVariant(car.status))}>
                  {translateStatus(car.status)}
                </span>
                <span className="rounded-full bg-white/90 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur-md">
                  سنة الصنع: {car.manufacturing_year}
                </span>
              </div>
            </div>

            {/* Micro Gallery Thumbnails */}
            {photos.length > 1 && (
              <div className="flex items-center gap-2.5 mt-4 overflow-x-auto py-1 scrollbar-none">
                {photos.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePhotoIdx(idx)}
                    className={cn(
                      "h-14 w-20 rounded-xl overflow-hidden border-2 transition-all duration-200 shrink-0",
                      activePhotoIdx === idx ? "border-emerald-600 ring-2 ring-emerald-500/10" : "border-slate-200 opacity-70 hover:opacity-100"
                    )}
                  >
                    <img
                      src={photoUrl(p.filename, p.subfolder ?? 'vehicles')}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Identity & Actions Card (32-40% width on desktop) */}
          <div className="lg:col-span-4 bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm space-y-6 self-stretch flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">الاسم التجاري والطراز</span>
                <h2 className="text-slate-900 font-bold tracking-tight uppercase mt-1 leading-tight" style={{ fontSize: 'clamp(28px, 3vw, 40px)' }}>
                  {car.brand} <span className="text-slate-500 font-normal">{car.model}</span>
                </h2>
              </div>

              {/* Price block */}
              <div className="border-t border-slate-100 pt-4 space-y-1">
                <span className="text-xs text-slate-400 font-semibold">سعر المبيع المخطط</span>
                <div className="text-slate-950 font-extrabold tracking-tight font-numeric tabular-nums" style={{ fontSize: 'clamp(34px, 4vw, 52px)' }}>
                  {car.selling_price ? formatMoney(car.selling_price, car.currency) : 'غير مسعر'}
                </div>

                {/* Conversion details */}
                {car.selling_price && exchangeRate && (
                  <div className="flex justify-between text-xs text-slate-500 border-t border-slate-50 pt-2 font-numeric">
                    <span>المعادل بالعملة الموازية:</span>
                    <span className="font-semibold text-slate-800">
                      {car.currency === 'USD' ? (
                        formatMoney(car.selling_price * exchangeRate.rate, 'IQD')
                      ) : (
                        formatMoney(Math.round(car.selling_price / exchangeRate.rate), 'USD')
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Identifiers and copy block */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold">رقم هيكل السيارة (VIN)</span>
                  <p className="text-xs font-mono font-bold tracking-wider text-slate-800">{car.vin || 'غير مدرج'}</p>
                </div>
                {car.vin && (
                  <Button
                    onClick={copyVin}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                    aria-label="نسخ رقم الهيكل"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Direct Action trigger button */}
            <div className="space-y-3">
              {car.status === 'Available' ? (
                <Button
                  asChild
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  <Link href={`/sales/new?car_id=${car.id}`}>
                    تسجيل عقد مبيعات السيارة
                  </Link>
                </Button>
              ) : (
                <div className="w-full h-12 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 font-bold">
                  المركبة {translateStatus(car.status)} حالياً
                </div>
              )}
              <p className="text-[10px] text-slate-400 text-center">التقسيط غير متاح حالياً لهذه السيارة.</p>
            </div>
          </div>

        </section>

        {/* ── Section 2: Operational Status & Readiness ("Is this vehicle operationally ready?") ── */}
        <section className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase font-family-cairo">فحص الجاهزية التشغيلية</span>
              <h3 className="text-lg font-bold text-slate-900">مؤشر الجاهزية والاستيفاء المعياري</h3>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={cn("px-3.5 py-1 text-xs font-extrabold rounded-full border tracking-wide", readinessBadge.variant)}>
                {readinessBadge.label} ({totalReadinessScore}%)
              </div>
              <Button
                onClick={() => setShowReadinessDetails(!showReadinessDetails)}
                variant="ghost"
                className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-900"
              >
                <HelpCircle className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>

          {/* Explained Popover Breakdown */}
          {showReadinessDetails && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-800">تفاصيل فحص وتدقيق المستندات والمواصفات:</h4>
              <ul className="space-y-2">
                {scoreBreakdown.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      {item.met ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <X className="h-4 w-4 text-slate-300" />
                      )}
                      {item.name}
                    </span>
                    <span className={item.met ? "text-emerald-700 font-bold" : "text-slate-400 font-medium"}>
                      {item.met ? `مستوفى (+${item.weight}%)` : 'غير مستوفى (0%)'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Operational Matrix List */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { title: 'ألبوم الصور المعرضية', value: imgStat.label, status: imgStat.status },
              { title: 'المستندات والمعرفات الرسمية', value: docStat.label, status: docStat.status },
              { title: 'فحص الحالة والتقييم الفني', value: inspStat.label, status: inspStat.status },
              { title: 'مطابقة قيود الحسابات المالية', value: accStat.label, status: accStat.status },
              { title: 'حالة الحجز والتوفر الفعلي', value: resStat.label, status: resStat.status }
            ].map(item => (
              <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col justify-between items-start gap-4">
                <span className="text-xs text-slate-500 font-medium">{item.title}</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    item.status === 'green' && 'bg-emerald-500',
                    item.status === 'yellow' && 'bg-amber-400',
                    item.status === 'red' && 'bg-rose-500',
                    item.status === 'neutral' && 'bg-slate-300'
                  )} />
                  <span className="text-xs font-bold text-slate-800">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 3: Financials ("Is this vehicle financially healthy?") ── */}
        {canShowInternalInfo && (
          <section className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="h-4 w-1 rounded-full bg-emerald-600" />
              <h3 className="text-lg font-bold text-slate-900">الربحية وإجمالي التكلفة الدفترية المترتبة</h3>
            </div>

            {/* Elegant KPI row */}
            {isProfError ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs text-rose-700 flex items-center justify-between">
                <span>عذراً، فشل جلب مؤشرات التكلفة المالية للمركبة من الخادم المالي.</span>
                <Button onClick={() => refetchProf()} variant="outline" className="h-8 rounded-lg border-rose-200 text-rose-700 bg-white">
                  إعادة المحاولة
                </Button>
              </div>
            ) : profData ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'سعر الشراء الأساسي', value: formatMoney(profData.purchase_price_iqd, 'IQD'), cls: 'text-slate-900' },
                  { label: 'المصاريف الإضافية المسجلة', value: formatMoney(profData.costs_total_iqd, 'IQD'), cls: 'text-amber-600' },
                  { label: 'التكلفة الإجمالية المترتبة', value: formatMoney(profData.total_cost_iqd, 'IQD'), cls: 'text-orange-600' },
                  { label: 'سعر البيع المعتمد بالدينار', value: profData.selling_price_iqd ? formatMoney(profData.selling_price_iqd, 'IQD') : 'غير محدد', cls: 'text-slate-900' },
                  {
                    label: 'صافي الربح المتوقع',
                    value: profData.net_profit_iqd !== null
                      ? `${formatMoney(profData.net_profit_iqd, 'IQD')} (${profData.profit_pct?.toFixed(1)}%)`
                      : '—',
                    cls: profData.net_profit_iqd !== null && profData.net_profit_iqd >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }
                ].map(item => (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-1">
                    <span className="text-xs text-slate-500 font-medium leading-none">{item.label}</span>
                    <p className={cn('text-sm font-black mt-2 font-numeric tabular-nums', item.cls)}>{item.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-slate-100" />)}
              </div>
            )}

            {/* Custom SVG horizontal progress/comparison visualization */}
            {profData && (
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-6 space-y-4">
                <div className="flex justify-between text-xs text-slate-500 font-numeric">
                  <span>إجمالي التكلفة المدفوعة ({formatMoney(profData.total_cost_iqd, 'IQD')})</span>
                  <span>الهدف البيعي ({profData.selling_price_iqd ? formatMoney(profData.selling_price_iqd, 'IQD') : 'غير محدد'})</span>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden relative">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{
                      width: `${profData.selling_price_iqd ? Math.min((profData.total_cost_iqd / profData.selling_price_iqd) * 100, 100) : 0}%`
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Info className="h-3.5 w-3.5" />
                  <span>الشريط يمثل النسبة المئوية للمصاريف من السعر المقدر للمبيع. (مؤشر العائد على الاستثمار ROI غير متاح بالباكيند حالياً)</span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Section 4: AI Insights ("What should I know?") ── */}
        <section className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">مستشار البيانات الفني (AI Copilot)</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column: AI insights (Deterministic Rule-Based insights) */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700">التنبيهات البرمجية وتكامل القواعد</h4>
              
              <div className="space-y-3">
                {systemInsights.length > 0 ? (
                  systemInsights.map((ins, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 text-[9px] font-bold">
                          {ins.type}
                        </span>
                        <span className="text-[9px] text-slate-400 font-numeric">{ins.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{ins.text}</p>
                      <div className="text-[8px] text-slate-400">مصدر التدقيق: {ins.source}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                    تم استيفاء كامل القواعد المحددة للسيارة بنجاح.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Ask AI Chat widget */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700">محادثة المساعد الفني للمخزن</h4>

              <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-4 space-y-4">
                {/* Chat window */}
                <div className="h-48 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] font-medium",
                        msg.role === 'user'
                          ? "bg-slate-200 text-slate-800 mr-auto rounded-tl-none text-left"
                          : "bg-white border border-slate-200 text-slate-800 ml-auto rounded-tr-none text-right shadow-sm"
                      )}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                      <span>{aiStatus || 'جاري استدعاء المعالجة الذكية...'}</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Preset quick commands */}
                <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                  {[
                    'هل سعر السيارة مناسب لحالة السوق؟',
                    'حلل المشاكل الفنية من تقرير الفحص',
                    'ما قيمة الأرباح والعائد المتوقع؟'
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => handleAiSend(q)}
                      disabled={aiLoading}
                      className="text-[10px] text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 bg-white rounded-lg px-2.5 py-1 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="flex gap-2">
                  <Input
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    placeholder="اسأل المساعد عن السيارة..."
                    className="h-10 text-xs border-slate-200 bg-white text-slate-900 rounded-xl focus-visible:ring-emerald-500"
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAiSend(aiInput)
                    }}
                  />
                  <Button
                    onClick={() => handleAiSend(aiInput)}
                    disabled={aiLoading || !aiInput.trim()}
                    className="h-10 w-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl p-0 flex items-center justify-center shrink-0"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── Section 5: Specifications ("What is this vehicle?") ── */}
        <section className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">المواصفات الفنية والميكانيكية للمركبة</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
            <div className="space-y-4 rounded-2xl bg-slate-50/50 p-5 border border-slate-100">
              <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-slate-400" /> الأداء والمحرك
              </h4>
              <ul className="space-y-2.5">
                <li className="flex justify-between"><span>سعة المحرك الكلية:</span><span className="font-bold text-slate-900">{car.engine_size ? `${car.engine_size} لتر` : 'غير محدد'}</span></li>
                <li className="flex justify-between"><span>نوع وقود التشغيل:</span><span className="font-bold text-slate-900">{car.fuel_type ? (FUEL_LABEL[car.fuel_type] ?? car.fuel_type) : 'غير محدد'}</span></li>
                <li className="flex justify-between"><span>علبة ناقل الحركة:</span><span className="font-bold text-slate-900">{car.transmission ? (TRANS_LABEL[car.transmission] ?? car.transmission) : 'غير محدد'}</span></li>
              </ul>
            </div>

            <div className="space-y-4 rounded-2xl bg-slate-50/50 p-5 border border-slate-100">
              <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-slate-400" /> الأبعاد والملامح
              </h4>
              <ul className="space-y-2.5">
                <li className="flex justify-between"><span>الحالة الفنية العامة:</span><span className="font-bold text-slate-900">{car.condition ? (CONDITION_LABEL[car.condition] ?? car.condition) : 'غير محدد'}</span></li>
                <li className="flex justify-between"><span>عدد مقاعد المقصورة:</span><span className="font-bold text-slate-900 font-numeric">{car.seat_count ? `${car.seat_count} مقاعد` : 'غير محدد'}</span></li>
                <li className="flex justify-between"><span>الخامة الأساسية للمقاعد:</span><span className="font-bold text-slate-900">{car.seat_material || 'غير محدد'}</span></li>
              </ul>
            </div>

            <div className="space-y-4 rounded-2xl bg-slate-50/50 p-5 border border-slate-100">
              <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                <Tag className="h-4.5 w-4.5 text-slate-400" /> الترخيص والتسجيل
              </h4>
              <ul className="space-y-2.5">
                <li className="flex justify-between"><span>دولة وبلد الاستيراد:</span><span className="font-bold text-slate-900">{car.import_country || 'غير محدد'}</span></li>
                <li className="flex justify-between"><span>حالة ترخيص اللوحة:</span><span className="font-bold text-slate-900">{car.plate_status ? (PLATE_LABEL[car.plate_status] ?? car.plate_status) : 'غير محدد'}</span></li>
                <li className="flex justify-between"><span>الرقم التسلسلي للوحة:</span><span className="font-bold text-slate-900 font-mono">{car.plate_number || 'بدون لوحة'}</span></li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Section 6: Journey ("What happened to this vehicle?") ── */}
        <section className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Clock className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">سجل الأحداث والرحلة التاريخية</h3>
          </div>

          <div className="relative border-r-2 border-slate-200 mr-3 pr-6 space-y-6">
            
            {/* Created step */}
            <div className="relative">
              <div className="absolute top-1.5 -right-[32.5px] h-4.5 w-4.5 rounded-full border-4 border-emerald-600 bg-white flex items-center justify-center" />
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-numeric font-bold">{hasMounted && car.created_at ? new Date(car.created_at).toLocaleDateString('ar-IQ') : '—'}</span>
                <h4 className="text-xs font-bold text-slate-900">إدراج قيد السيارة بالدفاتر العامة</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">تم تسجيل هيكل المركبة وبيانات المعرض في سجلات الفرع بنجاح.</p>
              </div>
            </div>

            {/* Purchase step */}
            {car.purchase_price > 0 && (
              <div className="relative">
                <div className="absolute top-1.5 -right-[32.5px] h-4.5 w-4.5 rounded-full border-4 border-emerald-600 bg-white flex items-center justify-center" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900">توثيق قيمة التوريد للمخزن</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    تم توثيق القيمة الشرائية للسيارة وتصفيتها محاسبياً لحسابات الفرع.
                  </p>
                </div>
              </div>
            )}

            {/* Extra Expenses step */}
            {canShowInternalInfo && profData?.costs && profData.costs.length > 0 && (
              <div className="relative">
                <div className="absolute top-1.5 -right-[32.5px] h-4.5 w-4.5 rounded-full border-4 border-emerald-600 bg-white flex items-center justify-center" />
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-numeric font-bold">
                    {hasMounted && new Date(profData.costs[profData.costs.length - 1].created_at || '').toLocaleDateString('ar-IQ')}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">إدراج مصاريف تجهيز وتخليص جمركي</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    تسجيل إجمالي مصاريف إضافية بلغت {formatMoney(profData.costs_total_iqd, 'IQD')} وتم دمجها تلقائياً بالقيمة الدفترية.
                  </p>
                </div>
              </div>
            )}

            {/* Current Sales Status */}
            <div className="relative">
              <div className="absolute top-1.5 -right-[32.5px] h-4.5 w-4.5 rounded-full border-4 border-amber-500 bg-white flex items-center justify-center" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-700">الحالة التشغيلية للمركبة</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  السيارة حالياً بحالة: <strong className="text-slate-800">{translateStatus(car.status)}</strong> في فرع المعرض.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ── Section 7: Expenses ("Where did the money go?") ── */}
        {canShowInternalInfo && profData && (
          <section className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-900">سجل تفاصيل فواتير المصاريف الملحقة</h3>
            </div>

            {profData.costs && profData.costs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profData.costs.map((cost: any) => (
                  <div key={cost.id} className="flex justify-between items-center p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900">{COST_TYPE_LABELS[cost.cost_type] ?? cost.cost_type}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">{cost.description || 'لا يتوفر وصف إضافي للمصروف'}</p>
                    </div>
                    <span className="font-numeric tabular-nums text-xs font-bold text-slate-900">
                      {formatMoney(cost.amount, cost.currency as 'USD' | 'IQD')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                لا توجد مصاريف إضافية مسجلة لهذه السيارة حتى الآن.
              </div>
            )}

            {/* Cost logging inline form */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-4">
              <h4 className="text-xs font-bold text-slate-800">إدراج فاتورة مصروف جديدة للمركبة</h4>
              
              <div className="flex flex-wrap gap-3">
                <Select value={newCostType} onValueChange={setNewCostType}>
                  <SelectTrigger className="h-10 w-[180px] border-slate-200 bg-white text-xs rounded-xl">
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
                  className="h-10 w-[120px] border-slate-200 bg-white text-xs font-numeric rounded-xl"
                />

                <Select value={newCostCurrency} onValueChange={setNewCostCurrency}>
                  <SelectTrigger className="h-10 w-[90px] border-slate-200 bg-white text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="IQD">IQD</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="ملاحظات وتفاصيل الفاتورة..."
                  value={newCostDesc}
                  onChange={e => setNewCostDesc(e.target.value)}
                  className="h-10 min-w-[200px] flex-1 border-slate-200 bg-white text-xs rounded-xl"
                />

                <Button
                  onClick={() => addCostMutation.mutate()}
                  disabled={!newCostAmount || parseFloat(newCostAmount) <= 0 || addCostMutation.isPending}
                  className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 flex items-center gap-1.5"
                >
                  {addCostMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  إضافة المصروف
                </Button>
              </div>

              <p className="text-[10px] text-slate-400">
                ملاحظة: ميزة إرفاق الفواتير والوصولات الورقية تتطلب تفعيل التخزين المالي المشفر بالباكيند لأسباب أمنية.
              </p>
            </div>
          </section>
        )}

      </div>

      {/* ── Photo Manager Modal ── */}
      <AnimatePresence>
        {showPhotoManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPhotoManager(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-slate-200 bg-white p-6 shadow-xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 font-family-cairo">إدارة صور ألبوم السيارة</h3>
                <Button
                  onClick={() => setShowPhotoManager(false)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Upload Dropvault Component */}
              <div className="mt-6 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50">
                <Upload className="h-8 w-8 text-slate-400 stroke-[1.2]" />
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-slate-800">اسحب الملفات أو اخترها من الجهاز</p>
                  <p className="text-[10px] text-slate-400">تدعم ملفات JPG, PNG, WEBP فقط وبحد أقصى 5 ميجابايت.</p>
                </div>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={async e => {
                    const files = e.target.files
                    if (files && files.length > 0) {
                      toast.loading('جاري رفع الصور الفعالة لفرع المعرض...')
                      await uploadCarPhotos(id, Array.from(files))
                      qc.invalidateQueries({ queryKey: ['car', id] })
                      toast.dismiss()
                      toast.success('تم رفع الصور الإضافية بنجاح')
                    }
                  }}
                  className="hidden"
                  id="album-file-upload"
                />
                <Button
                  asChild
                  variant="outline"
                  className="h-9 text-xs rounded-xl border-slate-200 bg-white hover:bg-slate-50 mt-2"
                >
                  <label htmlFor="album-file-upload" className="cursor-pointer">
                    تصفح الملفات
                  </label>
                </Button>
              </div>

              {/* Album Photos List */}
              {photos.length > 0 ? (
                <div className="grid grid-cols-4 gap-3 mt-6 max-h-60 overflow-y-auto pr-1">
                  {photos.map((p, idx) => (
                    <div key={p.id} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-50">
                      <img
                        src={photoUrl(p.filename, p.subfolder ?? 'vehicles')}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={async () => {
                          await deleteCarPhoto(id, p.id)
                          qc.invalidateQueries({ queryKey: ['car', id] })
                          toast.success('تم حذف الصورة من ألبوم المعرض')
                        }}
                        className="absolute top-1.5 right-1.5 h-6 w-6 rounded bg-slate-900/60 hover:bg-rose-600 flex items-center justify-center text-white border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="حذف الصورة"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400 mt-6">لا توجد صور في ألبوم المعرض حالياً.</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}
