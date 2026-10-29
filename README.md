# Draw

A drawing page for small kids. It's one canvas with a crayon, a pencil, a marker, an eraser, big letters and 14 colours. There's no menus, no saving and no accounts.

- Works as plain static files and needs no server code or build step. Opening `index.html` directly also works.
- The page is white in light mode and black in dark mode, following the device setting.
- Built for touch on iPhone and iPad, and works with a mouse or trackpad on a Mac. On iPad, Apple Pencil pressure changes line width.
- Pinch-zoom, scrolling, text selection and long-press menus are turned off, so a kid can't get lost.
- **Undo** (↶) takes back the last line. The **bin** clears the page, and undo brings it back.
- **Letters (ABC block)** opens a big keyboard with A–Z in alphabetical order and 0–9, so kids can type their name. Tap the page to choose where the letters go. The ⌫ key takes back the last letter, and the **abc/ABC** key switches between small and capital letters. Words move to the next line at the edge of the screen. On a Mac, typing on the real keyboard works too.
- **Shapes** (☆) puts a big outline on the page to colour in: France, Ireland, the Titanic, the Eiffel Tower, a sailboat, a rocket, a plane, a car, a house, a star, a heart and a fish. Picking one floats it on the page first — drag it to move it, or tap to drop it where you tap, and release to place it. It's drawn in the current colour, the size button sets how thick its line is, and undo takes it back.
- The **size** button sets the line width, the eraser size, or the letter size with ABC.
- Picking a colour while the eraser is on switches back to the last drawing tool.
- After the first visit it works offline (service worker).

## Run it

It's published with GitHub Pages at **https://vburckhardt.github.io/draw/**, served straight from `main`, and every push updates it.

Any other static host works too (Netlify, `python3 -m http.server`, …).

## Best on iPhone / iPad

Open it in Safari, tap **Share → Add to Home Screen**, and start it from the home screen icon. It then runs full screen with no browser bars.
For a kid, also turn on **Guided Access** (Settings → Accessibility → Guided Access). Triple-click the side button to lock the device to the app.

## Files

| File | What |
| --- | --- |
| `index.html` | page and toolbar |
| `style.css` | layout: tool, size, colour and shape openers plus undo/bin on the right edge; letter keyboard at the bottom |
| `app.js` | drawing, letters, shapes, tools, undo/clear |
| `sw.js`, `manifest.webmanifest`, `icons/` | offline support and home-screen app |
