"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/content";

function format(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: site.timeZone,
  }).format(date);
}

/** Current time in Ahmedabad. Renders after mount to avoid a hydration mismatch. */
export function LocalTime({ className }: { className?: string }) {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(format(new Date()));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <time className={`tabular-nums ${className ?? ""}`} suppressHydrationWarning>
      {now ?? "--:--"}
    </time>
  );
}
