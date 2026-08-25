import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import { Container, Section } from "@/components/ui/Container";
import TechnologyHighlights from "@/components/home/TechnologyHighlights";
import CtaBanner from "@/components/shared/CtaBanner";
import TechPagesGrid from "./TechPagesGrid";

export const metadata: Metadata = {
  title: "Technology",
  description: "Explore BYD's electric drivetrain, Blade Battery, and charging technology.",
};

export default function TechnologyHub() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Engineering", ar: "الهندسة" }}
        title={{ en: "The technology behind every BYD", ar: "التقنية وراء كل سيارة BYD" }}
        description={{
          en: "From the Blade Battery to e-Platform 3.0 — explore what makes BYD vehicles safer and more efficient.",
          ar: "من بطارية Blade إلى منصة e-Platform 3.0 — تعرّف على ما يجعل سيارات BYD أكثر أماناً وكفاءة.",
        }}
      />
      <Section className="pt-0">
        <Container>
          <TechPagesGrid />
        </Container>
      </Section>
      <TechnologyHighlights />
      <CtaBanner />
    </>
  );
}
