# Sorting tower: the "From pixel to packet" figure

## Why
The section's earlier visual (floating isometric plates) read as generic. The owner asked for a figure built with the Anatomy skill (https://github.com/wheresryan22/anatomy), whose core rule is that a real, finely built machine should carry the idea, not abstract stacks.

## What was decided (by the owner)
- Object: a pneumatic sorting tower (chosen over a server rack and a parcel line).
- The headline "From pixel to packet." stays.
- Five floors in the page's layer order: Interface, System Design, Fullstack, AI, Cloud & Deployment.

## What it is
An open stand on a heavy base: two back columns, a crossbeam and tube clamp at each level, one glass tube down the middle. A capsule (the one lit part) drops from a lidded intake on the roof to the floor being read.

| Floor | Machine | What moves |
|---|---|---|
| 01 Interface | Terminal with a pixel screen and keyboard (right platform) | Screen pixels and lamp light; intake lid lifts as the capsule enters |
| 02 System Design | Index table with 13 topic positions; magazine of waiting capsules; dead-letter tray (left platform) | Selector swings to a topic |
| 03 Fullstack | Filing cabinet, four locked drawers (right platform) | Drawer 2 slides out |
| 04 AI | Sensor ring around the tube; score display (left platform) | Lenses blink, score counts to 92% |
| 05 Cloud & Deployment | Blower, two pressure gauges, two outbound lines through a bulkhead (on the base) | Fan speeds up, needles rise, flow runs along the lines |

The floor being read lights up (its edges go to the hi tone). Clicking a floor scrolls the list to it. Reduced motion gets still poses.

## How it is built (builder's calls)
- Kit copied from the Anatomy skill (MIT) into `components/iso/`, with two small lint fixes noted in `react/live.tsx`.
- `components/figures/tower/`: `view.ts` (world and projection), `geometry.ts` (static paths), `frame.ts` (paths for moving parts), `art.tsx` (paint order), `live.tsx` (animation, readout, picking), `scene.tsx` and `figure.tsx` (lazy loading), `tower.css` (kit palette retuned to the site).
- Painted in bands between levels, far to near inside a band; the capsule is drawn into each glass run through a clip so it always sits in its physical slot.
- Not server-rendered: the card renders at once with a placeholder of the exact size, the drawing's code is fetched in idle time after the intro, and it mounts when the section comes within 1200px.

## Known limits
- Verified by eye in the browser at desktop, 1280×720 and phone widths; the Anatomy audit scripts (`audit.mjs`, `lines.mjs`) were not run.
