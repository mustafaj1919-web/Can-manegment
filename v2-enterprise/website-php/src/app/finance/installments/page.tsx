import { Suspense } from "react";
import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import InstallmentsForm from "./InstallmentsForm";
import Requirements from "./Requirements";
import { Container, Section } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Installments",
  description: "Apply for BYD vehicle financing with Al-Sadaka Motors.",
};

export default function InstallmentsPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Installments", ar: "الأقساط" }}
        title={{ en: "Apply for financing", ar: "قدّم طلب التمويل" }}
        description={{
          en: "Submit your application and a finance advisor will confirm your eligibility and monthly plan.",
          ar: "أرسل طلبك وسيقوم أحد مستشارينا الماليين بتأكيد الأهلية والخطة الشهرية.",
        }}
      />
      <Section className="pt-0">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div className="card-elevated rounded-3xl p-6 sm:p-8">
              <Suspense fallback={null}>
                <InstallmentsForm />
              </Suspense>
            </div>
            <Requirements />
          </div>
        </Container>
      </Section>
    </>
  );
}
