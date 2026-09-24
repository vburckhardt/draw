# Draw

A drawing page for small kids. It's one canvas with a crayon, a pencil, a marker, an eraser and 12 colours. There's no menus, no saving and no accounts.

- Works as plain static files and needs no server code or build step. Opening `index.html` directly also works.
- The page is white in light mode and black in dark mode, following the device setting.
- Built for touch on iPhone and iPad, and works with a mouse or trackpad on a Mac. On iPad, Apple Pencil pressure changes line width.
- Pinch-zoom, scrolling, text selection and long-press menus are turned off, so a kid can't get lost.
- **Undo** (↶) takes back the last line. The **bin** clears the page, and undo brings it back.
- Picking a colour while the eraser is on switches back to the last drawing tool.
- After the first visit it works offline (service worker).

## Run it

Host the folder on any static host (GitHub Pages, Netlify, `python3 -m http.server`, …) and open it.

## Best on iPhone / iPad

Open it in Safari, tap **Share → Add to Home Screen**, and start it from the home screen icon. It then runs full screen with no browser bars.
For a kid, also turn on **Guided Access** (Settings → Accessibility → Guided Access). Triple-click the side button to lock the device to the app.

## Files

| File | What |
| --- | --- |
| `index.html` | page and toolbar |
| `style.css` | layout: toolbar at the bottom in portrait, on the left in landscape |
| `app.js` | drawing, tools, undo/clear |
| `sw.js`, `manifest.webmanifest`, `icons/` | offline support and home-screen app |
