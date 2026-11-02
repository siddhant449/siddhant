import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { aSide, caseStudy } from "@/lib/content";
import CaseScene from "@/components/case/CaseScene";
import SlateHero from "@/components/case/SlateHero";
import Brief from "@/components/case/Brief";
import ContactSheet from "@/components/case/ContactSheet";
import Storyboard from "@/components/case/Storyboard";
import StickyScreen from "@/components/case/StickyScreen";
import Phones from "@/components/case/Phones";
import EndCard from "@/components/case/EndCard";

/**
 * The hero only morphs out of the screening room's poster when the whole page lands in the
 * navigation's commit. A param-less streaming shell would commit a fallback first and break
 * the pair, so this route blocks on its (prerendered, per-slug) payload instead.
 */
export const instant = false;

export function generateStaticParams() {
  return aSide.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const study = caseStudy(slug);
  if (!study) return {};
  const title = `${study.title}, case study — Siddhant Kotak`;
  return {
    title,
    description: study.logline,
    openGraph: { title, description: study.logline, images: [study.frames[study.keyFrame].src] },
  };
}

/** A case study cut as a reel: slate, brief, contact sheet, storyboard, screen, phones, end card. */
export default async function CaseStudyPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const study = caseStudy(slug);
  if (!study) notFound();
  const next = caseStudy(study.next);

  return (
    <CaseScene>
      <SlateHero study={study} />
      <Brief text={study.brief} />
      <ContactSheet study={study} />
      <Storyboard study={study} />
      <StickyScreen study={study} />
      <Phones study={study} />
      <EndCard study={study} next={next} />
    </CaseScene>
  );
}
