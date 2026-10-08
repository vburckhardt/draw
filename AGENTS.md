# AGENTS.md

Guidance for AI agents working on this repository.

## Project

Draw is a drawing page for small kids: one canvas, a few tools (crayon, pencil, marker, eraser), big letters and 14 colours. Plain static files — no build step, no server code, no dependencies. Opening `index.html` directly works.

| File | What |
| --- | --- |
| `index.html` | page and toolbar |
| `style.css` | layout: toolbar at the bottom in portrait, on the left in landscape |
| `app.js` | drawing, letters, tools, undo/clear |
| `sw.js`, `manifest.webmanifest`, `icons/` | offline support and home-screen app |

- Keep it a static site: no frameworks, no build step, no new dependencies.
- Works offline via service worker — bump the `sw.js` cache version when `index.html`, `style.css` or `app.js` change.
- Support both touch (iPhone/iPad, Apple Pencil pressure) and mouse/trackpad.
- Light and dark mode follow the device setting; don't hard-code colours.
- Kid-proof: no menus, no accounts, no saving, no way to get lost.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `<type>[optional scope]: <description>`.

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`.

- Imperative mood, lowercase description, no trailing period: `feat: add marker tool`
- Body and footers (breaking changes, issue refs) are optional.
- Keep commits atomic — one logical change per commit.

## Branches

Branch names carry no prefix. Use a short kebab-case slug, e.g. `add-marker-tool`.
