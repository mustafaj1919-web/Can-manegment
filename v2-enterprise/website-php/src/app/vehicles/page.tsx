import { Suspense } from "react";
import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import VehiclesExplorer from "./VehiclesExplorer";
import CtaBanner from "@/components/shared/CtaBanner";

export const metadata: Metadata = {
  title: "Vehicles",
  description: "Explore the full BYD electric vehicle lineup available at Al-Sadaka Motors — sedans, SUVs, hatchbacks, and performance models.",
};

export default function VehiclesPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Full Lineup", ar: "التشكيلة الكاملة" }}
        title={{ en: "Every BYD model, one showroom", ar: "كل طرازات BYD في معرض واحد" }}
        description={{
          en: "Filter by category, budget, and range to find the electric vehicle that fits your life.",
          ar: "فلترة حسب الفئة والميزانية والمدى لإيجاد السيارة الكهربائية التي تناسب حياتك.",
        }}
      />
      <Suspense fallback={null}>
        <VehiclesExplorer />
      </Suspense>
      <div className="h-16 md:h-24" />
      <CtaBanner />
    </>
  );
}
