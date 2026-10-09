import { chromium } from 'playwright-core';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(root, '..', 'index.html');
const phone = { width: 390, height: 844 };   // iPhone 14
let failures = 0;
const ok = (cond, msg) => {
  console.log((cond ? 'PASS ' : 'FAIL ') + msg);
  if (!cond) failures++;
};

// CHROME_BIN: path to a headless Chromium; set it if playwright's bundled browser
// can't run (missing system libs). See AGENTS.md "Testing Instructions".
const browser = await chromium.launch(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {});
for (const dark of [true, false]) {
  const ctx = await browser.newContext({ viewport: phone, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light', hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  await page.waitForTimeout(300);

  const mode = dark ? 'dark' : 'light';
  const box = (sel) => page.locator(sel).boundingBox();
  const shown = async (sel) => page.locator(sel).isVisible();
  const openNow = () => page.evaluate(() => [...document.querySelectorAll('.pop.open')].map((p) => p.id));
  const tap = async (sel, wait = 300) => {
    await page.locator(sel).tap();
    await page.waitForTimeout(wait);
  };
  // open a palette and pick the item matching `item`
  const pick = async (id, item) => {
    await tap(`[data-open="${id}"]`);
    await tap(`#${id} ${item}`);
  };
  const blankPage = () => page.evaluate(() => {
    const p = document.getElementById('paper');
    return p.getContext('2d').getImageData(0, 0, p.width, p.height).data.every((v, i) => i % 4 !== 3 || v === 0);
  });
  const drawLine = async () => {
    await page.mouse.move(100, 400);
    await page.mouse.down();
    await page.mouse.move(200, 500, { steps: 5 });
  };

  // --- collapsed state on load: openers strip and a separate actions pill
  const strip = await box('#pickers');
  ok(strip && strip.x + strip.width > phone.width * 0.8, `${mode}: openers strip docked to right edge`);
  ok(strip && strip.y < 80, 'openers strip at top');
  const acts = await box('#actions');
  ok(acts && acts.x + acts.width > phone.width * 0.8, 'actions pill docked to right edge');
  ok(acts && acts.y >= strip.y + strip.height + 4 && acts.y <= strip.y + strip.height + 24,
    'actions pill sits just below the openers, separate from them');
  ok((await openNow()).length === 0, 'no palette open on load');
  ok(!(await shown('#keys')), 'letter keyboard hidden');

  // --- three palettes, each from its own opener, one at a time
  const palettes = [['tools', 5, '.tool'], ['widths', 5, '.btn'], ['palette', 14, '.swatch']];
  for (const [id, n, item] of palettes) {
    await tap(`[data-open="${id}"]`, 350);
    ok(JSON.stringify(await openNow()) === JSON.stringify([id]), `${id}: only its palette opens`);
    ok(await page.locator(`#${id} ${item}`).count() === n, `${id}: ${n} items`);
    const pop = await box(`#${id}`);
    const opener = await box(`[data-open="${id}"]`);
    ok(pop.x >= 8 && pop.y >= 0 && pop.y + pop.height <= phone.height, `${id}: fully on screen`);
    const gap = strip.x - (pop.x + pop.width);
    ok(gap >= 4 && gap <= 24, `${id}: beside the strip with a small gap`);
    const mid = opener.y + opener.height / 2;
    ok(pop.y <= mid && pop.y + pop.height >= mid, `${id}: level with its opener`);
    await page.screenshot({ path: path.join(root, `shot-${mode}-${id}.png`) });
  }
  // tapping the open palette's opener again closes it
  await tap('[data-open="palette"]', 200);
  ok((await openNow()).length === 0, 'tapping the opener again closes its palette');

  // --- pick a colour: palette closes, colour opener updates
  await pick('palette', '.swatch:nth-child(6)');
  ok((await openNow()).length === 0, 'palette closes after colour pick');
  const c = await page.locator('#badge i').evaluate((e) => getComputedStyle(e).backgroundColor);
  ok(c === 'rgb(53, 182, 240)', 'colour opener matches the picked swatch');
  ok(await page.locator('#badge i').count() === 1, 'exactly one colour dot in the colour opener');

  // --- pick a width: it takes effect and the opener dot grows
  const dotBefore = (await page.locator('#width-now i').evaluate((e) => e.offsetHeight));
  await pick('widths', '.btn:nth-child(5)');
  ok((await openNow()).length === 0, 'widths close after picking one');
  ok(await page.locator('#widths .btn.on').count() === 1 && await page.locator('#widths .btn').nth(4).evaluate((b) => b.classList.contains('on')),
    'picked width is marked');
  ok((await page.locator('#width-now i').evaluate((e) => e.offsetHeight)) > dotBefore, 'width opener stroke thickens with the line');

  // --- tool opener shows the active tool
  ok(await page.locator('#tool-now').getAttribute('data-tool') === 'crayon', 'tool opener shows crayon at start');
  await pick('tools', '[data-tool="marker"]');
  ok((await openNow()).length === 0, 'tools close after picking one');
  ok(await page.locator('#tool-now').getAttribute('data-tool') === 'marker', 'tool opener shows the marker after picking it');
  ok(await page.locator('#tool-now svg').count() === 1, 'tool opener has the tool icon');

  // --- draw a stroke: the toolbar stays fully visible (no fade while drawing)
  await drawLine();
  await page.waitForTimeout(400);
  const opacity = await page.evaluate(() => ['pickers', 'actions'].map((id) => getComputedStyle(document.getElementById(id)).opacity));
  await page.mouse.up();
  ok(opacity.every((o) => o === '1'), 'toolbar stays fully visible while drawing');

  ok(!(await blankPage()), 'the stroke is on the page');

  // --- undo removes the stroke
  await tap('[data-action="undo"]', 200);
  ok(await blankPage(), 'undo restores a blank page');

  // --- the bin clears the page, and undo brings the drawing back
  await drawLine();
  await page.mouse.up();
  await tap('[data-action="clear"]', 200);
  ok(await blankPage(), 'the bin clears the page');
  await tap('[data-action="undo"]', 200);
  ok(!(await blankPage()), 'undo after the bin brings the drawing back');
  await tap('[data-action="undo"]', 200);

  // --- letters keyboard opens with the ABC tool
  await pick('tools', '[data-tool="abc"]');
  ok(await shown('#keys'), 'letter keyboard appears for ABC tool');
  ok(await page.locator('#tool-now').getAttribute('data-tool') === 'abc', 'tool opener shows ABC');
  const keys = await box('#keys');
  ok(keys && keys.y + keys.height <= phone.height + 2, 'keyboard fully on screen at the bottom');

  // --- the size button works with letters too: it previews an "A" and sets letter size
  const glyph = await page.evaluate(() => getComputedStyle(document.querySelector('#width-now i'), '::before').content);
  ok(glyph === '"A"', 'size opener previews a letter while ABC is on');
  ok(await page.locator('#width-now').getAttribute('aria-label') === 'Letter size', 'size opener is labelled letter size');
  await page.mouse.click(60, 300);   // place the cursor
  await page.waitForTimeout(100);
  const caretBefore = (await box('#caret')).height;
  await tap('[data-open="widths"]');
  await page.screenshot({ path: path.join(root, `shot-${mode}-letter-sizes.png`) });
  await tap('#widths .btn:first-child', 200);
  ok((await box('#caret')).height < caretBefore, 'smallest size makes the letters smaller');
  await page.screenshot({ path: path.join(root, `shot-${mode}-abc.png`) });

  ok(errors.length === 0, 'no JS errors (' + (errors[0] || 'none') + ')');
  await ctx.close();
}
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
