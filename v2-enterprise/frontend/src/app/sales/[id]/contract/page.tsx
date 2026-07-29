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

export default function SaleContractPage() {
  const params = useParams<{ id: string }>()
  const saleId = params.id
  const queryClient = useQueryClient()

  const [savedOk, setSavedOk] = useState(false)
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null)

  const { data: sale, isLoading, isError } = useQuery({
    queryKey: ['sale-contract', saleId],
    queryFn:  () => getSaleById(saleId),
    enabled:  !!saleId,
    retry: 1,
  })

  const { data: fullCar } = useQuery({
    queryKey: ['car-contract', sale?.car_id],
    queryFn:  () => getCarById(sale!.car_id!),
    enabled:  !!sale?.car_id,
    staleTime: 60_000,
  })

  const { data: fullBuyer } = useQuery({
    queryKey: ['buyer-contract', sale?.buyer_id],
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
  const effectiveRepId: string | null = selectedEmpId ?? (sale?.sales_rep_id != null ? String(sale.sales_rep_id) : null)

  const repMutation = useMutation({
    mutationFn: (empId: string | null) => setSaleRep(saleId, empId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-contract', saleId] })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
    },
  })

  if (isLoading) {
    return (
      <div className="contract-shell" dir="rtl">
        <div className="contract-state">
          <Loader2 className="contract-spin" />
          <p>جاري تحميل عقد البيع...</p>
        </div>
      </div>
    )
  }

  if (isError || !sale) {
    return (
      <div className="contract-shell" dir="rtl">
        <div className="contract-state">
          <AlertCircle className="contract-err-icon" />
          <p>تعذّر تحميل عقد البيع</p>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  const selectedEmp = employees.find(e => String(e.id) === effectiveRepId) ?? null
  const saleWithRep = {
    ...sale,
    sales_rep_id:        selectedEmp?.id        ?? sale.sales_rep_id,
    sales_rep_name:      selectedEmp?.full_name  ?? sale.sales_rep_name,
    sales_rep_phone:     selectedEmp?.phone      ?? sale.sales_rep_phone,
    sales_rep_id_number: selectedEmp?.id_number  ?? sale.sales_rep_id_number,
    sales_rep_title:     selectedEmp?.title      ?? sale.sales_rep_title,
    sales_rep_address:   selectedEmp?.address    ?? sale.sales_rep_address,
  }

  return (
    <div className="contract-shell" dir="rtl">

      {/* ── Toolbar (hidden in print) ── */}
      <div className="contract-toolbar print:hidden">
        <div>
          <h1 className="contract-toolbar-title">عقد بيع مركبة</h1>
          <p className="contract-toolbar-sub">جاهز للطباعة أو الحفظ PDF</p>
        </div>

        <div className="contract-rep-wrap">
          <label className="contract-rep-label">
            <User className="contract-rep-icon" />
            ممثل البائع
          </label>
          <select
            value={effectiveRepId ?? ''}
            onChange={(e) => {
              const val = e.target.value
              setSelectedEmpId(val || null)
            }}
            className="contract-rep-select"
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
            className="contract-save-btn"
            onClick={() => repMutation.mutate(effectiveRepId)}
            disabled={repMutation.isPending}
            title="حفظ الاختيار مع العقد"
          >
            {savedOk ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          </button>
        </div>

        <Button onClick={() => window.print()} className="contract-print-btn">
          <Printer className="w-4 h-4" />
          طباعة
        </Button>
      </div>

      {/* Document */}
      <PrintableSaleDocument
        sale={saleWithRep}
        fullCar={fullCar}
        fullBuyer={fullBuyer}
        mode="contract"
      />

      <style jsx global>{`
        .contract-shell {
          min-height: 100vh;
          background: #0f1621;
          padding: 24px 16px;
          direction: rtl;
        }
        .contract-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; min-height: 60vh; gap: 12px; color: #94a3b8;
        }
        .contract-spin     { width: 32px; height: 32px; animation: cspin 1s linear infinite; }
        .contract-err-icon { width: 36px; height: 36px; color: #f87171; }
        @keyframes cspin { to { transform: rotate(360deg); } }

        .contract-toolbar {
          max-width: 900px; margin: 0 auto 16px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
        }
        .contract-toolbar-title { font-size: 18px; font-weight: 700; color: #f1f5f9; }
        .contract-toolbar-sub   { font-size: 12px; color: #64748b; margin-top: 2px; }

        .contract-rep-wrap {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 6px 10px;
        }
        .contract-rep-label {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: #94a3b8; white-space: nowrap;
        }
        .contract-rep-icon   { width: 12px; height: 12px; }
        .contract-rep-select {
          background: transparent; border: none; color: #e2e8f0;
          font-size: 13px; font-weight: 600; outline: none; cursor: pointer;
          font-family: 'Tajawal', sans-serif; max-width: 180px;
        }
        .contract-rep-select option { background: #0f1621; color: #e2e8f0; }
        .contract-save-btn {
          background: transparent; border: 1px solid rgba(255,255,255,0.15);
          border-radius: 6px; padding: 4px 8px; color: #94a3b8;
          cursor: pointer; display: flex; align-items: center; transition: all 0.15s;
        }
        .contract-save-btn:hover { border-color: #c9a227; color: #c9a227; }

        .contract-print-btn {
          background: #1e3a5f !important; color: #f1f5f9 !important;
          border: 1px solid #2d5490 !important;
          display: flex; align-items: center; gap: 6px;
          padding: 8px 18px; border-radius: 8px;
          font-size: 13px; cursor: pointer;
        }
        .contract-print-btn:hover { background: #2d5490 !important; }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          .contract-shell { min-height: unset; background: white !important; padding: 0; }
          .contract-toolbar { display: none !important; }
          aside, header, nav, .app-topnav, [data-radix-scroll-area-viewport] { display: none !important; }
          body { margin: 0 !important; background: white !important; }
        }
      `}</style>
    </div>
  )
}
