import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CaseStudyView } from "@/components/case/case-study";
import { Contact } from "@/components/contact";
import { Nav } from "@/components/nav";
import { caseStudies, caseStudyOf } from "@/lib/content";

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const study = caseStudyOf(slug);
  if (!study) return {};
  return {
    title: study.title,
    description: study.description,
    alternates: { canonical: `/work/${study.slug}` },
    openGraph: { title: `${study.title}, a case study`, description: study.description, url: `/work/${study.slug}` },
  };
}

export default function CaseStudyPage({ params }: PageProps<"/work/[slug]">) {
  return (
    <>
      <Nav />
      <main id="main">
        {/* Reading params belongs inside a boundary; known slugs are still prerendered in full. */}
        <Suspense fallback={<div className="min-h-svh bg-ink" />}>
          <Study params={params} />
        </Suspense>
      </main>
      <Contact />
    </>
  );
}

async function Study({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = caseStudyOf(slug);
  if (!study) notFound();
  const next = caseStudyOf(study.next) ?? caseStudies[0];
  return <CaseStudyView study={study} next={next} />;
}
