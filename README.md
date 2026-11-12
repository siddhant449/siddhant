# Siddhant Kotak — portfolio

One-page portfolio built with Next.js 16 (App Router), Motion and Lenis.

**Idea:** *Polished on the surface. Engineered all the way down.* A WebGL contour field starts loose and liquid in the hero and pulls into straight, engineered lines as you scroll; by the footer it is fully ordered. Type carries the same idea through Archivo's width axis: wide and light for the surface, condensed and heavy for the engineering.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (static)
```

## Where things live

| Path | What it is |
| --- | --- |
| `lib/content.ts` | Every word on the site. Edit copy here only. |
| `components/flow-field.tsx` | The WebGL2 contour shader behind the hero and footer. |
| `components/figures/tower/` | The "From pixel to packet" figure: a pneumatic sorting tower drawn with the Anatomy kit (`components/iso/`, MIT). See `docs/superpowers/specs/2026-11-12-sorting-tower-design.md`. |
| `components/preloader.tsx` | The opening sequence (once per session, skipped for reduced motion). |
| `components/hero.tsx` … `contact.tsx` | One file per section, in page order. |
| `components/ui/` | Text reveals, scramble, roll links, magnetic buttons, fitted display type. |
| `public/work/` | Captures of the live client sites. |
| `public/docs/` | Résumé PDF. |
| `app/opengraph-image.png` | Link-preview image (a capture of the hero). |

## Rules for the copy

- Client work done at an employer is described by what it does, never by its product name.
- No "currently working on" status lines.
- No audio of any kind.

## Performance

- The tower figure is not in the page HTML: its code loads in idle time after the intro and it mounts as its section approaches.
- Motion runs through `LazyMotion` with `m.*` components; its animation features load in a separate chunk after hydration.
- The WebGL shader compiles without blocking the main thread (`KHR_parallel_shader_compile`).
- No layout shift: the fitted name uses container units, and hero text that wraps differently in the web font stays unpainted until the font arrives.

## Motion and accessibility

- `prefers-reduced-motion`: no preloader, no smooth scrolling, a still frame of the field, instant reveals.
- The custom cursor only runs on mouse and trackpad; touch devices get colour reveals when a project is centred.
- The field renders only while the hero or footer is on screen and lowers its resolution if frames run long.
