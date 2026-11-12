import { cylinder, onTop, pathOf, slabOf, translateAlong, type Flat } from "@/components/iso/iso-kit";
import {
  BLOWER,
  CABINET,
  DRAWER_FACE_X,
  DRAWER_ROWS,
  FAN_Z,
  GAUGES,
  GAUGE_Z,
  OPEN_DRAWER,
  P,
  TABLE_R,
  TABLE_Z,
  TUBE_R,
  at,
} from "./view";

/*
  Paths for the parts that move. These run in the browser every frame, so
  they import only the projection and a handful of constants.
*/

const RAD = Math.PI / 180;
const fine = (v: number) => Math.round(v * 100) / 100;

/** Move the capsule (built around z = 0) to a height. */
export const capsuleAt = (z: number) => translateAlong(P, [0, 0, fine(z)]);

/** The index table's selector: a pointer from the tube to a knob on the rim. */
export function selectorAt(turn: number) {
  const a = turn * RAD;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const knob = cylinder(fine((TABLE_R - 5.5) * c), fine((TABLE_R - 5.5) * s), 2.6, TABLE_Z, 3.2, P, 18);
  return {
    pointer: pathOf([at([(TUBE_R + 1.5) * c, (TUBE_R + 1.5) * s, TABLE_Z + 0.6]), at([(TABLE_R - 8.5) * c, (TABLE_R - 8.5) * s, TABLE_Z + 0.6])]),
    knobFill: knob.fill,
    knobTop: knob.top,
    knobEdge: knob.outline,
  };
}

/** Topic number (1..13) to the angle of its major tick. Tick 0 points along -y. */
export const topicTurn = (topic: number) => -90 + ((topic - 1) * 360) / 13;

/** Five fan blades on the blower's top grille. */
export function bladesAt(spin: number) {
  const [cx, cy] = BLOWER;
  const lines: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (spin + i * 72) * RAD;
    const b = a + 0.55;
    lines.push(
      onTop(
        [
          [cx + 4.2 * Math.cos(a), cy + 4.2 * Math.sin(a)],
          [cx + 9 * Math.cos(a + 0.22), cy + 9 * Math.sin(a + 0.22)],
          [cx + 12.6 * Math.cos(b), cy + 12.6 * Math.sin(b)],
        ],
        FAN_Z - 2.6,
        P,
      ),
    );
  }
  return lines.join("");
}

/** A gauge needle for a value between 0 and 1 over a 270 degree sweep. */
export function needleAt(gauge: number, value: number) {
  const [x, y] = GAUGES[gauge];
  const angle = (-135 + 270 * Math.max(0, Math.min(1, value))) * RAD;
  const tip: Flat = [x + 4.8 * Math.sin(angle), y - 4.8 * Math.cos(angle)];
  return onTop([[x, y], tip], GAUGE_Z + 0.2, P);
}

/** The open drawer: its box growing out of the cabinet, and its front moved with it. */
export function drawerAt(open: number) {
  const { z0, z1 } = DRAWER_ROWS[OPEN_DRAWER];
  const body = open > 0.4 ? slabOf({ x: DRAWER_FACE_X, y: CABINET.y + 4, w: open, d: CABINET.d - 8, r: 0.4 }, z0 + 1.2, z1 - z0 - 2.4, P, 2) : null;
  const cards =
    open > 4
      ? Array.from({ length: Math.floor(open / 3) }, (_, i) => DRAWER_FACE_X + 1.6 + i * 3)
          .filter((x) => x < DRAWER_FACE_X + open - 1)
          .map((x) => onTop([[x, CABINET.y + 7], [x, CABINET.y + CABINET.d - 7]], z1 - 1.2, P))
          .join("")
      : "";
  return {
    front: translateAlong(P, [fine(open), 0, 0]),
    bodyFill: body?.fill ?? "",
    bodyShades: body?.shades ?? [],
    bodyTop: body?.top ?? "",
    bodyEdge: body?.outline ?? "",
    cards,
  };
}
