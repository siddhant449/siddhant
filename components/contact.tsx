"use client";

import { useLenis } from "lenis/react";
import { m, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { contact, nav, services, site } from "@/lib/content";
import { FitLine } from "./ui/fit-line";
import { LocalTime } from "./ui/local-time";
import { Fade, Opener, Rise } from "./ui/reveal";

/** The current year, filled in on the client so the page can be prerendered. */
function Year() {
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setYear(new Date().getFullYear()));
    return () => cancelAnimationFrame(id);
  }, []);
  return <span suppressHydrationWarning>{year ?? 2026}</span>;
}

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(id);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(site.email);
          setCopied(true);
        } catch {
          window.location.href = `mailto:${site.email}`;
        }
      }}
      className="btn btn-line"
    >
      {copied ? contact.copied : contact.copy}
      <span className="sr-only" aria-live="polite">
        {copied ? "Email address copied to clipboard" : ""}
      </span>
    </button>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="t-label mute">{title}</p>
      <ul className="t-small mt-4 space-y-2">{children}</ul>
    </div>
  );
}

export function Contact() {
  const lenis = useLenis();
  const onHome = usePathname() === "/";
  const ref = useRef<HTMLElement>(null);
  // The wordmark rises out from behind the baseline as the page runs out.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["end 1.35", "end end"] });
  const rise = useTransform(scrollYProgress, [0, 1], ["62%", "0%"]);

  return (
    <footer ref={ref} id="contact" data-theme="ink" aria-labelledby="contact-title" className="relative overflow-hidden px-gutter pt-[var(--section)]">
      {/* The red wave behind the call to action, drawn by the WebGL stage. */}
      <div aria-hidden data-gl="liquid" data-base="0.42" data-amp="0.17" className="pointer-events-none absolute inset-x-0 top-0 h-[115svh]" />

      <div className="relative">
        <Opener
          index={contact.index}
          label={contact.label}
          meta={
            <span className="inline-flex items-center gap-2">
              <span className="dot" /> {contact.status}
            </span>
          }
        />
        <div className="mt-12 grid gap-x-6 gap-y-8 md:grid-cols-12">
          <Rise
            id="contact-title"
            lines={[
              <span key="a">{contact.title[0].text}</span>,
              <span key="b" className="t-it">
                {contact.title[1].text}
              </span>,
            ]}
            className="t-display md:col-span-8"
          />
          <Fade as="p" className="t-lead mute max-w-[40ch] self-end md:col-span-4">
            {contact.body}
          </Fade>
        </div>
        <Fade className="mt-10 flex flex-col items-start gap-6">
          <a href={`mailto:${site.email}`} className="t-h2 link break-all pb-1">
            {site.email}
          </a>
          <div className="flex flex-wrap gap-2.5">
            <a href={`mailto:${site.email}?subject=${encodeURIComponent("A project for you")}`} className="btn btn-solid">
              {contact.start} <span className="nudge">→</span>
            </a>
            <CopyEmail />
          </div>
        </Fade>

        <div className="mt-[clamp(80px,10vw,144px)] grid grid-cols-2 gap-x-6 gap-y-10 border-t border-fg/12 pt-8 md:grid-cols-4">
          <Column title="Contact">
            <li>
              <a href={`mailto:${site.email}`} className="link break-all">
                {site.email}
              </a>
            </li>
            <li className="mute">{site.location}</li>
            <li className="mute">
              <LocalTime className="text-fg" /> IST
            </li>
          </Column>
          <Column title="Elsewhere">
            {[
              ["LinkedIn", site.links.linkedin],
              ["GitHub", site.links.github],
              ["Résumé (PDF)", site.links.resume],
            ].map(([label, href]) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noreferrer" className="link">
                  {label} <span className="nudge nudge-up">↗</span>
                </a>
              </li>
            ))}
          </Column>
          <Column title="Services">
            {services.map((s) => (
              <li key={s} className="text-fg/85">
                {s}
              </li>
            ))}
          </Column>
          <Column title="Index">
            {nav.map((n) => (
              <li key={n.href}>
                {onHome ? (
                  <a href={n.href} className="link">
                    {n.label}
                  </a>
                ) : (
                  <Link href={`/${n.href}`} className="link">
                    {n.label}
                  </Link>
                )}
              </li>
            ))}
          </Column>
        </div>

        <div aria-hidden className="mt-[clamp(56px,7vw,104px)] overflow-hidden">
          <m.div style={{ y: rise }}>
            <FitLine text={site.name} weight={500} tracking="-0.065em" fallback="15vw" innerClassName="leading-[0.8]" />
          </m.div>
        </div>
        <div className="t-label mute flex flex-wrap items-center justify-between gap-4 border-t border-fg/12 py-6">
          <p>
            © <Year /> {site.name}. {contact.signature}
          </p>
          <button
            type="button"
            onClick={() => (lenis ? lenis.scrollTo(0, { duration: 2 }) : window.scrollTo({ top: 0 }))}
            className="link text-fg"
          >
            {contact.backToTop} ↑
          </button>
        </div>
      </div>
    </footer>
  );
}
