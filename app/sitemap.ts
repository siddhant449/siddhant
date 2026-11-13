import type { MetadataRoute } from "next";
import { caseStudies, site } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    ...caseStudies.map((c) => ({ url: `${site.url}/work/${c.slug}`, changeFrequency: "yearly" as const, priority: 0.8 })),
  ];
}
