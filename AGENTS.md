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

- **Always run the visual test suite before pushing UI changes** — do not rely on manual review alone, and do not report a change as done without it:

  ```
  npm install playwright-core
  npx playwright-core install chromium-headless-shell
  node test/ui.test.mjs            # or: CHROME_BIN=/path/to/chrome node test/ui.test.mjs
  ```

  It runs headless Chromium at iPhone size (390x844, dark + light, touch) and checks: the openers strip and the separate undo/bin pill docking, each of the three palettes (tools, line width, colours) opening on its own beside its opener, picking from each and the opener showing the active tool/width/colour, busy fade while drawing, undo restoring a blank canvas, and the letters keyboard. It also writes screenshots to `test/` (`shot-{dark,light}-{tools,widths,palette,abc}.png`).

- **Always LOOK at the screenshots** after the run: read them back and verify where the UI actually renders (which edge, what overlaps, what is visible). Layout regressions are only caught by inspecting pixels, not by passing assertions. If `CHROME_BIN` is unset, playwright uses its bundled browser; if it fails to launch with missing shared libraries, install the headless shell's deps or point `CHROME_BIN` at any working Chromium.
- After changing `index.html`, `style.css` or `app.js`, bump the cache version in `sw.js` so returning users get the update.
- The dev HUD (type "dev", open `#dev`, or 4-finger tap) shows the build stamp of what a device is actually running — useful when a phone shows stale UI.

## Build and Deployment

- No build. Deployment is GitHub Pages via `.github/workflows/preview.yml`: every push to `main` and every PR (open/synchronize) deploys a preview; closing a PR reverts the live site to `main`.

## Pull Request Guidelines

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>[optional scope]: <description>` — types `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`. Imperative mood, lowercase description, no trailing period.
- Branch names carry no prefix: short kebab-case slug, e.g. `add-marker-tool`.
- Keep commits atomic — one logical change per commit.
