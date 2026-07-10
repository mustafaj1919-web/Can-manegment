"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { VEHICLES } from "@/lib/data/vehicles";
import { LOCATIONS } from "@/lib/data/locations";
import { submitLead } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { LeadPayload } from "@/lib/types";

const schema = z.object({
  name: z.string().min(2, "Required"),
  phone: z.string().min(7, "Required"),
  email: z.string().email().optional().or(z.literal("")),
  vehicleId: z.string().optional(),
  locationId: z.string().optional(),
  preferredDate: z.string().optional(),
  message: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface LeadFormProps {
  type: LeadPayload["type"];
  defaultVehicleId?: string;
  showVehicle?: boolean;
  showLocation?: boolean;
  showDate?: boolean;
  showMessage?: boolean;
  submitLabel: string;
}

export default function LeadForm({
  type,
  defaultVehicleId,
  showVehicle = false,
  showLocation = false,
  showDate = false,
  showMessage = false,
  submitLabel,
}: LeadFormProps) {
  const { locale } = useI18n();
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { vehicleId: defaultVehicleId ?? "" },
  });

  const onSubmit = async (values: FormValues) => {
    setStatus("submitting");
    setErrorMsg(null);
    const res = await submitLead({ type, ...values });
    if (res.success) {
      setStatus("success");
      reset();
    } else {
      setStatus("error");
      setErrorMsg(res.message ?? null);
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-6 py-14 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <p className="mt-4 text-lg font-extrabold">
          {locale === "ar" ? "تم استلام طلبك بنجاح" : "Your request has been received"}
        </p>
        <p className="mt-1.5 max-w-sm text-sm text-fg-muted">
          {locale === "ar"
            ? "سيتواصل معك فريقنا خلال 24 ساعة لتأكيد التفاصيل."
            : "Our team will reach out within 24 hours to confirm the details."}
        </p>
        <Button variant="outline" size="sm" className="mt-6" onClick={() => setStatus("idle")}>
          {locale === "ar" ? "إرسال طلب آخر" : "Submit another request"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2">
      <Field label={locale === "ar" ? "الاسم الكامل" : "Full Name"} error={errors.name?.message}>
        <input {...register("name")} className="input-field" placeholder={locale === "ar" ? "اسمك" : "Your name"} />
      </Field>
      <Field label={locale === "ar" ? "رقم الهاتف" : "Phone Number"} error={errors.phone?.message}>
        <input {...register("phone")} className="input-field" placeholder="+964 7XX XXX XXXX" dir="ltr" />
      </Field>
      <Field label={locale === "ar" ? "البريد الإلكتروني (اختياري)" : "Email (optional)"} className="sm:col-span-2">
        <input {...register("email")} className="input-field" placeholder="you@example.com" dir="ltr" />
      </Field>

      {showVehicle && (
        <Field label={locale === "ar" ? "السيارة" : "Vehicle"} className="sm:col-span-2">
          <select {...register("vehicleId")} className="input-field">
            <option value="">{locale === "ar" ? "اختر سيارة" : "Select a vehicle"}</option>
            {VEHICLES.map((v) => (
              <option key={v.id} value={v.id}>
                {locale === "ar" ? v.nameAr : v.nameEn}
              </option>
            ))}
          </select>
        </Field>
      )}

      {showLocation && (
        <Field label={locale === "ar" ? "الفرع" : "Showroom"} className="sm:col-span-2">
          <select {...register("locationId")} className="input-field">
            <option value="">{locale === "ar" ? "اختر فرعاً" : "Select a showroom"}</option>
            {LOCATIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {locale === "ar" ? l.nameAr : l.nameEn}
              </option>
            ))}
          </select>
        </Field>
      )}

      {showDate && (
        <Field label={locale === "ar" ? "التاريخ المفضل" : "Preferred Date"} className="sm:col-span-2">
          <input type="date" {...register("preferredDate")} className="input-field" />
        </Field>
      )}

      {showMessage && (
        <Field label={locale === "ar" ? "رسالتك" : "Message"} className="sm:col-span-2">
          <textarea {...register("message")} rows={4} className="input-field resize-none" />
        </Field>
      )}

      {status === "error" && (
        <p className="text-sm font-semibold text-red-500 sm:col-span-2">
          {errorMsg ?? (locale === "ar" ? "حدث خطأ، حاول مرة أخرى." : "Something went wrong, please try again.")}
        </p>
      )}

      <Button type="submit" disabled={status === "submitting"} className="justify-center sm:col-span-2">
        {status === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="text-xs font-bold uppercase tracking-wide text-fg-subtle">{label}</span>
      <div className="mt-2">{children}</div>
      {error && <span className="mt-1 block text-xs font-semibold text-red-500">{error}</span>}
    </label>
  );
}
