import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import { Container, Section } from "@/components/ui/Container";
import NewsGrid from "./NewsGrid";

export const metadata: Metadata = {
  title: "News",
  description: "The latest news and announcements from Al-Sadaka Motors.",
};

export default function NewsPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Newsroom", ar: "غرفة الأخبار" }}
        title={{ en: "What's new at Al-Sadaka", ar: "جديدنا في الأصدقاء" }}
      />
      <Section className="pt-0">
        <Container>
          <NewsGrid />
        </Container>
      </Section>
    </>
  );
}
