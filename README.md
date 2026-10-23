# Vincent Layzie C. Del Rosario

An interactive resume and portfolio featuring cinematic 3D scenes, scroll transitions, selectable technology emblems, and draggable company identities that follow the experience timeline.

Built with React, TypeScript, Vite, Three.js, React Three Fiber, GSAP, and Lenis.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/.

## Build and preview

```sh
npm run build
npm run preview
```

The production files are generated in `dist/`. Preview runs at http://127.0.0.1:4173/.

## Checks

```sh
npm run typecheck
npm run lint
npm test
```

## Project structure

- `src/resume/` — portfolio sections and navigation.
- `src/three/` — models, materials, camera movement, raised skill logos, and particle transitions.
- `src/data/profile.ts` — resume content and contact details.
- `src/data/technologies.ts` — technology icons and colors.
- `src/styles.css` — responsive layouts, typography, and theme.
- `src/tests/` — unit and interaction tests.
- `public/models/` — optimized 3D models.
- `public/icons/` — local technology icons and their license notices.
- `public/organizations/` — company artwork for the experience timeline and its fallbacks.
- `public/posters/` — model fallback images.
- `scripts/` — model optimization and icon preparation utilities.

The website includes reduced-motion support, animation controls, keyboard model exploration, and static fallbacks. Fonts and assets are served locally.

To enable resume downloads, add the PDF files to `public/documents/` and set their URLs in `src/data/profile.ts`.
