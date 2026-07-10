import type { MetadataRoute } from "next";
import { VEHICLES } from "@/lib/data/vehicles";
import { NEWS } from "@/lib/data/news";
import { BLOG_POSTS } from "@/lib/data/blog";

const siteUrl = "https://www.alsadaka.com";

const STATIC_ROUTES = [
  "",
  "/vehicles",
  "/technology/electric",
  "/technology/battery",
  "/technology/charging",
  "/finance",
  "/finance/installments",
  "/offers",
  "/compare",
  "/test-drive",
  "/trade-in",
  "/news",
  "/blog",
  "/gallery",
  "/about",
  "/locations",
  "/contact",
  "/faq",
  "/privacy-policy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const vehicleEntries: MetadataRoute.Sitemap = VEHICLES.map((v) => ({
    url: `${siteUrl}/vehicles/${v.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const newsEntries: MetadataRoute.Sitemap = NEWS.map((n) => ({
    url: `${siteUrl}/news/${n.slug}`,
    lastModified: new Date(n.date),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const blogEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((b) => ({
    url: `${siteUrl}/blog/${b.slug}`,
    lastModified: new Date(b.date),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...vehicleEntries, ...newsEntries, ...blogEntries];
}
