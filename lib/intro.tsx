"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type IntroState = {
  /** True once the opening sequence has handed over to the page. */
  done: boolean;
  finish: () => void;
};

const IntroContext = createContext<IntroState>({ done: true, finish: () => {} });

export function IntroProvider({ children }: { children: React.ReactNode }) {
  // No preloader any more: entrance animations start once the page has mounted.
  const [done, setDone] = useState(false);
  const finish = useCallback(() => setDone(true), []);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDone(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const value = useMemo(() => ({ done, finish }), [done, finish]);
  return <IntroContext.Provider value={value}>{children}</IntroContext.Provider>;
}

export function useIntro() {
  return useContext(IntroContext);
}
