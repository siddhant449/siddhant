"use client";

import { createContext, useContext } from "react";

export type StackState = {
  /** Index of the layer being read, 0 = Interface ... 4 = Cloud. */
  active: number;
  /** Scroll the list to a layer. */
  pick: (index: number) => void;
};

export const StackContext = createContext<StackState>({ active: 0, pick: () => {} });

export const useStack = () => useContext(StackContext);
