"use client";

import { useEffect, useId, useRef, useState } from "react";
import { faqCopy, mail } from "@/lib/copy/pitch";
import s from "./faq.module.css";

const INITIAL_OPEN = { height: "auto" } as const;

function Item({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const body = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const id = useId();

  // Animate between 0 and the measured height, then let an open panel size itself.
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    if (first.current) {
      first.current = false;
      el.style.height = open ? "auto" : "0px";
      return;
    }
    if (open) {
      el.style.height = `${el.scrollHeight}px`;
      const done = (e: TransitionEvent) => {
        if (e.propertyName === "height") el.style.height = "auto";
      };
      el.addEventListener("transitionend", done, { once: true });
      return () => el.removeEventListener("transitionend", done);
    }
    el.style.height = `${el.scrollHeight}px`;
    void el.offsetHeight;
    el.style.height = "0px";
  }, [open]);

  return (
    <li className={s.item} data-open={open ? "" : undefined}>
      <h3>
        <button type="button" className={s.q} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {q}
          <span aria-hidden className={s.plus}>
            <i />
            <i />
          </span>
        </button>
      </h3>
      <div ref={body} id={id} role="region" aria-label={q} className={s.body} style={defaultOpen ? INITIAL_OPEN : undefined} inert={!open || undefined}>
        <div className={s.inner}>
          <p>{a}</p>
        </div>
      </div>
    </li>
  );
}

/** Questions, after Ramotion's FAQ: tinted rows that open in place. */
export function Faq() {
  return (
    <section id="faq" data-theme="paper" aria-labelledby="faq-title" className={s.section}>
      <h2 id="faq-title" className={s.title}>
        {faqCopy.title}
      </h2>
      <ul className={s.list}>
        {faqCopy.items.map((it, i) => (
          <Item key={it.q} q={it.q} a={it.a} defaultOpen={i === 0} />
        ))}
      </ul>
      <div className={s.ctaRow}>
        <a className={s.cta} href={mail.question}>
          {faqCopy.cta}
        </a>
      </div>
    </section>
  );
}
