import { setConsoleFunction } from "three";

const CLOCK = "THREE.Clock: This module has been deprecated";

/**
 * three r183 deprecated THREE.Clock, but @react-three/fiber 9 (its latest stable line) still makes
 * one for every canvas, so each canvas logs the same warning in the browser and, through Next's log
 * forwarding, in the dev terminal. Drop that one message; everything else is logged as usual.
 * Imported for its side effect by every module that mounts a <Canvas>.
 */
setConsoleFunction((type, message, ...params) => {
  if (message.startsWith(CLOCK)) return;
  console[type](message, ...params);
});
