import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import { Container, Section } from "@/components/ui/Container";
import FinanceCalculator from "@/components/finance/FinanceCalculator";
import FinancePartners from "./FinancePartners";
import CtaBanner from "@/components/shared/CtaBanner";

export const metadata: Metadata = {
  title: "Finance",
  description: "Calculate your BYD financing plan and explore installment options with trusted Iraqi banks.",
};

export default function FinancePage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Financing", ar: "التمويل" }}
        title={{ en: "Own your BYD, your way", ar: "امتلك سيارتك بالطريقة التي تناسبك" }}
        description={{
          en: "Flexible installment plans with fast approval through our trusted Iraqi banking partners.",
          ar: "خطط تقسيط مرنة وموافقة سريعة عبر شركائنا المصرفيين الموثوقين في العراق.",
        }}
      />
      <Section className="pt-0">
        <Container className="max-w-4xl">
          <FinanceCalculator />
        </Container>
      </Section>
      <FinancePartners />
      <CtaBanner />
    </>
  );
}
