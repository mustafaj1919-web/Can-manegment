import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import { Container, Section } from "@/components/ui/Container";
import GalleryGrid from "./GalleryGrid";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Browse the BYD lineup at Al-Sadaka Motors in detail.",
};

export default function GalleryPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Gallery", ar: "المعرض" }}
        title={{ en: "Every angle, every model", ar: "كل زاوية، كل طراز" }}
      />
      <Section className="pt-0">
        <Container>
          <GalleryGrid />
        </Container>
      </Section>
    </>
  );
}
