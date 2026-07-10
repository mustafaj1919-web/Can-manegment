import { Suspense } from "react";
import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import CompareTool from "./CompareTool";
import { Container, Section } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Compare Vehicles",
  description: "Compare specifications, range, and pricing across the full BYD lineup at Al-Sadaka Motors.",
};

export default function ComparePage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Side by Side", ar: "مقارنة جنباً إلى جنب" }}
        title={{ en: "Compare BYD models", ar: "قارن بين طرازات BYD" }}
        description={{
          en: "Pick up to three vehicles to compare specifications, range, and pricing.",
          ar: "اختر حتى ثلاث سيارات لمقارنة المواصفات والمدى والسعر.",
        }}
      />
      <Section className="pt-0">
        <Container>
          <Suspense fallback={null}>
            <CompareTool />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}
