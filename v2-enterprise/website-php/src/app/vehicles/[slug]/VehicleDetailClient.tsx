"use client";

import Link from "next/link";
import { Battery, Gauge, Timer, Users, Zap } from "lucide-react";
import type { Vehicle } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import VehicleViewer from "@/components/vehicles/VehicleViewer";
import VehicleDetailTabs from "@/components/vehicles/VehicleDetailTabs";
import VehicleCard from "@/components/vehicles/VehicleCard";
import FinanceCalculator from "@/components/finance/FinanceCalculator";
import CtaBanner from "@/components/shared/CtaBanner";

export default function VehicleDetailClient({ vehicle, related }: { vehicle: Vehicle; related: Vehicle[] }) {
  const { locale, dict } = useI18n();

  const quickStats = [
    { icon: Zap, value: `${vehicle.horsepower} HP`, label: dict.common.power },
    { icon: Battery, value: `${vehicle.rangeKM} km`, label: dict.common.range },
    { icon: Timer, value: vehicle.acceleration, label: dict.common.acceleration },
    { icon: Gauge, value: `${vehicle.topSpeed} km/h`, label: dict.common.topSpeed },
    { icon: Users, value: `${vehicle.seats}`, label: locale === "ar" ? "مقاعد" : "Seats" },
  ];

  return (
    <>
      <section className="pb-4 pt-32 md:pt-40">
        <Container>
          <nav className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <Link href="/" className="hover:text-primary">{locale === "ar" ? "الرئيسية" : "Home"}</Link>
            <span>/</span>
            <Link href="/vehicles" className="hover:text-primary">{dict.nav.vehicles}</Link>
            <span>/</span>
            <span className="font-semibold text-fg">{locale === "ar" ? vehicle.nameAr : vehicle.nameEn}</span>
          </nav>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>{locale === "ar" ? vehicle.typeAr : vehicle.typeEn}</Eyebrow>
              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                {locale === "ar" ? vehicle.nameAr : vehicle.nameEn}
              </h1>
              <p className="mt-3 max-w-xl text-fg-muted">{locale === "ar" ? vehicle.descriptionAr : vehicle.descriptionEn}</p>
            </div>
            <div className="text-end">
              <p className="text-xs font-semibold uppercase text-fg-subtle">{dict.common.startingAt}</p>
              <p className="text-3xl font-black text-primary">{formatCurrency(vehicle.priceUSD)}</p>
              <p className="text-xs text-fg-subtle">
                {locale === "ar" ? "أو" : "or"} {formatCurrency(vehicle.monthlyFromUSD)}/{locale === "ar" ? "شهر" : "mo"}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Section className="pt-6">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <Reveal>
              <VehicleViewer vehicle={vehicle} />
              <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {quickStats.map((s) => (
                  <div key={s.label} className="card-elevated rounded-xl p-3 text-center">
                    <s.icon className="mx-auto h-4 w-4 text-primary" />
                    <p className="mt-1.5 text-sm font-extrabold">{s.value}</p>
                    <p className="text-[0.65rem] text-fg-subtle">{s.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.1} className="flex flex-col gap-4">
              <div className="card-elevated rounded-2xl p-6">
                <p className="text-sm font-extrabold">{locale === "ar" ? "مهتم بهذه السيارة؟" : "Interested in this vehicle?"}</p>
                <p className="mt-1 text-sm text-fg-muted">
                  {locale === "ar" ? "احجز تجربة قيادة أو تواصل مع فريق المبيعات." : "Book a test drive or speak with our sales team."}
                </p>
                <div className="mt-4 flex flex-col gap-2.5">
                  <LinkButton href={`/test-drive?vehicle=${vehicle.slug}`} className="w-full justify-center">
                    {dict.cta.bookTestDrive}
                  </LinkButton>
                  <LinkButton href={`/trade-in?vehicle=${vehicle.slug}`} variant="outline" className="w-full justify-center">
                    {dict.nav.tradeIn}
                  </LinkButton>
                  <LinkButton href={`/compare?vehicle=${vehicle.slug}`} variant="ghost" className="w-full justify-center">
                    {dict.nav.compare}
                  </LinkButton>
                </div>
              </div>
              <div className="card-elevated rounded-2xl p-6">
                <p className="text-sm font-extrabold">{locale === "ar" ? "البطارية والشحن" : "Battery & Charging"}</p>
                <dl className="mt-3 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-fg-subtle">{dict.common.battery}</dt>
                    <dd className="font-bold">{vehicle.batteryKWh} kWh</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-fg-subtle">{locale === "ar" ? "زمن الشحن" : "Charge Time"}</dt>
                    <dd className="font-bold">{vehicle.chargeTime}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-fg-subtle">{dict.common.range}</dt>
                    <dd className="font-bold">{vehicle.rangeKM} km</dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="mt-8">
            <VehicleDetailTabs vehicle={vehicle} />
          </Reveal>
        </Container>
      </Section>

      <Section className="bg-bg-subtle">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow className="justify-center">{dict.nav.finance}</Eyebrow>
            <h2 className="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">
              {locale === "ar" ? `احسب قسط ${vehicle.nameAr}` : `Calculate payments for the ${vehicle.nameEn}`}
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mx-auto mt-10 max-w-4xl">
            <FinanceCalculator vehicleId={vehicle.id} />
          </Reveal>
        </Container>
      </Section>

      {related.length > 0 && (
        <Section>
          <Container>
            <Reveal>
              <Eyebrow>{locale === "ar" ? "قد يعجبك أيضاً" : "Related Vehicles"}</Eyebrow>
              <h2 className="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">
                {locale === "ar" ? "طرازات مشابهة" : "You might also like"}
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((v, i) => (
                <VehicleCard key={v.id} vehicle={v} index={i} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      <CtaBanner />
    </>
  );
}
