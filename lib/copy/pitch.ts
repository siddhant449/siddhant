/**
 * Copy for the client-pitch sections: why hire me and the chapter titles.
 *
 * Facts come from lib/content.ts. Nothing here states a price, a duration,
 * a reply time or a client that isn't named in content.ts.
 */
/* ------------------------------------------------------------------ */
/* Why hire me (after area17.com/culture, the values)                     */
/* ------------------------------------------------------------------ */

export type Reason = {
  /** one word in the pill above the reason */
  tag: string;
  /** pill ground, from the Ember palette */
  tone: "signal" | "stone" | "deep" | "ink";
  title: string;
  body: string;
};

export const whyCopy = {
  title: "Why hire me", // owner to confirm
  statement: "I write, design and build the work myself, then look after it once it’s live.", // owner to confirm
  reasons: [
    {
      tag: "Design and code", // owner to confirm
      tone: "signal",
      title: "Designer and engineer in one", // owner to confirm
      body: "The person who designs it builds it, so nothing gets lost between design and code.", // owner to confirm
    },
    {
      tag: "Reliability", // owner to confirm
      tone: "stone",
      title: "Built to hold up", // owner to confirm
      body: "Tested before it ships, monitored once it runs.", // owner to confirm
    },
    {
      tag: "Clarity", // owner to confirm
      tone: "deep",
      title: "Clear communication", // owner to confirm
      body: "A written brief, a staging link to follow along, written updates.", // owner to confirm
    },
    {
      tag: "Ownership", // owner to confirm
      tone: "ink",
      title: "Yours to keep", // owner to confirm
      body: "You own the code, the content and the accounts.", // owner to confirm
    },
  ] satisfies Reason[],
  cta: { label: "Start a project", href: "#contact" }, // owner to confirm
};

/* Layout references, for the record: rejouice.com, area17.com/culture,
   rejouice.com/services, ramotion.com/faq, dennissnellenberg.com. */

/* ------------------------------------------------------------------ */
/* Chapter titles: a giant word before each practice (after Rejouice). */
/* ------------------------------------------------------------------ */
export const chapterTitles = {
  design: { word: "Website", sub: ["One site, written and built", "to win the ", "enquiry."] as [string, string, string] },
  // owner to confirm
  engineering: { word: "Product", sub: ["Software built for systems", "that can’t go ", "down."] as [string, string, string] },
};
