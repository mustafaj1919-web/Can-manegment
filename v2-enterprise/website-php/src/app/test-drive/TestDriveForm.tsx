"use client";

import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import LeadForm from "@/components/shared/LeadForm";

export default function TestDriveForm() {
  const { dict } = useI18n();
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get("vehicle") ?? undefined;

  return (
    <LeadForm
      type="test-drive"
      defaultVehicleId={vehicleId}
      showVehicle
      showLocation
      showDate
      submitLabel={dict.cta.bookTestDrive}
    />
  );
}
