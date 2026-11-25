import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { ThemeWatcher } from "@/components/ui/theme";
import { GLRoot } from "@/components/gl/gl-root";
import { Loader } from "@/components/loader";
import { site } from "@/lib/content";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
});

// The one serif accent: italic only, light, with optical sizing. Newsreader Italic (Google
// Fonts, OFL 1.1), Latin subset, pinned at weight 300 with the opsz axis kept: every use is
// light, and dropping the weight axis halves the file.
const newsreader = localFont({
  src: "./fonts/newsreader-italic-300.woff2",
  weight: "300",
  style: "italic",
  variable: "--font-newsreader",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const title = `${site.name}, ${site.role}`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${title} | Websites and the software behind them`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  keywords: [
    "Siddhant Kotak",
    "web designer",
    "fullstack engineer",
    "AI engineer",
    "Next.js developer",
    "React developer",
    "web designer Ahmedabad",
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
  themeColor: "#110f17",
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

// First visit in a tab shows the entry curtain; repeat visits skip it and run entrances faster.
const introScript = `try{if(sessionStorage.getItem("sk-seen")==="1")document.documentElement.dataset.seen="";sessionStorage.setItem("sk-seen","1")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${newsreader.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <Loader />
        <Providers>
          <GLRoot />
          {children}
          <ThemeWatcher />
        </Providers>
        <div aria-hidden className="grain" />
      </body>
    </html>
  );
}
