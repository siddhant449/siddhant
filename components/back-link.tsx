"use client";

import { useRouter } from "next/navigation";

/**
 * Back from a case study: to wherever the visitor came from on this site,
 * or to the right chapter of the home page if they landed here directly.
 */
export function BackLink({ fallback, label }: { fallback: string; label: string }) {
  const router = useRouter();
  return (
    <a
      href={fallback}
      onClick={(e) => {
        const fromHere = document.referrer.startsWith(window.location.origin) && window.history.length > 1;
        if (!fromHere) return;
        e.preventDefault();
        router.back();
      }}
      className="btn btn-line"
    >
      {label}
    </a>
  );
}
