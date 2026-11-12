import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { Cursor } from "@/components/cursor";
import { FlowField } from "@/components/flow-field";
import { Preloader } from "@/components/preloader";
import { Providers } from "@/components/providers";
import { site } from "@/lib/content";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  // Text waits for the real font instead of swapping: the intro covers the wait,
  // and the condensed and expanded widths have no fallback that could match them.
  display: "block",
});

const title = `${site.name}, ${site.role}`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${title} | Polished on the surface, engineered all the way down`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  keywords: [
    "Siddhant Kotak",
    "fullstack engineer",
    "AI engineer",
    "Next.js developer",
    "React developer",
    "web developer Ahmedabad",
    "freelance web developer India",
  ],
  openGraph: {
    type: "website",
    url: site.url,
    siteName: site.name,
    title,
    description: site.description,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: site.description,
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  jobTitle: site.role,
  url: site.url,
  email: `mailto:${site.email}`,
  address: { "@type": "PostalAddress", addressLocality: "Ahmedabad", addressCountry: "IN" },
  sameAs: [site.links.linkedin, site.links.github],
};

// Skip the intro on repeat visits before the first paint.
// Mark when the web font is ready, so text that wraps differently in it is laid out only once.
const introScript = `try{var d=document.documentElement,r=function(){d.dataset.fonts="ready"};if(sessionStorage.getItem("sk-intro-seen")==="1"||matchMedia("(prefers-reduced-motion: reduce)").matches)d.dataset.intro="seen";if(document.fonts&&document.fonts.load){document.fonts.load('200 16px "Archivo"').then(r,r);setTimeout(r,3000)}else r()}catch(e){document.documentElement.dataset.fonts="ready"}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <Providers>
          <Preloader />
          <FlowField />
          {children}
          <Cursor />
        </Providers>
        <div aria-hidden className="grain" />
        <noscript>
          <style>{`.preloader{display:none!important}.await-font{visibility:visible!important}`}</style>
        </noscript>
      </body>
    </html>
  );
}
