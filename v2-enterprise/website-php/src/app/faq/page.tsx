import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import { Container, Section } from "@/components/ui/Container";
import FaqPageContent from "./FaqPageContent";
import CtaBanner from "@/components/shared/CtaBanner";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about buying, financing, and servicing a BYD from Al-Sadaka Motors.",
};

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Support", ar: "الدعم" }}
        title={{ en: "Frequently asked questions", ar: "الأسئلة الشائعة" }}
        align="center"
      />
      <Section className="pt-0">
        <Container className="max-w-3xl">
          <FaqPageContent />
        </Container>
      </Section>
      <CtaBanner />
    </>
  );
}
