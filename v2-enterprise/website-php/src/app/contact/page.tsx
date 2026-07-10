import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import { Container, Section } from "@/components/ui/Container";
import ContactFormSection from "./ContactFormSection";
import LocationsMini from "@/components/shared/LocationsMini";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Al-Sadaka Motors — sales, service, and support across Iraq.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "We're Here to Help", ar: "نحن هنا لمساعدتك" }}
        title={{ en: "Get in touch", ar: "تواصل معنا" }}
        description={{
          en: "Questions about a vehicle, financing, or service? Send us a message and we'll respond within a few hours.",
          ar: "لديك أسئلة عن سيارة أو تمويل أو صيانة؟ أرسل لنا رسالة وسنرد خلال ساعات قليلة.",
        }}
      />
      <Section className="pt-0">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div className="card-elevated rounded-3xl p-6 sm:p-8">
              <ContactFormSection />
            </div>
            <LocationsMini />
          </div>
        </Container>
      </Section>
    </>
  );
}
