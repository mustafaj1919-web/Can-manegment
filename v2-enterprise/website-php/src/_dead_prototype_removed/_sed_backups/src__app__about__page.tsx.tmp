import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import StatsSection from "@/components/home/StatsSection";
import AwardsPartners from "@/components/home/AwardsPartners";
import CtaBanner from "@/components/shared/CtaBanner";
import AboutTimeline from "./AboutTimeline";
import AboutValues from "./AboutValues";

export const metadata: Metadata = {
  title: "About Us",
  description: "Al-Sadaka Motors is Iraq's authorized BYD dealer, bringing electric mobility to Baghdad, Erbil, and Basra since 2014.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Our Story", ar: "قصتنا" }}
        title={{ en: "Bringing electric mobility to Iraq", ar: "ننقل التنقل الكهربائي إلى العراق" }}
        description={{
          en: "For over a decade, Al-Sadaka Motors has connected Iraqi drivers with vehicles they can trust. Today, we're proud to be the authorized home of BYD.",
          ar: "منذ أكثر من عقد، تربط الأصدقاء للسيارات السائقين العراقيين بسيارات يثقون بها. اليوم نفخر بكوننا الوكيل المعتمد لسيارات BYD.",
        }}
      />
      <Section className="pt-0">
        <Container className="max-w-3xl">
          <Eyebrow>{"Mission"}</Eyebrow>
          <p className="mt-4 text-balance text-2xl font-bold leading-relaxed sm:text-3xl">
            &ldquo;To make electric mobility accessible, trustworthy, and genuinely enjoyable for every Iraqi family — through
            transparent pricing, honest service, and vehicles engineered to last.&rdquo;
          </p>
        </Container>
      </Section>
      <AboutTimeline />
      <StatsSection />
      <AboutValues />
      <AwardsPartners />
      <CtaBanner />
    </>
  );
}
