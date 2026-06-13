'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2, Printer, User, Save, Check } from 'lucide-react'
import { getSaleById } from '@/lib/api/sales'
import { getCarById } from '@/lib/api/inventory'
import { getCustomerById } from '@/lib/api/customers'
import { getEmployees, setSaleRep } from '@/lib/api/employees'
import { Button } from '@/components/ui/button'
import { PrintableSaleDocument } from '@/components/contracts/PrintableSaleDocument'

export default function SaleReceiptPage() {
  const params = useParams<{ id: string }>()
  const saleId = params.id
  const queryClient = useQueryClient()

  const [savedOk, setSavedOk] = useState(false)

  const { data: sale, isLoading: saleLoading, isError: saleError } = useQuery({
    queryKey: ['sale-receipt', saleId],
    queryFn:  () => getSaleById(saleId),
    enabled:  !!saleId,
    retry: 1,
  })

  const { data: fullCar } = useQuery({
    queryKey: ['car-receipt', sale?.car_id],
    queryFn:  () => getCarById(sale!.car_id!),
    enabled:  !!sale?.car_id,
    staleTime: 60_000,
  })

  const { data: fullBuyer } = useQuery({
    queryKey: ['buyer-receipt', sale?.buyer_id],
    queryFn:  () => getCustomerById(sale!.buyer_id!),
    enabled:  !!sale?.buyer_id,
    staleTime: 60_000,
  })

  const { data: employeesData } = useQuery({
    queryKey: ['employees-active'],
    queryFn:  () => getEmployees({ active_only: true, per_page: 100 }),
    staleTime: 120_000,
  })

  const employees = employeesData?.items ?? []

  /* Current selection: use the snapshot stored on the sale, or first employee */
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null)

  /* After sale loads, initialise selector from snapshot */
  const effectiveRepId = selectedEmpId ?? sale?.sales_rep_id ?? null

  const repMutation = useMutation({
    mutationFn: (empId: number | null) => setSaleRep(saleId, empId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-receipt', saleId] })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
    },
  })

  /* loading / error states */
  if (saleLoading) {
    return (
      <div className="receipt-shell" dir="rtl">
        <div className="receipt-state">
          <Loader2 className="receipt-spin" />
          <p>جاري تحميل وصل القبض...</p>
        </div>
      </div>
    )
  }

  if (saleError || !sale) {
    return (
      <div className="receipt-shell" dir="rtl">
        <div className="receipt-state">
          <AlertCircle className="receipt-err-icon" />
          <p>تعذّر تحميل البيانات</p>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  /* Build a merged sale that reflects the current UI rep selection */
  const selectedEmp = employees.find(e => e.id === effectiveRepId) ?? null
  const saleWithRep = {
    ...sale,
    sales_rep_id:       selectedEmp?.id        ?? sale.sales_rep_id,
    sales_rep_name:     selectedEmp?.full_name  ?? sale.sales_rep_name,
    sales_rep_phone:    selectedEmp?.phone      ?? sale.sales_rep_phone,
    sales_rep_id_number: selectedEmp?.id_number  ?? sale.sales_rep_id_number,
    sales_rep_title:    selectedEmp?.title      ?? sale.sales_rep_title,
    sales_rep_address:  selectedEmp?.address    ?? sale.sales_rep_address,
  }

  return (
    <div className="receipt-shell" dir="rtl">

      {/* ── Toolbar (hidden in print) ── */}
      <div className="receipt-toolbar print:hidden">
        <div>
          <h1 className="receipt-toolbar-title">وصل القبض</h1>
          <p className="receipt-toolbar-sub">جاهز للطباعة أو الحفظ PDF</p>
        </div>

        {/* Employee / rep selector */}
        <div className="receipt-rep-wrap">
          <label className="receipt-rep-label">
            <User className="receipt-rep-icon" />
            ممثل البائع
          </label>
          <select
            value={effectiveRepId ?? ''}
            onChange={(e) => {
              const val = e.target.value
              setSelectedEmpId(val ? Number(val) : null)
            }}
            className="receipt-rep-select"
            aria-label="اختر ممثل البائع"
            title="ممثل البائع"
          >
            <option value="">— اختر موظفاً —</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>
          <button
            type="button"
            className="receipt-save-btn"
            onClick={() => repMutation.mutate(effectiveRepId)}
            disabled={repMutation.isPending}
            title="حفظ الاختيار مع الفاتورة"
          >
            {savedOk ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          </button>
        </div>

        <Button onClick={() => window.print()} className="receipt-print-btn">
          <Printer className="w-4 h-4" />
          طباعة
        </Button>
      </div>

      {/* Document */}
      <PrintableSaleDocument
        sale={saleWithRep}
        fullCar={fullCar}
        fullBuyer={fullBuyer}
        mode="receipt"
      />

      <style jsx global>{`
        .receipt-shell {
          min-height: 100vh;
          background: #0f1621;
          padding: 24px 16px;
          direction: rtl;
        }
        .receipt-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; min-height: 60vh; gap: 12px; color: #94a3b8;
        }
        .receipt-spin      { width: 32px; height: 32px; animation: rspin 1s linear infinite; }
        .receipt-err-icon  { width: 36px; height: 36px; color: #f87171; }
        @keyframes rspin { to { transform: rotate(360deg); } }

        .receipt-toolbar {
          max-width: 900px; margin: 0 auto 16px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
        }
        .receipt-toolbar-title { font-size: 18px; font-weight: 700; color: #f1f5f9; }
        .receipt-toolbar-sub   { font-size: 12px; color: #64748b; margin-top: 2px; }

        .receipt-rep-wrap {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 6px 10px;
        }
        .receipt-rep-label {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: #94a3b8; white-space: nowrap;
        }
        .receipt-rep-icon { width: 12px; height: 12px; }
        .receipt-rep-select {
          background: transparent; border: none; color: #e2e8f0;
          font-size: 13px; font-weight: 600; outline: none; cursor: pointer;
          font-family: 'Tajawal', sans-serif; max-width: 180px;
        }
        .receipt-rep-select option { background: #0f1621; color: #e2e8f0; }
        .receipt-save-btn {
          background: transparent; border: 1px solid rgba(255,255,255,0.15);
          border-radius: 6px; padding: 4px 8px; color: #94a3b8;
          cursor: pointer; display: flex; align-items: center;
          transition: all 0.15s;
        }
        .receipt-save-btn:hover { border-color: #c9a227; color: #c9a227; }

        .receipt-print-btn {
          background: #1e3a5f !important; color: #f1f5f9 !important;
          border: 1px solid #2d5490 !important;
          display: flex; align-items: center; gap: 6px;
          padding: 8px 18px; border-radius: 8px;
          font-size: 13px; cursor: pointer;
        }
        .receipt-print-btn:hover { background: #2d5490 !important; }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          .receipt-shell {
            min-height: unset;
            background: white !important;
            padding: 0;
          }
          .receipt-toolbar { display: none !important; }
          aside, header, nav, .app-topnav, [data-radix-scroll-area-viewport] { display: none !important; }
          body { margin: 0 !important; background: white !important; }
        }
      `}</style>
    </div>
  )
}
