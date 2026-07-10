import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NEWS } from "@/lib/data/news";
import NewsArticleClient from "./NewsArticleClient";

export function generateStaticParams() {
  return NEWS.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = NEWS.find((n) => n.slug === slug);
  if (!post) return {};
  return { title: post.titleEn, description: post.excerptEn };
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = NEWS.find((n) => n.slug === slug);
  if (!post) notFound();
  return <NewsArticleClient post={post} />;
}
