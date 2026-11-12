import { manifesto } from "@/lib/content";
import { ScrollRead } from "./ui/text-effects";

export function Manifesto() {
  return (
    <section aria-label="Approach" className="relative z-10 bg-ink px-gutter pb-[clamp(96px,14vw,220px)] pt-[clamp(72px,10vw,160px)]">
      <ScrollRead
        text={manifesto}
        className="max-w-[24ch] text-[clamp(32px,4.6vw,80px)] font-medium leading-[1.04] tracking-[-0.025em] wdth-100 md:max-w-[26ch]"
      />
    </section>
  );
}
