import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import { Container, Section } from "@/components/ui/Container";
import BlogGrid from "./BlogGrid";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guides, technology explainers, and buying advice from Al-Sadaka Motors.",
};

export default function BlogPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "The Journal", ar: "المجلة" }}
        title={{ en: "Guides & insights", ar: "أدلة ورؤى" }}
        description={{
          en: "Practical advice on EV ownership, technology, and financing in Iraq.",
          ar: "نصائح عملية حول امتلاك السيارات الكهربائية والتقنية والتمويل في العراق.",
        }}
      />
      <Section className="pt-0">
        <Container>
          <BlogGrid />
        </Container>
      </Section>
    </>
  );
}
