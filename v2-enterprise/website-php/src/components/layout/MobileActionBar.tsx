"use client";

import Link from "next/link";
import { Phone, MessageCircle, Car } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { BRAND } from "@/lib/data/locations";

export default function MobileActionBar() {
  const { dict, locale } = useI18n();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-elevated/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="grid grid-cols-3">
        <a
          href={`tel:${BRAND.phone}`}
          className="flex flex-col items-center justify-center gap-1 py-2.5 text-fg-muted active:bg-bg-muted"
        >
          <Phone className="h-5 w-5" />
          <span className="text-[0.65rem] font-semibold">{locale === "ar" ? "اتصل" : "Call"}</span>
        </a>
        <a
          href={`https://wa.me/${BRAND.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center justify-center gap-1 border-x border-border py-2.5 text-emerald-600 active:bg-bg-muted"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-[0.65rem] font-semibold">WhatsApp</span>
        </a>
        <Link
          href="/test-drive"
          className="flex flex-col items-center justify-center gap-1 py-2.5 text-primary active:bg-bg-muted"
        >
          <Car className="h-5 w-5" />
          <span className="text-[0.65rem] font-semibold">{dict.cta.bookTestDrive}</span>
        </Link>
      </div>
    </div>
  );
}
