"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/content";

/** The current year, filled in on the client so the page can be prerendered. */
export function SethYear() {
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setYear(new Date().getFullYear()));
    return () => cancelAnimationFrame(id);
  }, []);
  return <span suppressHydrationWarning>{year ?? 2026}</span>;
}

/** Copies the email; shows `copied` briefly; falls back to mailto when the clipboard is unavailable. */
export function useCopyEmail() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);
  const copy = async () => {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error("no clipboard");
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
    } catch {
      window.location.href = `mailto:${site.email}`;
    }
  };
  return { copied, copy };
}

/** Pixel icons drawn for the buttons (the reference uses pixel icons; these are new drawings). */
export function PixelDoc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 9 11" shapeRendering="crispEdges" aria-hidden className={className} fill="currentColor">
      <path d="M0 0h6v1H0zM6 1h1v1H6zM7 2h1v1H7zM8 3h1v8H8zM0 1h1v10H0zM1 10h7v1H1zM5 1h1v3H5zM6 3h2v1H6zM2 5h4v1H2zM2 7h5v1H2z" />
    </svg>
  );
}

export function PixelMail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 11 9" shapeRendering="crispEdges" aria-hidden className={className} fill="currentColor">
      <path d="M0 0h11v1H0zM0 8h11v1H0zM0 1h1v7H0zM10 1h1v7H10zM1 1h1v1H1zM9 1h1v1H9zM2 2h1v1H2zM8 2h1v1H8zM3 3h1v1H3zM7 3h1v1H7zM4 4h1v1H4zM6 4h1v1H6zM5 5h1v1H5z" />
    </svg>
  );
}
