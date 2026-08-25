"use client";

import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import LeadForm from "@/components/shared/LeadForm";

export default function TradeInForm() {
  const { locale } = useI18n();
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get("vehicle") ?? undefined;

  return (
    <LeadForm
      type="trade-in"
      defaultVehicleId={vehicleId}
      showVehicle
      showMessage
      submitLabel={locale === "ar" ? "أرسل تفاصيل سيارتي" : "Submit My Vehicle Details"}
    />
  );
}
