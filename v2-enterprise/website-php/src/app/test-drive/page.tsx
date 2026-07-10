import { Suspense } from "react";
import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import TestDriveForm from "./TestDriveForm";
import { Container, Section } from "@/components/ui/Container";
import LocationsMini from "@/components/shared/LocationsMini";

export const metadata: Metadata = {
  title: "Book a Test Drive",
  description: "Book a free BYD test drive at any Al-Sadaka Motors showroom in Iraq.",
};

export default function TestDrivePage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Experience It Yourself", ar: "جرّبها بنفسك" }}
        title={{ en: "Book your free test drive", ar: "احجز تجربة قيادة مجانية" }}
        description={{
          en: "Choose a vehicle, pick a showroom, and we'll confirm your appointment within a few hours.",
          ar: "اختر السيارة والمعرض، وسنؤكد موعدك خلال ساعات قليلة.",
        }}
      />
      <Section className="pt-0">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div className="card-elevated rounded-3xl p-6 sm:p-8">
              <Suspense fallback={null}>
                <TestDriveForm />
              </Suspense>
            </div>
            <LocationsMini />
          </div>
        </Container>
      </Section>
    </>
  );
}
