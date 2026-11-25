import { About } from "@/components/about";
import { EngineeringChapter, TwoPractices } from "@/components/chapters";
import { DesignWork } from "@/components/design-work";
import { Nav } from "@/components/nav";
import { ChapterTitle, Faq, Process, Services } from "@/components/pitch";
import { SethFooter, SethHero } from "@/components/seth";
import { Systems } from "@/components/systems/systems";
import { Toolbox } from "@/components/toolbox";
import { chapterTitles } from "@/lib/copy/pitch";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="btn btn-solid fixed left-4 top-4 z-[110] -translate-y-24 focus:translate-y-0"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        {/* Pinned, after sethlukin.com: the rest of the page rises over it on a rounded sheet. */}
        <SethHero />
        {/* Transparent so the WebGL stage (the design cards) shows through; only the first sheet is solid. */}
        <div className="relative z-[1]">
          <div className="min-h-svh overflow-clip rounded-t-[28px] bg-bg md:rounded-t-[3.333vw]">
            <TwoPractices />
          </div>
          {/* Each practice opens on a giant word (after Rejouice), then its own section. */}
          <ChapterTitle {...chapterTitles.design} theme="paper" />
          {/* Design work: the Melon-style 3D cards (owner's pick). */}
          <DesignWork />
          <ChapterTitle {...chapterTitles.engineering} theme="ink" />
          <EngineeringChapter>
            <Systems />
          </EngineeringChapter>
          <Services />
          <Process />
          <Toolbox />
          <About />
          <Faq />
        </div>
      </main>
      <SethFooter />
    </>
  );
}
