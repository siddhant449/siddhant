import { about, site } from "@/lib/content";
import { Fade, Lines, Words } from "./ui/reveal";
import { Roll } from "./ui/text-effects";

export function About() {
  return (
    <section
      id="about"
      data-nav="about"
      aria-labelledby="about-title"
      className="relative z-20 -mt-[clamp(24px,3.2vw,48px)] rounded-t-[clamp(24px,3.2vw,48px)] bg-ink px-gutter pb-[clamp(96px,12vw,180px)] pt-[clamp(80px,10vw,160px)]"
    >
      <div className="grid gap-x-6 gap-y-14 md:grid-cols-12">
        <div className="md:col-span-6">
          <Lines
            as="h2"
            id="about-title"
            lines={["The short", "version."]}
            className="text-[clamp(52px,8.4vw,156px)] font-extrabold leading-[0.86] tracking-[-0.025em] wdth-62"
          />
          <div className="mt-10 space-y-6">
            {about.paragraphs.map((p, i) => (
              <Words
                key={i}
                text={p}
                delay={i * 0.1}
                className={
                  i === 0
                    ? "max-w-[30ch] text-[clamp(22px,2vw,32px)] font-light leading-[1.3] tracking-[-0.01em] wdth-112"
                    : "max-w-[48ch] text-[clamp(17px,1.25vw,20px)] leading-[1.6] text-ash"
                }
              />
            ))}
          </div>
          <Fade delay={0.2} className="mt-10">
            <a
              href={site.links.resume}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-3 rounded-full border border-line-strong px-6 py-4 text-[15px] font-semibold leading-none transition-colors duration-500 hover:border-chalk"
            >
              <Roll>Download résumé</Roll>
              <span className="text-[13px] font-normal text-ash">PDF</span>
            </a>
          </Fade>
        </div>

        <div className="md:col-span-5 md:col-start-8">
          <h3 className="text-[14px] text-ash">Experience</h3>
          <ul className="mt-4">
            {about.experience.map((row, i) => (
              <Fade as="li" key={row.org} delay={i * 0.06} className="grid grid-cols-[1fr_auto] gap-x-6 border-t border-line py-5 last:border-b">
                <span>
                  <span className="block text-[clamp(18px,1.4vw,22px)] font-semibold leading-tight">{row.org}</span>
                  <span className="mt-1 block text-[15px] text-ash">{row.role}</span>
                </span>
                <span className="text-[15px] tabular-nums text-ash">{row.when}</span>
              </Fade>
            ))}
          </ul>

        </div>
      </div>
    </section>
  );
}
