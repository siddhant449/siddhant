"use client";

import * as React from "react";
import { follow, spring, useInView, useLoop, useReadout, type Spring } from "@/components/iso/react/live";
import { useStack } from "@/lib/stack-context";
import { bladesAt, capsuleAt, drawerAt, needleAt, selectorAt, topicTurn } from "./frame";
import { DRAWER_TRAVEL, FLOORS, HEIGHT, INTAKE_STOP, P, WIDTH } from "./view";

/** Empty room added left of the drawing when the caption is shown, in drawing units. */
const CAPTION_ROOM = 110;
import { translateAlong } from "@/components/iso/iso-kit";

/*
  Moves the tower. The drawing itself is static SVG from the server; this
  component finds the parts marked data-move and writes their attributes
  each frame, without re-rendering React.
*/

const READOUTS = [
  () => "Floor 01, Interface: capsule loaded",
  (topic: number) => `Floor 02, Systems: routed to topic ${String(topic).padStart(2, "0")} of 13`,
  () => "Floor 03, Fullstack: drawer 2 of 4 open",
  (_: number, score: number) => `Floor 04, AI: scored ${Math.round(score)}%`,
  () => "Floor 05, Cloud: sent out on 2 lines",
];

type Nodes = {
  capsule: SVGGElement | null;
  lid: SVGGElement | null;
  blades: SVGPathElement | null;
  needles: (SVGPathElement | null)[];
  pointer: SVGPathElement | null;
  knobFill: SVGPathElement | null;
  knobTop: SVGPathElement | null;
  knobEdge: SVGPathElement | null;
  drawerFront: SVGGElement | null;
  drawerFill: SVGPathElement | null;
  drawerShades: (SVGPathElement | null)[];
  drawerTop: SVGPathElement | null;
  drawerCards: SVGPathElement | null;
  drawerEdge: SVGPathElement | null;
  score: SVGTextElement | null;
};

export function TowerLive({ label, children }: { label: string; children: React.ReactNode }) {
  const { active, pick } = useStack();
  const { anchor, say } = useReadout<HTMLDivElement>();
  const inView = useInView(anchor);

  // From tablet up the card carries a caption in its top-left, so the drawing
  // gets some empty room on its left and sits to the right of it.
  const [wide, setWide] = React.useState(() => window.matchMedia("(min-width: 768px)").matches);
  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const viewBox = wide ? `${-CAPTION_ROOM} 0 ${WIDTH + CAPTION_ROOM} ${HEIGHT}` : `0 0 ${WIDTH} ${HEIGHT}`;
  const nodes = React.useRef<Nodes | null>(null);

  // Model state, kept in refs so frames never re-render.
  const state = React.useRef({
    capsule: { at: INTAKE_STOP, rate: 0 } as Spring,
    drawer: { at: 0, rate: 0 } as Spring,
    turn: topicTurn(1),
    topic: 1,
    lid: 0,
    spin: 0,
    needles: [0.18, 0.12],
    score: 0,
    arrived: false,
  });

  React.useEffect(() => {
    const root = anchor.current;
    if (!root) return;
    const q = <T extends Element>(sel: string) => root.querySelector<T>(sel);
    const drawerBody = q<SVGGElement>('[data-move="drawer-body"]');
    const selector = q<SVGGElement>('[data-move="selector"]');
    nodes.current = {
      capsule: q('[data-move="capsule"]'),
      lid: q('[data-move="lid"]'),
      blades: q('[data-move="blades"]'),
      needles: [q('[data-move="needle-0"]'), q('[data-move="needle-1"]')],
      pointer: selector?.querySelector('[data-part="pointer"]') ?? null,
      knobFill: selector?.querySelector('[data-part="knob-fill"]') ?? null,
      knobTop: selector?.querySelector('[data-part="knob-top"]') ?? null,
      knobEdge: selector?.querySelector('[data-part="knob-edge"]') ?? null,
      drawerFront: q('[data-move="drawer-front"]'),
      drawerFill: drawerBody?.querySelector(".iso-fill") ?? null,
      drawerShades: drawerBody ? Array.from(drawerBody.querySelectorAll<SVGPathElement>(".iso-shade")) : [],
      drawerTop: drawerBody?.querySelector(".iso-top") ?? null,
      drawerCards: drawerBody?.querySelector('[data-part="cards"]') ?? null,
      drawerEdge: drawerBody?.querySelector(".iso-edge") ?? null,
      score: q('[data-move="score"]'),
    };
  }, [anchor]);

  // Each time the systems floor comes up, route to the next topic.
  const lastActive = React.useRef(active);
  React.useEffect(() => {
    const s = state.current;
    if (active === 1 && lastActive.current !== 1) s.topic = ((s.topic - 1 + 5) % 13) + 1;
    lastActive.current = active;
  }, [active]);

  const kick = useLoop((dt, calm) => {
    const n = nodes.current;
    if (!n) return false;
    const s = state.current;
    let moving = false;

    // The capsule drops from the intake to the floor being read.
    const target = FLOORS[active]?.stop ?? FLOORS[0].stop;
    const settledCapsule = spring(s.capsule, target, dt, 34, 11, calm);
    moving ||= !settledCapsule;
    n.capsule?.setAttribute("transform", capsuleAt(s.capsule.at));

    // The intake lid lifts while the capsule is still up in the bell.
    const lidTarget = s.capsule.at > FLOORS[0].stop + 14 ? 7 : 0;
    s.lid = follow(s.lid, lidTarget, dt, 0.16, calm);
    moving ||= s.lid !== lidTarget;
    n.lid?.setAttribute("transform", translateAlong(P, [0, 0, Math.round(s.lid * 100) / 100]));

    // Systems: the selector swings to the routed topic.
    const turnTarget = topicTurn(s.topic);
    s.turn = follow(s.turn, turnTarget, dt, 0.22, calm);
    moving ||= s.turn !== turnTarget;
    const sel = selectorAt(s.turn);
    n.pointer?.setAttribute("d", sel.pointer);
    n.knobFill?.setAttribute("d", sel.knobFill);
    n.knobTop?.setAttribute("d", sel.knobTop);
    n.knobEdge?.setAttribute("d", sel.knobEdge);

    // Fullstack: a drawer slides out.
    const drawerTarget = active === 2 ? DRAWER_TRAVEL : 0;
    const settledDrawer = spring(s.drawer, drawerTarget, dt, 120, 20, calm);
    moving ||= !settledDrawer;
    const d = drawerAt(Math.max(0, s.drawer.at));
    n.drawerFront?.setAttribute("transform", d.front);
    n.drawerFill?.setAttribute("d", d.bodyFill);
    n.drawerShades.forEach((node, i) => node?.setAttribute("d", d.bodyShades[i] ?? ""));
    n.drawerTop?.setAttribute("d", d.bodyTop);
    n.drawerCards?.setAttribute("d", d.cards);
    n.drawerEdge?.setAttribute("d", d.bodyEdge);

    // AI: the score counts up while the capsule is in the ring.
    const scoreTarget = active === 3 ? 92 : s.score;
    s.score = follow(s.score, scoreTarget, dt, 0.5, calm);
    moving ||= Math.abs(s.score - scoreTarget) > 0.05;
    if (n.score) n.score.textContent = s.score > 0.5 ? `${Math.round(s.score)}%` : "--";

    // Cloud: needles rise with the outbound flow; the blower always turns, faster when sending.
    const flow = active === 4;
    const needleTargets = flow ? [0.74, 0.58] : [0.22, 0.14];
    s.needles = s.needles.map((v, i) => follow(v, needleTargets[i], dt, 0.35, calm));
    moving ||= s.needles.some((v, i) => v !== needleTargets[i]);
    n.needles.forEach((node, i) => node?.setAttribute("d", needleAt(i, s.needles[i])));
    if (!calm) {
      s.spin = (s.spin + dt * (flow ? 420 : 60)) % 360;
      n.blades?.setAttribute("d", bladesAt(s.spin));
      moving = true;
    } else {
      n.blades?.setAttribute("d", bladesAt(18));
    }

    say(READOUTS[active]?.(s.topic, s.score) ?? "");
    return moving;
  }, inView);

  // Wake the loop whenever the floor changes.
  React.useEffect(() => {
    kick();
  }, [active, kick]);

  const onClick = (e: React.MouseEvent) => {
    const floor = (e.target as Element).closest<SVGPathElement>("[data-floor]")?.dataset.floor;
    if (floor !== undefined) pick(Number(floor));
  };

  return (
    <div ref={anchor} className="tw" data-floor={active} onClick={onClick}>
      <svg className="iso-svg" viewBox={viewBox} role="img" aria-label={label} focusable="false">
        {children}
      </svg>
    </div>
  );
}
