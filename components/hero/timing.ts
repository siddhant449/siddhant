/**
 * The hero pins for its exit, then hands over to SC.02 on a cut. It is 100svh of stage plus
 * HERO_EXIT of track, and SC.02 lies under its last 100svh: the hero's last frame is the frame
 * SC.02's stage pins on, so no empty frame scrolls by in between. HERO_PIN is the exit's share
 * of the hero's own scroll progress (start start → end start).
 */
export const HERO_EXIT = 85;
export const HERO_PIN = HERO_EXIT / (100 + HERO_EXIT);

/**
 * The slit both scenes share, as a fraction of its open width: the hero's blade narrows to it,
 * and SC.02 opens out of it. With the 1px hairline over it, it is the match cut.
 */
export const SLIT_HAIR = 0.02;
