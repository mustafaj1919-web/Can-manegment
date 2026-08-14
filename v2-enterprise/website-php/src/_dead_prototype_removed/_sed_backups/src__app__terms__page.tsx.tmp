import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import { Container, Section } from "@/components/ui/Container";
import LegalContent from "../privacy-policy/LegalContent";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using the Al-Sadaka Motors website and services.",
};

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow={{ en: "Legal", ar: "قانوني" }} title={{ en: "Terms of Service", ar: "الشروط والأحكام" }} />
      <Section className="pt-0">
        <Container className="max-w-3xl">
          <LegalContent type="terms" />
        </Container>
      </Section>
    </>
  );
}
