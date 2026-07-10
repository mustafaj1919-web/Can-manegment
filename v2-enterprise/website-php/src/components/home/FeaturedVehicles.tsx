"use client";

import { useI18n } from "@/lib/i18n/context";
import { VEHICLES } from "@/lib/data/vehicles";
import VehicleCard from "@/components/vehicles/VehicleCard";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export default function FeaturedVehicles() {
  const { locale, dict } = useI18n();
  const featured = VEHICLES.slice(0, 3);

  return (
    <Section id="featured-vehicles">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <Eyebrow>{locale === "ar" ? "أحدث الطرازات" : "Latest Models"}</Eyebrow>
            <h2 className="mt-3 max-w-xl text-balance text-3xl font-black tracking-tight sm:text-4xl">
              {locale === "ar" ? "تشكيلة مصممة لكل أسلوب حياة" : "A lineup built for every lifestyle"}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <LinkButton href="/vehicles" variant="outline" icon={<ArrowRight className="h-4 w-4 rtl:rotate-180" />}>
              {dict.cta.seeAll}
            </LinkButton>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((v, i) => (
            <VehicleCard key={v.id} vehicle={v} index={i} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
