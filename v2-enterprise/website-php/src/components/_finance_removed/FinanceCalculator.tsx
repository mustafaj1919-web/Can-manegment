"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { VEHICLES } from "@/lib/data/vehicles";
import { calculateMonthlyPayment } from "@/lib/finance";
import { cn, formatCurrency } from "@/lib/utils";
import { LinkButton } from "@/components/ui/Button";

interface FinanceCalculatorProps {
  vehicleId?: string;
  compact?: boolean;
}

export default function FinanceCalculator({ vehicleId, compact = false }: FinanceCalculatorProps) {
  const { locale } = useI18n();
  const [selectedId, setSelectedId] = useState(vehicleId ?? VEHICLES[0].id);
  const [downPct, setDownPct] = useState(20);
  const [term, setTerm] = useState(48);

  const vehicle = VEHICLES.find((v) => v.id === selectedId) ?? VEHICLES[0];
  const rate = 6.5;

  const result = useMemo(
    () => calculateMonthlyPayment({ price: vehicle.priceUSD, downPaymentPct: downPct, termMonths: term, annualRatePct: rate }),
    [vehicle.priceUSD, downPct, term],
  );

  return (
    <div className={cn("card-elevated grid gap-8 rounded-3xl p-6 md:p-8", !compact && "lg:grid-cols-[1.1fr_0.9fr]")}>
      <div className="flex flex-col gap-6">
        {!vehicleId && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-fg-subtle">
              {locale === "ar" ? "اختر السيارة" : "Select Vehicle"}
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-border-strong bg-bg px-4 text-sm font-semibold outline-none focus:border-primary"
            >
              {VEHICLES.map((v) => (
                <option key={v.id} value={v.id}>
                  {locale === "ar" ? v.nameAr : v.nameEn} — {formatCurrency(v.priceUSD)}
                </option>
              ))}
            </select>
          </div>
        )}

        <SliderField
          label={locale === "ar" ? "الدفعة الأولى" : "Down Payment"}
          value={downPct}
          min={10}
          max={70}
          step={5}
          onChange={setDownPct}
          display={`${downPct}% · ${formatCurrency(result.downPayment)}`}
        />

        <SliderField
          label={locale === "ar" ? "مدة التقسيط (شهر)" : "Term (months)"}
          value={term}
          min={12}
          max={72}
          step={6}
          onChange={setTerm}
          display={`${term} ${locale === "ar" ? "شهر" : "months"}`}
        />

        <p className="text-xs text-fg-subtle">
          {locale === "ar"
            ? `معدل فائدة تقديري ${rate}% سنوياً — الرقم النهائي يخضع للتقييم الائتماني.`
            : `Estimated annual rate ${rate}% — final terms subject to credit approval.`}
        </p>
      </div>

      <div className="flex flex-col justify-between rounded-2xl bg-bg-muted p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-fg-subtle">
            {locale === "ar" ? "القسط الشهري التقديري" : "Estimated Monthly Payment"}
          </p>
          <p className="mt-2 text-4xl font-black text-primary">{formatCurrency(Math.round(result.monthly))}</p>
          <p className="mt-1 text-sm text-fg-subtle">/{locale === "ar" ? "شهرياً" : "month"}</p>
        </div>

        <dl className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
          <div className="flex justify-between">
            <dt className="text-fg-subtle">{locale === "ar" ? "سعر السيارة" : "Vehicle Price"}</dt>
            <dd className="font-bold">{formatCurrency(vehicle.priceUSD)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-subtle">{locale === "ar" ? "الدفعة الأولى" : "Down Payment"}</dt>
            <dd className="font-bold">{formatCurrency(Math.round(result.downPayment))}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-subtle">{locale === "ar" ? "إجمالي المبلغ" : "Total Payable"}</dt>
            <dd className="font-bold">{formatCurrency(Math.round(result.totalPayable))}</dd>
          </div>
        </dl>

        <LinkButton href={`/finance/installments?vehicle=${vehicle.slug}`} className="mt-6 w-full justify-center">
          {locale === "ar" ? "تقدّم بطلب التمويل" : "Apply for Financing"}
        </LinkButton>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wide text-fg-subtle">{label}</label>
        <span className="text-sm font-extrabold text-primary">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-bg-muted accent-primary"
      />
    </div>
  );
}
