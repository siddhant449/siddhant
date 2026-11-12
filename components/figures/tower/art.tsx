import * as React from "react";
import { Dots, Line, Solid, Wire } from "@/components/iso/react/draw";
import type { SolidPaths } from "@/components/iso/iso-kit";
import {
  AI_ART,
  AI_DEPTH,
  BASE_ART,
  CAPSULE,
  CLOUD_ART,
  CLOUD_DEPTH,
  COLUMN_CAPS,
  COLUMN_FEET,
  FLOOR_HITS,
  FULLSTACK_ART,
  FULLSTACK_DEPTH,
  INTAKE,
  INTERFACE_ART,
  INTERFACE_DEPTH,
  LEVEL_ART,
  PLATFORMS,
  RUNS,
  SCREEN,
  SYSTEMS_ART,
  SYSTEMS_DEPTH,
  columnSegment,
  depth,
  type Rod,
} from "./geometry";
import { COLUMNS, COLUMN_TOP, LEVELS, OPEN_DRAWER } from "./view";

/*
  The static drawing, built on the server. The stand is painted in bands
  between levels, bottom to top; inside a band every item is painted far to
  near, and the platform that closes the band (the floor of the band above)
  is painted last. Moving parts are marked with data-move. The capsule is
  defined once and drawn into each run of glass through a clip, so it is
  always painted in the slot where it physically is.
*/

type Item = { depth: number; key: string; node: React.ReactNode };
const sorted = (items: Item[]) => [...items].sort((a, b) => a.depth - b.depth).map((item) => <React.Fragment key={item.key}>{item.node}</React.Fragment>);

function RodArt({ rod, tone = "mid" }: { rod: Rod; tone?: "hi" | "mid" | "lo" }) {
  return (
    <g className="iso-solid">
      <path className="iso-fill" d={rod.fill} />
      <path className="iso-shade" data-shade="1" d={rod.shade} />
      <path className="iso-top" d={rod.end} />
      <Line d={rod.shine} tone="faint" />
      <path className="iso-line iso-edge" data-tone={tone} d={rod.outline} />
      <path className="iso-line" data-tone="lo" d={rod.end} />
    </g>
  );
}

function columns(z0: number, z1: number, band: string): Item[] {
  return COLUMNS.map((_, i) => {
    const { paths, depth: d } = columnSegment(i, z0, z1);
    return { depth: d - 0.2, key: `${band}-column-${i}`, node: <Solid paths={paths} tone="mid" crease="faint" /> };
  });
}

/** The crossbeam (and its lug) closing a band; it runs behind the tube. */
function beam(level: number): Item {
  const l = LEVEL_ART[level];
  return {
    depth: depth([-11, -11, l.z - 3]),
    key: `beam-${level}`,
    node: (
      <g>
        <Solid paths={l.beam} tone="mid" crease="faint" />
        <Dots points={l.beamBolts} size={0.55} tone="mid" />
        <Solid paths={l.lug} tone="mid" crease="faint" />
      </g>
    ),
  };
}

function clamp(level: number): Item {
  const l = LEVEL_ART[level];
  return {
    depth: -1,
    key: `clamp-${level}`,
    node: (
      <g>
        <Solid paths={l.clamp} tone="mid" crease="faint" />
        <Line d={l.clampSeam} tone="faint" />
        <Dots points={l.clampBolts} size={0.5} tone="mid" />
      </g>
    ),
  };
}

function platform(key: keyof typeof PLATFORMS): React.ReactNode {
  const p = PLATFORMS[key];
  return (
    <g key={`platform-${key}`}>
      <Solid paths={p.bracket} tone="mid" crease="faint" />
      <Dots points={p.bracketBolts} size={0.5} tone="mid" />
      <Solid paths={p.plate} tone="mid" crease="faint" />
      <Line d={p.groove} tone="faint" />
      <Line d={p.seam} tone="faint" />
      <Dots points={p.screws} size={0.55} tone="mid" />
    </g>
  );
}

/** One run of glass: back wall, then the capsule through a clip, then the front. */
function run(key: keyof typeof RUNS): Item {
  const r = RUNS[key];
  return {
    depth: 0,
    key: `run-${key}`,
    node: (
      <g className="tw-tube" data-band={key}>
        <path className="tw-glass" d={r.glass.fill} />
        <Line d={r.back} tone="faint" />
        <use href="#tw-capsule" clipPath={`url(#tw-clip-${key})`} />
        <path className="iso-line iso-edge" data-tone="mid" d={r.glass.outline} />
        <Line d={r.shineSoft} tone="lo" className="tw-shine" />
        <Line d={r.shine} tone="hi" className="tw-shine" />
      </g>
    ),
  };
}

/* ------------------------------------------------------------------ */

const BASE = (
  <g key="base">
    <path className="iso-halo" d={BASE_ART.halo} />
    {BASE_ART.feet.map((parts, i) => (
      <g key={i}>
        {parts.map((paths, j) => (
          <Solid key={j} paths={paths as SolidPaths} tone={j ? "mid" : "lo"} crease="faint" />
        ))}
      </g>
    ))}
    <Solid paths={BASE_ART.slab} tone="mid" crease="faint" />
    <Line d={BASE_ART.groove} tone="lo" />
    <Line d={BASE_ART.screwRings} tone="lo" />
    <Dots points={BASE_ART.screws} size={0.55} tone="mid" />
    <Solid paths={BASE_ART.ruler} tone="lo" crease="none" />
    <Line d={BASE_ART.ticksMinor} tone="lo" />
    <Line d={BASE_ART.ticksMajor} tone="mid" />
    <Solid paths={BASE_ART.label} tone="lo" crease="none" />
    <Line d={BASE_ART.labelLine} tone="faint" />
    <Line d={BASE_ART.labelRule} tone="lo" />
    <Dots points={BASE_ART.labelScrews} size={0.45} tone="mid" />
  </g>
);

/* Band 5: Cloud & Deployment, on the base ---------------------------- */

const CLOUD = (
  <g key="cloud">
    {sorted([
      ...COLUMN_FEET.map((f, i) => ({
        depth: f.depth - 1,
        key: `foot-${i}`,
        node: (
          <g>
            <Solid paths={f.plate} tone="lo" crease="none" />
            <Dots points={f.bolts} size={0.45} tone="mid" />
          </g>
        ),
      })),
      ...columns(2.4, LEVELS[0], "cloud"),
      beam(0),
      {
        depth: CLOUD_DEPTH.blower,
        key: "blower",
        node: (
          <g data-band="cloud">
            <Solid paths={CLOUD_ART.blowerFoot} tone="lo" crease="faint" />
            <Dots points={CLOUD_ART.blowerFootBolts} size={0.45} tone="mid" />
            <Solid paths={CLOUD_ART.blower} tone="mid" crease="faint" />
            <Line d={CLOUD_ART.blowerRibs} tone="faint" />
            <Line d={CLOUD_ART.blowerBand} tone="lo" />
            <Solid paths={CLOUD_ART.cowl} tone="mid" crease="faint" />
            <Line d={CLOUD_ART.grille} tone="lo" />
            <path className="iso-line" data-tone="mid" data-move="blades" d="" />
            <Solid paths={CLOUD_ART.hub} tone="mid" crease="none" />
          </g>
        ),
      },
      {
        depth: CLOUD_DEPTH.duct,
        key: "duct",
        node: (
          <g data-band="cloud">
            <Solid paths={CLOUD_ART.duct} tone="mid" crease="faint" />
            <Line d={CLOUD_ART.ductBands} tone="lo" />
          </g>
        ),
      },
      {
        depth: CLOUD_DEPTH.housing - 1,
        key: "housing",
        node: (
          <g data-band="cloud">
            <Solid paths={CLOUD_ART.housing} tone="mid" crease="faint" />
            <Line d={CLOUD_ART.housingGroove} tone="faint" />
            <Line d={CLOUD_ART.housingSeam} tone="faint" />
            <Dots points={CLOUD_ART.housingBolts} size={0.5} tone="mid" />
            <Solid paths={CLOUD_ART.inlet} tone="mid" crease="faint" />
            <Dots points={CLOUD_ART.inletBolts} size={0.45} tone="mid" />
          </g>
        ),
      },
      run("cloud"),
      {
        depth: CLOUD_DEPTH.outbound,
        key: "outbound",
        node: (
          <g data-band="cloud">
            {CLOUD_ART.outbound.map((rod, i) => (
              <g key={i}>
                <RodArt rod={rod} />
                <path className="iso-line tw-flow" data-tone="lit" data-flow="" d={CLOUD_ART.flow[i]} />
              </g>
            ))}
            {CLOUD_ART.outboundBands.map((rod, i) => (
              <RodArt key={`band-${i}`} rod={rod} />
            ))}
            {CLOUD_ART.outboundFlanges.map((rod, i) => (
              <RodArt key={`flange-${i}`} rod={rod} />
            ))}
          </g>
        ),
      },
      {
        depth: CLOUD_DEPTH.bulkhead,
        key: "bulkhead",
        node: (
          <g data-band="cloud">
            <Solid paths={CLOUD_ART.bulkheadFoot} tone="lo" crease="none" />
            <Solid paths={CLOUD_ART.bulkhead} tone="mid" crease="faint" />
            <Dots points={CLOUD_ART.bulkheadBolts} size={0.5} tone="mid" />
          </g>
        ),
      },
      {
        depth: CLOUD_DEPTH.pedestal,
        key: "pedestal",
        node: (
          <g data-band="cloud">
            <Wire from={CLOUD_ART.senseLine.from} via={CLOUD_ART.senseLine.via} to={CLOUD_ART.senseLine.to} tone="lo" size={0.9} />
            <Solid paths={CLOUD_ART.pedestal} tone="mid" crease="faint" />
            <Line d={CLOUD_ART.pedestalGroove} tone="faint" />
            {CLOUD_ART.gauges.map((g, i) => (
              <g key={i}>
                <Solid paths={g.bezel} tone="mid" crease="faint" />
                <Line d={g.face} tone="faint" />
                <Line d={g.ticks.minor} tone="lo" />
                <Line d={g.ticks.major} tone="mid" />
                <path className="iso-line tw-needle" data-tone="hi" data-move={`needle-${i}`} d="" />
                <Dots points={[g.center]} size={0.7} tone="hi" />
              </g>
            ))}
          </g>
        ),
      },
    ])}
    {platform("ai")}
  </g>
);

/* Band 4: AI ---------------------------------------------------------- */

const SENSOR = (s: (typeof AI_ART.sensors)[number]) => (
  <g key={s.a} className="tw-sensor">
    <Solid paths={s.head} tone="mid" crease="none" />
    <circle className="tw-lens" cx={s.lens[0]} cy={s.lens[1]} r={0.9} />
  </g>
);

const AI = (
  <g key="ai">
    {sorted([
      ...columns(LEVELS[0], LEVELS[1], "ai"),
      beam(1),
      clamp(0),
      ...AI_ART.struts.map((s) => ({ depth: s.back ? -12 : 12, key: `strut-${s.a}`, node: <Solid paths={s.paths} tone="mid" crease="none" /> })),
      {
        depth: -6,
        key: "ring-back",
        node: (
          <g data-band="ai">
            <Solid paths={AI_ART.ringBack} tone="mid" crease="faint" />
            {AI_ART.sensors.filter((s) => s.back).map(SENSOR)}
          </g>
        ),
      },
      run("ai"),
      {
        depth: 6,
        key: "ring-front",
        node: (
          <g data-band="ai">
            <Solid paths={AI_ART.ringFront} tone="mid" crease="faint" />
            <Line d={AI_ART.ringGroove} tone="faint" />
            {AI_ART.sensors.filter((s) => !s.back).map(SENSOR)}
          </g>
        ),
      },
      {
        depth: AI_DEPTH.display,
        key: "display",
        node: (
          <g data-band="ai">
            <Wire from={AI_ART.cable.from} via={AI_ART.cable.via} to={AI_ART.cable.to} tone="lo" size={0.9} />
            <Solid paths={AI_ART.stalkFoot} tone="lo" crease="none" />
            <Solid paths={AI_ART.stalk} tone="mid" crease="none" />
            <Solid paths={AI_ART.display} tone="mid" crease="faint" />
            <Line d={AI_ART.displayTop} tone="faint" />
            <g transform={AI_ART.face}>
              <rect className="tw-window" x={2.6} y={2.6} width={AI_ART.faceSize.w - 5.2} height={AI_ART.faceSize.h - 5.2} rx={1.2} />
              <text className="tw-readout" data-move="score" x={AI_ART.faceSize.w / 2} y={12.4} textAnchor="middle">
                --
              </text>
              <g className="tw-bars">
                {[3, 5, 4, 7, 6, 8, 9, 7, 10].map((h, i) => (
                  <line key={i} x1={6.4 + i * 2.7} x2={6.4 + i * 2.7} y1={19.4} y2={19.4 - h * 0.48} />
                ))}
              </g>
            </g>
          </g>
        ),
      },
    ])}
    {platform("fullstack")}
  </g>
);

/* Band 3: Fullstack --------------------------------------------------- */

const DRAWER = (d: (typeof FULLSTACK_ART.drawers)[number]) => (
  <>
    <Solid paths={d.front} tone="mid" crease="faint" />
    <path className="iso-line" data-tone="lo" d={d.holder} />
    <Line d={d.card} tone="faint" />
    <Dots points={d.rivets} size={0.4} tone="mid" />
    <Solid paths={d.handle} tone="mid" crease="none" />
    <path className="iso-line tw-lock" data-tone="mid" d={d.lock} />
  </>
);

const FULLSTACK = (
  <g key="fullstack">
    {sorted([
      ...columns(LEVELS[1], LEVELS[2], "fullstack"),
      beam(2),
      clamp(1),
      run("fullstack"),
      {
        depth: FULLSTACK_DEPTH.arm,
        key: "arm",
        node: (
          <g data-band="fullstack">
            <Solid paths={FULLSTACK_ART.armLug} tone="mid" crease="faint" />
            <Solid paths={FULLSTACK_ART.arm} tone="mid" crease="faint" />
            <Dots points={FULLSTACK_ART.armBolts} size={0.5} tone="mid" />
          </g>
        ),
      },
      {
        depth: FULLSTACK_DEPTH.cabinet,
        key: "cabinet",
        node: (
          <g data-band="fullstack">
            <Solid paths={FULLSTACK_ART.plinth} tone="lo" crease="none" />
            <Solid paths={FULLSTACK_ART.cabinet} tone="mid" crease="faint" />
            <Line d={FULLSTACK_ART.cabinetTop} tone="faint" />
            <Dots points={FULLSTACK_ART.cabinetBolts} size={0.5} tone="mid" />
            {FULLSTACK_ART.drawers.map((d, i) =>
              i === OPEN_DRAWER ? (
                <g key={i}>
                  <g className="iso-solid" data-move="drawer-body">
                    <path className="iso-fill" d="" />
                    {[0, 1, 2, 3].map((shade) => (
                      <path key={shade} className="iso-shade" data-shade={shade} d="" />
                    ))}
                    <path className="iso-top" d="" />
                    <path className="iso-line" data-tone="lo" data-part="cards" d="" />
                    <path className="iso-line iso-edge" data-tone="mid" d="" />
                  </g>
                  <g data-move="drawer-front">{DRAWER(d)}</g>
                </g>
              ) : (
                <g key={i}>{DRAWER(d)}</g>
              ),
            )}
          </g>
        ),
      },
    ])}
    {platform("systems")}
  </g>
);

/* Band 2: System Design ----------------------------------------------- */

const SYSTEMS = (
  <g key="systems">
    {sorted([
      ...columns(LEVELS[2], LEVELS[3], "systems"),
      beam(3),
      {
        depth: -2,
        key: "table",
        node: (
          <g data-band="systems">
            <Solid paths={SYSTEMS_ART.tableFoot} tone="lo" crease="none" />
            <Solid paths={SYSTEMS_ART.table} tone="mid" crease="faint" />
            <Line d={SYSTEMS_ART.ticks.minor} tone="lo" />
            <Line d={SYSTEMS_ART.ticks.major} tone="mid" />
            <Solid paths={SYSTEMS_ART.index} tone="mid" crease="none" />
            <Line d={SYSTEMS_ART.indexMark} tone="hi" />
            <g className="iso-solid" data-move="selector">
              <path className="iso-line" data-tone="hi" data-part="pointer" d="" />
              <path className="iso-fill" data-part="knob-fill" d="" />
              <path className="iso-top" data-part="knob-top" d="" />
              <path className="iso-line iso-edge" data-tone="hi" data-part="knob-edge" d="" />
            </g>
          </g>
        ),
      },
      run("systems"),
      {
        depth: SYSTEMS_DEPTH.magazine,
        key: "magazine",
        node: (
          <g data-band="systems">
            <Solid paths={SYSTEMS_ART.magazineBase} tone="mid" crease="faint" />
            <Solid paths={SYSTEMS_ART.magazineBack} tone="mid" crease="faint" />
            {SYSTEMS_ART.queue.map((q, i) => (
              <g key={i}>
                <Solid paths={q.body} tone="mid" crease="none" />
                <Line d={q.band} tone="lo" />
                <Solid paths={q.cap} tone="mid" crease="none" />
              </g>
            ))}
            <Solid paths={SYSTEMS_ART.magazineRail} tone="mid" crease="none" />
          </g>
        ),
      },
      { depth: SYSTEMS_DEPTH.chute, key: "chute", node: <g data-band="systems"><Solid paths={SYSTEMS_ART.chute} tone="mid" crease="faint" /></g> },
      { depth: SYSTEMS_DEPTH.rejectChute, key: "reject-chute", node: <g data-band="systems"><Solid paths={SYSTEMS_ART.rejectChute} tone="mid" crease="faint" /></g> },
      {
        depth: SYSTEMS_DEPTH.tray,
        key: "tray",
        node: (
          <g data-band="systems">
            <Solid paths={SYSTEMS_ART.trayFloor} tone="lo" crease="none" />
            {SYSTEMS_ART.trayBackWalls.map((w, i) => (
              <Solid key={i} paths={w} tone="mid" crease="faint" />
            ))}
            <RodArt rod={SYSTEMS_ART.rejected} tone="mid" />
            {SYSTEMS_ART.trayFrontWalls.map((w, i) => (
              <Solid key={i} paths={w} tone="mid" crease="faint" />
            ))}
            <path className="iso-line" data-tone="lo" d={SYSTEMS_ART.trayHolder} />
            <Line d={SYSTEMS_ART.trayCard} tone="faint" />
            <Dots points={SYSTEMS_ART.trayRivets} size={0.4} tone="mid" />
          </g>
        ),
      },
    ])}
    {platform("interface")}
  </g>
);

/* Band 1: Interface --------------------------------------------------- */

const PIXELS = (() => {
  const cols = 11;
  const rows = 6;
  // A tiny button, drawn in pixels: the thing a person taps.
  const lit = new Set(["3,2", "4,2", "5,2", "6,2", "7,2", "3,3", "7,3", "4,3", "5,3", "6,3", "3,4", "4,4", "5,4", "6,4", "7,4"]);
  const out: { x: number; y: number; on: boolean }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push({ x: SCREEN.u0 + 2.3 + c * ((SCREEN.w - 4.6) / (cols - 1)), y: SCREEN.v0 + 2.5 + r * ((SCREEN.h - 5) / (rows - 1)), on: lit.has(`${c},${r}`) });
  return out;
})();

const INTERFACE = (
  <g key="interface">
    {sorted([
      ...columns(LEVELS[3], LEVELS[4], "interface"),
      beam(4),
      clamp(3),
      run("interface"),
      { depth: 2, key: "cable", node: <Wire from={INTERFACE_ART.cable.from} via={INTERFACE_ART.cable.via} to={INTERFACE_ART.cable.to} tone="lo" size={0.9} /> },
      {
        depth: INTERFACE_DEPTH.desk,
        key: "desk",
        node: (
          <g data-band="interface">
            <Solid paths={INTERFACE_ART.desk} tone="mid" crease="faint" />
            <Line d={INTERFACE_ART.deskSeam} tone="faint" />
            <Line d={INTERFACE_ART.vents} tone="lo" />
          </g>
        ),
      },
      {
        depth: INTERFACE_DEPTH.monitor,
        key: "monitor",
        node: (
          <g data-band="interface">
            <Solid paths={INTERFACE_ART.monitor} tone="mid" crease="faint" />
            <Line d={INTERFACE_ART.monitorTop} tone="faint" />
            <g transform={SCREEN.matrix}>
              <rect className="tw-window" x={SCREEN.u0} y={SCREEN.v0} width={SCREEN.w} height={SCREEN.h} rx={1.4} />
              {PIXELS.map((p, i) => (
                <rect key={i} className={p.on ? "tw-px tw-px-on" : "tw-px"} x={p.x - 0.7} y={p.y - 0.7} width={1.4} height={1.4} />
              ))}
            </g>
          </g>
        ),
      },
      {
        depth: INTERFACE_DEPTH.keyboard,
        key: "keyboard",
        node: (
          <g data-band="interface">
            <Solid paths={INTERFACE_ART.keyboard} tone="mid" crease="faint" />
            <Dots points={INTERFACE_ART.keys} size={0.42} tone="lo" />
            <Solid paths={INTERFACE_ART.lamp} tone="mid" crease="none" />
            <circle className="tw-lamp" cx={INTERFACE_ART.lampTop[0]} cy={INTERFACE_ART.lampTop[1]} r={1.1} />
          </g>
        ),
      },
    ])}
  </g>
);

const ROOF = (
  <g key="roof">
    {sorted([
      ...columns(LEVELS[4], COLUMN_TOP, "roof"),
      clamp(4),
      {
        depth: 1,
        key: "intake",
        node: (
          <g>
            <Solid paths={INTAKE.hinge} tone="mid" crease="faint" />
            <Solid paths={INTAKE.bell} tone="mid" crease="faint" />
            <Dots points={INTAKE.bellBolts} size={0.5} tone="mid" />
            <g data-move="lid">
              <Solid paths={INTAKE.lid} tone="mid" crease="faint" />
              <Line d={INTAKE.lidRing} tone="faint" />
              <Solid paths={INTAKE.lidKnob} tone="mid" crease="faint" />
            </g>
          </g>
        ),
      },
      ...COLUMN_CAPS.map((c, i) => ({
        depth: depth([COLUMNS[i][0], COLUMNS[i][1], COLUMN_TOP]) + 0.1,
        key: `cap-${i}`,
        node: (
          <g>
            <Solid paths={c.cap} tone="mid" crease="faint" />
            <Solid paths={c.knob} tone="mid" crease="none" />
          </g>
        ),
      })),
    ])}
  </g>
);

const DEFS = (
  <defs key="defs">
    {Object.entries(RUNS).map(([key, r]) => (
      <clipPath key={key} id={`tw-clip-${key}`}>
        <path d={r.clip} />
      </clipPath>
    ))}
    <g id="tw-capsule" data-move="capsule">
      <Solid paths={CAPSULE.capBottom} tone="hi" crease="none" lit />
      <Solid paths={CAPSULE.body} tone="hi" crease="lo" lit />
      <Line d={CAPSULE.band} tone="mid" />
      <Line d={CAPSULE.latch} tone="mid" />
      <Solid paths={CAPSULE.capTop} tone="hi" crease="none" lit />
    </g>
  </defs>
);

const HITS = (
  <g key="hits" className="tw-hits">
    {FLOOR_HITS.map((d, i) => (
      <path key={i} d={d} data-floor={i} />
    ))}
  </g>
);

/** Everything, in paint order. Each root carries a key (see the kit's React notes). */
export const TOWER_LAYERS = [DEFS, BASE, CLOUD, AI, FULLSTACK, SYSTEMS, INTERFACE, ROOF, HITS];
