import type { ReactNode } from "react";
import { engineeringChapter as E } from "@/lib/copy/chapters";
import { Capabilities } from "@/components/capabilities";
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
      <div id="systems">{children}</div>
    </section>
  );
}
