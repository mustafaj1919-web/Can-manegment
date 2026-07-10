import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import OffersGrid from "./OffersGrid";
import { Container, Section } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Offers",
  description: "Current BYD promotions and financing offers at Al-Sadaka Motors.",
};

export default function OffersPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Limited Time", ar: "لفترة محدودة" }}
        title={{ en: "Current offers & promotions", ar: "العروض والحسومات الحالية" }}
        description={{
          en: "Take advantage of these offers before they expire.",
          ar: "استفد من هذه العروض قبل انتهاء صلاحيتها.",
        }}
      />
      <Section className="pt-0">
        <Container>
          <OffersGrid />
        </Container>
      </Section>
    </>
  );
}
