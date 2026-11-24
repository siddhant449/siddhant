"use client";

import { m, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import type { Diagram as DiagramData } from "@/lib/content";
import { EASE_REVEAL } from "./ui/reveal";

const W = 820;
const H = 330;
const BOX_W = 185;
const BOX_H = 64;
const colX = (c: number) => 10 + c * 205;
const rowY = (r: number) => 40 + r * 186;

type Node = DiagramData["nodes"][number];

/** A path from one box to another: straight along a row or column, curved otherwise. */
function route(a: Node, b: Node) {
  const ax = colX(a.col), ay = rowY(a.row), bx = colX(b.col), by = rowY(b.row);
  if (a.row === b.row) {
    const y = ay + BOX_H / 2;
    return a.col < b.col ? `M${ax + BOX_W} ${y} H${bx - 7}` : `M${ax} ${y} H${bx + BOX_W + 7}`;
  }
  const sx = ax + BOX_W / 2;
  const ex = bx + BOX_W / 2;
  const down = a.row < b.row;
  const sy = down ? ay + BOX_H : ay;
  const ey = down ? by - 7 : by + BOX_H + 7;
  if (a.col === b.col) return `M${sx} ${sy} V${ey}`;
  const my = (sy + ey) / 2;
  return `M${sx} ${sy} C${sx} ${my}, ${ex} ${my}, ${ex} ${ey}`;
}

/**
 * A schematic drawn in code. Boxes come up first, then the main path draws
 * itself in the accent colour, and a small pulse keeps travelling along it.
 */
export function Diagram({ data, label }: { data: DiagramData; label: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const show = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduce = useReducedMotion();
  const byId = Object.fromEntries(data.nodes.map((n) => [n.id, n]));
  const hot = data.edges.filter((e) => e.hot);
  const cold = data.edges.filter((e) => !e.hot);

  return (
    <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label}
        className="block h-auto w-full min-w-[640px]"
        fill="none"
        stroke="currentColor"
      >
        <defs>
          <marker id="dg-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 8 4 0 8" fill="var(--signal)" stroke="none" />
          </marker>
          <marker id="dg-arrow-cold" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 8 4 0 8" fill="currentColor" fillOpacity=".4" stroke="none" />
          </marker>
        </defs>

        {data.nodes.map((n, i) => (
          <m.g
            key={n.id}
            initial={{ opacity: 0, y: 8 }}
            animate={show ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: EASE_REVEAL, delay: 0.05 * i }}
          >
            <rect x={colX(n.col)} y={rowY(n.row)} width={BOX_W} height={BOX_H} rx="6" strokeOpacity=".28" />
            <text x={colX(n.col) + 14} y={rowY(n.row) + 26} fill="currentColor" stroke="none" fontFamily="var(--font-geist-mono)" fontSize="11.5" letterSpacing=".06em">
              {n.label.toUpperCase()}
            </text>
            <text x={colX(n.col) + 14} y={rowY(n.row) + 46} fill="currentColor" fillOpacity=".62" stroke="none" fontFamily="var(--font-geist-mono)" fontSize="10.5" letterSpacing=".05em">
              {n.sub.toUpperCase()}
            </text>
          </m.g>
        ))}

        {cold.map((e, i) => (
          <m.path
            key={`c${i}`}
            d={route(byId[e.from], byId[e.to])}
            strokeOpacity=".4"
            strokeWidth="1"
            strokeDasharray="3 4"
            markerEnd="url(#dg-arrow-cold)"
            initial={{ opacity: 0 }}
            animate={show ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 + i * 0.08 }}
          />
        ))}

        {hot.map((e, i) => {
          const d = route(byId[e.from], byId[e.to]);
          return (
            <g key={`h${i}`}>
              <m.path
                d={d}
                stroke="var(--signal)"
                strokeWidth="1.5"
                markerEnd="url(#dg-arrow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={show ? { pathLength: 1, opacity: 1 } : {}}
                transition={{ duration: 0.55, ease: EASE_REVEAL, delay: 0.45 + i * 0.22 }}
              />
              {show && !reduce ? (
                <circle r="3" fill="var(--signal)" stroke="none" opacity="0">
                  <set attributeName="opacity" to="1" begin={`${0.9 + i * 0.22}s`} />
                  <animateMotion dur="1.4s" repeatCount="indefinite" begin={`${0.9 + i * 0.22}s`} path={d} calcMode="linear" />
                </circle>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
