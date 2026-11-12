"use client";

import { TOWER_LAYERS } from "./art";
import { TowerLive } from "./live";

const LABEL =
  "A pneumatic sorting tower on a heavy base: two columns, a crossbeam at each level and one glass tube clamped down the middle. A capsule enters through a hinged lid on the roof and drops floor by floor: past a terminal with a pixel screen and keyboard (Interface); onto an index table with thirteen topic positions, beside a magazine of waiting capsules and a tray for rejected ones (System Design); past a filing cabinet whose locked drawers slide open (Fullstack); through a ring of sensors that scores it on a small display (AI); and down to a blower with pressure gauges that sends it out along two lines through a bulkhead (Cloud and Deployment).";

/** The drawing and its moving parts. Loaded on demand; the geometry is computed when this module loads. */
export default function TowerScene() {
  return <TowerLive label={LABEL}>{TOWER_LAYERS}</TowerLive>;
}
