import { services } from "@/lib/content";
import { Fade, Lines } from "./ui/reveal";

/**
 * The one light section: a sheet of paper laid over the black page, so the
 * offer reads as a different kind of page from the portfolio around it.
 */
export function Services() {
  return (
    <section
      id="services"
      data-nav="services"
      aria-labelledby="services-title"
      className="relative z-10 rounded-t-[clamp(24px,3.2vw,48px)] bg-paper px-gutter pb-[clamp(120px,14vw,240px)] pt-[clamp(72px,9vw,150px)] text-paper-ink"
    >
      <Lines
        as="h2"
        id="services-title"
        lines={["What you can", "hire me for."]}
        className="mb-[clamp(40px,6vw,96px)] text-[clamp(52px,8.4vw,156px)] font-extrabold leading-[0.86] tracking-[-0.025em] wdth-62"
      />

      <ul className="group/list">
        {services.items.map((item, i) => (
          <li
            key={item.name}
            className="group/item border-t border-paper-ink/15 transition-opacity duration-500 last:border-b group-hover/list:opacity-40 hover:!opacity-100"
          >
            <Fade delay={i * 0.06} className="grid gap-x-6 gap-y-3 py-[clamp(24px,3vw,44px)] md:grid-cols-12 md:items-baseline">
              <h3 className="text-[clamp(34px,4.8vw,84px)] font-extrabold leading-[0.95] tracking-[-0.02em] wdth-62 transition-[font-variation-settings] duration-700 ease-out-expo group-hover/item:wdth-100 md:col-span-7">
                {item.name}
              </h3>
              <div className="md:col-span-5">
                <p className="max-w-[44ch] text-[clamp(16px,1.2vw,19px)] leading-[1.55] text-paper-ink/75">{item.body}</p>
                <p className="mt-3 text-[14px] text-paper-ink/55">{item.tags.join(", ")}</p>
              </div>
            </Fade>
          </li>
        ))}
      </ul>
    </section>
  );
}
