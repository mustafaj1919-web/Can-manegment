import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VEHICLES, getVehicleBySlug, getRelatedVehicles } from "@/lib/data/vehicles";
import VehicleDetailClient from "./VehicleDetailClient";

export function generateStaticParams() {
  return VEHICLES.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = getVehicleBySlug(slug);
  if (!vehicle) return {};
  return {
    title: vehicle.nameEn,
    description: vehicle.descriptionEn,
    openGraph: { title: vehicle.nameEn, description: vehicle.descriptionEn },
  };
}

export default async function VehicleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vehicle = getVehicleBySlug(slug);
  if (!vehicle) notFound();
  const related = getRelatedVehicles(vehicle);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: vehicle.nameEn,
    description: vehicle.descriptionEn,
    brand: { "@type": "Brand", name: "BYD" },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: vehicle.priceUSD,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <VehicleDetailClient vehicle={vehicle} related={related} />
    </>
  );
}
