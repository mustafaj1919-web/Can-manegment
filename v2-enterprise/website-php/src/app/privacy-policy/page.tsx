import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import { Container, Section } from "@/components/ui/Container";
import LegalContent from "./LegalContent";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Al-Sadaka Motors collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero eyebrow={{ en: "Legal", ar: "قانوني" }} title={{ en: "Privacy Policy", ar: "سياسة الخصوصية" }} />
      <Section className="pt-0">
        <Container className="max-w-3xl">
          <LegalContent type="privacy" />
        </Container>
      </Section>
    </>
  );
}
