"use client";

import { Home, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import VehicleStudioRender from "@/components/vehicles/VehicleStudioRender";

export default function NotFound() {
  const { locale } = useI18n();

  return (
    <div className="flex min-h-[80svh] items-center py-24">
      <Container className="text-center">
        <div className="mx-auto max-w-md">
          <VehicleStudioRender category="performance" className="h-48" />
        </div>
        <p className="mt-6 text-7xl font-black text-primary">404</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
          {locale === "ar" ? "يبدو أنك خرجت عن الطريق" : "Looks like you've gone off-road"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-fg-muted">
          {locale === "ar"
            ? "الصفحة التي تبحث عنها غير موجودة أو تم نقلها."
            : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <LinkButton href="/" icon={<Home className="h-4 w-4" />} iconPosition="start">
            {locale === "ar" ? "العودة للرئيسية" : "Back to Home"}
          </LinkButton>
          <LinkButton href="/vehicles" variant="outline" icon={<Search className="h-4 w-4" />} iconPosition="start">
            {locale === "ar" ? "تصفح السيارات" : "Browse Vehicles"}
          </LinkButton>
        </div>
      </Container>
    </div>
  );
}
