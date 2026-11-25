import type { ReactNode } from "react";
import { engineeringChapter as E } from "@/lib/copy/chapters";
import { Capabilities } from "@/components/capabilities";
import { Fade, Opener, Rise } from "@/components/ui/reveal";
import { engineering } from "@/lib/content";
import s from "./engineering-chapter.module.css";

/**
 * The Engineering chapter opener, after area17.com: a pinned statement, live
 * system scenes rising over it under "I've built …", a second statement on
 * how the work is built. The page turns ink here (data-theme). `children`
 * (the system sections, which "See the systems" jumps to) follow.
 */
export function EngineeringChapter({ children }: { children?: ReactNode }) {
  return (
    <section id="engineering" data-nav="engineering" data-theme="ink" aria-labelledby="engineering-chapter-title">
      <Capabilities />
      <div className={s.cons}>
        <p className={s.big}>{E.practice}</p>
      </div>
      <div id="systems">
        {/* The case-study header, in the same form as Design's. */}
        <header className="px-gutter pt-[var(--section)]">
          <Opener label={engineering.label} meta={engineering.meta} />
          <div className="mt-12 grid gap-x-6 gap-y-6 md:grid-cols-12 md:items-end">
            <Rise id="systems-title" as="h2" lines={[engineering.title]} className="t-h1 md:col-span-7" />
            <Fade as="p" className="t-lead mute max-w-[46ch] md:col-span-4 md:col-start-9">
              {engineering.intro}
            </Fade>
          </div>
        </header>
        {children}
      </div>
    </section>
  );
}
