import Link from "next/link";
import { engineering } from "@/lib/content";
import { commerceCopy, systemKinds, systemsCopy, titleLines } from "@/lib/copy/systems";
import { FigureSlot } from "./figure-slot";
import s from "./systems.module.css";
import { Tick } from "./tick";

/** Pair the stack up for the two-column facts row: "TypeScript · Node.js". */
function pairs(list: string[]) {
  const out: string[] = [];
  for (let i = 0; i < list.length; i += 2) out.push(list.slice(i, i + 2).join(" · "));
  return out;
}

/**
 * The four systems as Linear-style product chapters: title and problem on top,
 * a live figure, then the facts. Sits on ink inside the Engineering chapter
 * (which owns the h2); each system title is an h3.
 */
export function Systems() {
  return (
    <div className={s.root}>
      {engineering.projects.map((p, i) => {
        const kind = systemKinds[i];
        const id = `system-${p.slug ?? kind}`;
        return (
          <article key={p.title} className={s.ch} aria-labelledby={id}>
            <div className={s.wrap}>
              <div className={s.head}>
                <div className={s.headT}>
                  <h3 id={id} className={s.title}>
                    {titleLines(p.title, systemsCopy.titleBreak[i]).map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </h3>
                </div>
                <div className={s.headD}>
                  <p className={s.desc}>{p.problem}</p>
                  <div className={s.act}>
                    {p.slug ? <Link href={`/work/${p.slug}`}>{systemsCopy.caseStudy}</Link> : null}
                    <span>
                      {p.domain} · {p.role}
                    </span>
                    {p.nda ? <span>{engineering.stamp}</span> : null}
                  </div>
                </div>
              </div>

              <FigureSlot kind={kind} label={`${p.title}: ${p.line} (${systemsCopy.simulated.toLowerCase()} illustration)`} />

              <div className={s.foot}>
                <div className={s.lab}>
                  {systemsCopy.factsLabel}
                  {kind === "commerce" ? <span className={s.credit}>{commerceCopy.credit}</span> : null}
                </div>
                <div className={s.ing}>
                  <dl className={s.ingCol}>
                    {p.facts.map((f) => (
                      <div key={f.label} className={s.item}>
                        <dt className="sr-only">{f.label}</dt>
                        <dd className={s.val}>
                          <Tick value={f.value} />
                        </dd>
                        <dd aria-hidden>{f.label}</dd>
                      </div>
                    ))}
                  </dl>
                  <ul className={s.ingCol} aria-label={`${p.title} stack`}>
                    {pairs(p.stack).map((pair) => (
                      <li key={pair} className={s.item}>
                        {pair}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
