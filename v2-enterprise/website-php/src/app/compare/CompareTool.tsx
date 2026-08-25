"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { X, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { VEHICLES } from "@/lib/data/vehicles";
import { formatCurrency } from "@/lib/utils";
import VehicleStudioRender from "@/components/vehicles/VehicleStudioRender";
import { LinkButton } from "@/components/ui/Button";

const SPEC_ROWS: { key: string; en: string; ar: string; format: (v: (typeof VEHICLES)[number]) => string }[] = [
  { key: "price", en: "Price", ar: "السعر", format: (v) => formatCurrency(v.priceUSD) },
  { key: "hp", en: "Horsepower", ar: "القوة", format: (v) => `${v.horsepower} HP` },
  { key: "torque", en: "Torque", ar: "عزم الدوران", format: (v) => `${v.torque} Nm` },
  { key: "range", en: "Range", ar: "المدى", format: (v) => `${v.rangeKM} km` },
  { key: "battery", en: "Battery", ar: "البطارية", format: (v) => `${v.batteryKWh} kWh` },
  { key: "accel", en: "0–100 km/h", ar: "0–100 كم/س", format: (v) => v.acceleration },
  { key: "topspeed", en: "Top Speed", ar: "السرعة القصوى", format: (v) => `${v.topSpeed} km/h` },
  { key: "seats", en: "Seats", ar: "المقاعد", format: (v) => `${v.seats}` },
  { key: "charge", en: "Charge Time", ar: "زمن الشحن", format: (v) => v.chargeTime },
];

export default function CompareTool() {
  const { locale } = useI18n();
  const searchParams = useSearchParams();
  const preset = searchParams.get("vehicle");
  const initial = preset ? [preset] : [VEHICLES[2].id, VEHICLES[4].id];

  const [selected, setSelected] = useState<string[]>(initial);

  const vehicles = selected.map((id) => VEHICLES.find((v) => v.id === id)).filter(Boolean) as typeof VEHICLES;

  const updateSlot = (index: number, id: string) => {
    setSelected((prev) => {
      const next = [...prev];
      next[index] = id;
      return next;
    });
  };

  const removeSlot = (index: number) => {
    setSelected((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v, i) => (
          <div key={`${v.id}-${i}`} className="card-elevated relative rounded-2xl p-4">
            <button
              onClick={() => removeSlot(i)}
              className="absolute end-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-bg-muted text-fg-subtle hover:text-red-500"
              aria-label="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <VehicleStudioRender category={v.category} className="h-32" />
            <select
              value={v.id}
              onChange={(e) => updateSlot(i, e.target.value)}
              className="mt-2 w-full rounded-lg border border-border-strong bg-bg px-2 py-1.5 text-sm font-bold"
            >
              {VEHICLES.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {locale === "ar" ? opt.nameAr : opt.nameEn}
                </option>
              ))}
            </select>
          </div>
        ))}
        {vehicles.length < 3 && (
          <button
            onClick={() => setSelected((prev) => [...prev, VEHICLES.find((v) => !prev.includes(v.id))?.id ?? VEHICLES[0].id])}
            className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-fg-subtle transition hover:border-primary hover:text-primary"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-bold">{locale === "ar" ? "إضافة سيارة" : "Add Vehicle"}</span>
          </button>
        )}
      </div>

      {vehicles.length > 0 && (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <tbody>
              {SPEC_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-border">
                  <td className="py-3 pe-4 text-xs font-bold uppercase tracking-wide text-fg-subtle">
                    {locale === "ar" ? row.ar : row.en}
                  </td>
                  {vehicles.map((v, i) => (
                    <td key={`${row.key}-${i}`} className="py-3 pe-4 font-bold">
                      {row.format(v)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td />
                {vehicles.map((v, i) => (
                  <td key={`cta-${i}`} className="pt-4">
                    <LinkButton href={`/vehicles/${v.slug}`} size="sm" variant="outline">
                      {locale === "ar" ? "التفاصيل" : "Details"}
                    </LinkButton>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
