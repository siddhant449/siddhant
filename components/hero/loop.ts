/** Whether a canvas draws every frame, and whether it owes one frame (its content changed while it rested). */
export type Loop = { running: boolean; dirty: boolean };

/**
 * The hero's canvas loop: it draws every frame only while the hero is on screen, revealed, and not
 * yet covered by SC.02 (set by Hero.tsx from the scroll, without a render). It starts dirty, so
 * the first frame (compiling the shaders behind the gate) is drawn as soon as the scene loads.
 */
export const heroLoop: Loop = { running: false, dirty: true };
