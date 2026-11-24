import { hero, site } from "@/lib/content";
import { MoltenWordmark } from "./molten-wordmark";
import { LocalTime } from "./ui/local-time";

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

function Title({ runs }: { runs: readonly { text: string; italic?: boolean }[] }) {
  return (
    <>
      {runs.map((r, i) =>
        r.italic ? (
          <span key={i} className="t-it">
            {r.text}
          </span>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}

/**
 * The first screen, after Monolith and Melon: four short columns of facts,
 * the name edge to edge in molten red (WebGL), one line, and two doors.
 * No loader: the type is server-rendered and assembles with CSS, and the name
 * pours in as soon as the page can draw it.
 */
export function Hero() {
  return (
    <section
      id="top"
      data-theme="ink"
      aria-labelledby="hero-title"
      className="relative flex min-h-[max(100svh,680px)] flex-col overflow-hidden pb-8 pt-[clamp(92px,12vh,112px)] md:pb-10"
    >
      <h1 id="hero-title" className="sr-only">
        {site.name}, {site.role}
      </h1>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-gutter md:grid-cols-4">
        {hero.meta.map((m, i) => (
          <p
            key={m.strong}
            className={`t-label intro-up ${"align" in m && m.align === "right" ? "text-right" : ""} ${i > 1 ? "hidden md:block" : ""}`}
            style={d(0.1 + i * 0.05)}
          >
            {"dot" in m && m.dot ? <span className="dot mr-2 align-[1px]" /> : null}
            {m.strong}
            <br />
            <span className="mute">{m.soft === "time" ? <><LocalTime /> IST</> : m.soft}</span>
          </p>
        ))}
      </div>

      <MoltenWordmark text={site.name} className="mt-[clamp(28px,8vh,96px)]" />

      <p className="t-lead mute intro-up mt-[clamp(12px,2vh,24px)] max-w-[52ch] px-gutter" style={d(0.5)}>
        {hero.lead}
      </p>

      {/* Two doors: the split is the first thing a visitor reads. */}
      <div className="mt-auto grid gap-x-6 gap-y-6 px-gutter pt-12 md:grid-cols-2">
        {[hero.doors.design, hero.doors.engineering].map((door, i) => (
          <a
            key={door.index}
            href={i === 0 ? "#design" : "#engineering"}
            className="intro-up group block border-t border-fg/22 pt-4"
            style={d(0.65 + i * 0.12)}
          >
            <span className="flex items-baseline justify-between">
              <span className="t-label">
                [{door.index}] {door.label}
              </span>
              <span className="t-label">
                {door.meta} <span className="nudge">→</span>
              </span>
            </span>
            <span className="t-h2 mt-4 block">
              <Title runs={door.title} />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
