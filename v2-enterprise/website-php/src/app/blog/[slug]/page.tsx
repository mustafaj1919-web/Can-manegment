import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS } from "@/lib/data/blog";
import BlogArticleClient from "./BlogArticleClient";

export function generateStaticParams() {
  return BLOG_POSTS.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((n) => n.slug === slug);
  if (!post) return {};
  return { title: post.titleEn, description: post.excerptEn };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((n) => n.slug === slug);
  if (!post) notFound();
  return <BlogArticleClient post={post} />;
}
