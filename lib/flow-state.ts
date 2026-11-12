/**
 * Shared, mutable state for the flow field. Components write to it from scroll
 * and visibility callbacks; the WebGL loop reads it every frame. Kept outside
 * React on purpose so scrolling never triggers a render.
 */
export const flowState = {
  /** 0 = loose, fluid contours. 1 = straight, engineered lines. */
  heroOrder: 0,
  heroVisible: true,
  footerVisible: false,
  /** Fades the field in after the intro. */
  intro: 0,
  listeners: new Set<() => void>(),
};

/** Wake the render loop after a visibility change. */
export function notifyFlow() {
  flowState.listeners.forEach((fn) => fn());
}
