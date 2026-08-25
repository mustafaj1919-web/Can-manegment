"use client";

import { MessageCircle } from "lucide-react";
import { BRAND } from "@/lib/data/locations";

export default function WhatsAppFloat() {
  return (
    <a
      href={`https://wa.me/${BRAND.whatsapp}`}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp"
      className="fixed bottom-6 end-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_10px_30px_-8px_rgba(16,185,129,0.6)] transition hover:scale-105 hover:bg-emerald-600 lg:flex"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
