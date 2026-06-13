'use client'

import type { ReactNode } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ContractField {
  label: string
  value: ReactNode
}

export interface ContractTableColumn<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  className?: string
}

export function PrintableContract({
  title,
  contractNumber,
  contractDate,
  branchName,
  intro,
  parties,
  vehicle,
  financial,
  children,
}: {
  title: string
  contractNumber: string
  contractDate: string
  branchName?: string | null
  intro: string
  parties: Array<{ title: string; fields: ContractField[] }>
  vehicle: ContractField[]
  financial: ContractField[]
  children?: ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#07111f] px-4 py-6 text-foreground print:bg-white print:px-0 print:py-0" dir="rtl">
      <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-lg font-bold">العقود</h1>
          <p className="text-xs text-muted-foreground">نسخة جاهزة للطباعة أو الحفظ بصيغة PDF</p>
        </div>
        <Button onClick={() => window.print()} className="gap-2 bg-violet-600 text-white hover:bg-violet-500">
          <Printer className="h-4 w-4" />
          طباعة
        </Button>
      </div>

      <article className="contract-page mx-auto max-w-5xl rounded-lg border border-border/50 bg-white p-8 text-slate-950 shadow-2xl print:m-0 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="border-b-2 border-slate-900 pb-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold">شركة الأصدقاء لتجارة السيارات</p>
              <p className="mt-1 text-xs text-slate-600">بيع وشراء السيارات وتنظيم العقود</p>
            </div>
            <div className="flex h-20 w-[180px] items-center justify-center border-2 border-dashed border-slate-300 bg-slate-50 p-2">
              <img
                src="/logo.png"
                alt="شركة الأصدقاء"
                className="h-full w-auto object-contain"
              />
            </div>
          </div>
          <div className="mt-5 text-center">
            <h2 className="text-2xl font-black">{title}</h2>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm">
              <span>رقم العقد: <strong>{contractNumber}</strong></span>
              <span>التاريخ والوقت: <strong>{contractDate}</strong></span>
              <span>الفرع: <strong>{branchName || '-'}</strong></span>
            </div>
          </div>
        </header>

        <p className="mt-5 rounded border border-slate-200 bg-slate-50 p-4 text-sm leading-8">{intro}</p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2">
          {parties.map((party) => (
            <ContractSection key={party.title} title={party.title} fields={party.fields} />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2">
          <ContractSection title="بيانات المركبة" fields={vehicle} />
          <ContractSection title="التفاصيل المالية" fields={financial} />
        </div>

        {children}

        <section className="mt-6">
          <h3 className="mb-3 border-b border-slate-300 pb-2 text-sm font-bold">بنود عامة</h3>
          <ol className="list-decimal space-y-2 pr-5 text-sm leading-7">
            <li>أقر الطرفان بصحة البيانات والمبالغ المبينة في هذا العقد كما هي مسجلة في النظام.</li>
            <li>يلتزم كل طرف بتنفيذ الالتزامات المالية والقانونية المترتبة عليه حسب هذا العقد.</li>
            <li>تعد هذه النسخة صالحة للطباعة والحفظ، وتعتمد على بيانات الفاتورة الأصلية دون تعديل يدوي.</li>
          </ol>
        </section>

        <section className="mt-10 grid grid-cols-3 gap-5 text-center">
          {['البائع', 'المشتري', 'منظم العقد'].map((label) => (
            <div key={label} className="pt-10">
              <div className="border-t border-slate-900 pt-2 text-sm font-bold">{label}</div>
              <p className="mt-1 text-xs text-muted-foreground">الاسم والتوقيع</p>
            </div>
          ))}
        </section>
      </article>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }
          body {
            background: white !important;
          }
          .contract-page {
            color: #0f172a !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export function ContractSection({ title, fields }: { title: string; fields: ContractField[] }) {
  return (
    <section className="rounded border border-slate-200">
      <h3 className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-sm font-bold">{title}</h3>
      <dl className="divide-y divide-slate-100">
        {fields.map((field) => (
          <div key={field.label} className="grid grid-cols-[120px_1fr] gap-3 px-3 py-2 text-sm">
            <dt className="text-muted-foreground">{field.label}</dt>
            <dd className="font-semibold text-slate-950">{field.value || '-'}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function ContractTable<T>({
  title,
  rows,
  columns,
  emptyText,
}: {
  title: string
  rows: T[]
  columns: ContractTableColumn<T>[]
  emptyText: string
}) {
  return (
    <section className="mt-5 rounded border border-slate-200">
      <h3 className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-sm font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="px-3 py-5 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {columns.map((column) => (
                  <th key={column.key} className={cn('px-3 py-2 text-start text-xs font-bold text-slate-600', column.className)}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-slate-100">
                  {columns.map((column) => (
                    <td key={column.key} className={cn('px-3 py-2 text-xs text-slate-900', column.className)}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
