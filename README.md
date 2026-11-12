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

## Motion and accessibility

- `prefers-reduced-motion`: no preloader, no smooth scrolling, a still frame of the field, instant reveals.
- The custom cursor only runs on mouse and trackpad; touch devices get colour reveals when a project is centred.
- The field renders only while the hero or footer is on screen and lowers its resolution if frames run long.
