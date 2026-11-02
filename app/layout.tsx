import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import Shell from "@/components/Shell";
import { getTracks } from "@/lib/tracks";
import "lenis/dist/lenis.css";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

// On Vercel this resolves social images against the production domain.
const site = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const metadata: Metadata = {
  metadataBase: new URL(site ? `https://${site}` : "http://localhost:3000"),
  title: "Siddhant Kotak, Fullstack + AI Engineer",
  description:
    "Portfolio of Siddhant Kotak: web design for Truvolt and WebIndia, engineering for a clinical messaging platform and Shizuku, an AI manga studio. Built with WebGL, Motion and Lenis.",
  openGraph: {
    title: "Siddhant Kotak",
    description: "Web design and engineering from Ahmedabad. A-side: Truvolt, WebIndia. B-side: clinical messaging, Shizuku, an AI manga studio.",
    images: ["/img/ledge.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#121110",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tracks = await getTracks();
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        <Shell tracks={tracks}>{children}</Shell>
      </body>
    </html>
  );
}
