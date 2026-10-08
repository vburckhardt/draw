# AGENTS.md

## Project Overview

Draw is a drawing page for small kids: one canvas, a few tools (crayon, pencil, marker, eraser), big letters and 14 colours. Built for touch on iPhone/iPad (Apple Pencil pressure supported) and mouse/trackpad on Mac. Plain static files — no frameworks, no build step, no dependencies, no server code.

| File | What |
| --- | --- |
| `index.html` | page and toolbar |
| `style.css` | layout: toolbar at the bottom in portrait, on the left in landscape |
| `app.js` | drawing, letters, tools, undo/clear |
| `sw.js`, `manifest.webmanifest`, `icons/` | offline support and home-screen app |

## Setup Commands

- No install, no dependencies. Open `index.html` directly, or serve locally: `python3 -m http.server`
- Published via GitHub Pages from `main` at https://vburckhardt.github.io/draw/ — every push updates it.

## Development Workflow

- Edit `index.html`, `style.css`, or `app.js` directly; there is no build or hot-reload step.
- Test changes in a browser (Safari for iPad/iPhone behaviours like Apple Pencil pressure and touch events).
- Keep it a static site: no frameworks, no build step, no new dependencies.
- Light/dark mode follow the device setting; don't hard-code colours.
- Kid-proof UX: no menus, no accounts, no saving, no way to get lost.

## Testing Instructions

- No automated tests. Manually verify in a browser: drawing, tool switching, undo/clear, letters keyboard, touch and mouse input.
- After changing `index.html`, `style.css` or `app.js`, bump the cache version in `sw.js` so returning users get the update.

## Build and Deployment

- No build. Deployment is GitHub Pages via `.github/workflows/preview.yml`: every push to `main` and every PR (open/synchronize) deploys a preview; closing a PR reverts the live site to `main`.

## Pull Request Guidelines

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>[optional scope]: <description>` — types `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`. Imperative mood, lowercase description, no trailing period.
- Branch names carry no prefix: short kebab-case slug, e.g. `add-marker-tool`.
- Keep commits atomic — one logical change per commit.
