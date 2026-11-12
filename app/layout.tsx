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
  display: "swap",
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
const introScript = `try{if(sessionStorage.getItem("sk-intro-seen")==="1"||matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.intro="seen"}catch(e){}`;

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
          <style>{`.preloader{display:none!important}`}</style>
        </noscript>
      </body>
    </html>
  );
}
