import { chromium } from 'playwright-core';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.dirname(fileURLToPath(import.meta.url));
const page_ = 'file://' + path.join(root, '..', 'index.html');
const phone = { width: 390, height: 844 };   // iPhone 14
let failures = 0;
const ok = (cond, msg) => {
  console.log((cond ? 'PASS ' : 'FAIL ') + msg);
  if (!cond) failures++;
};

// CHROME_BIN: path to a headless Chromium; set it if playwright's bundled browser
// can't run (missing system libs). See AGENTS.md "Visual testing".
const browser = await chromium.launch(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {});
for (const dark of [true, false]) {
  const ctx = await browser.newContext({ viewport: phone, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light', hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(page_);
  await page.waitForTimeout(300);

  const mode = dark ? 'dark' : 'light';
  const box = (sel) => page.locator(sel).boundingBox();
  const shown = async (sel) => page.locator(sel).isVisible();
  const openNow = () => page.evaluate(() => [...document.querySelectorAll('.pop.open')].map((p) => p.id));

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
    await page.locator(`[data-open="${id}"]`).tap();
    await page.waitForTimeout(350);
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
  await page.locator('[data-open="palette"]').tap();
  await page.waitForTimeout(200);
  ok((await openNow()).length === 0, 'tapping the opener again closes its palette');

  // --- pick a colour: palette closes, colour opener updates
  await page.locator('[data-open="palette"]').tap();
  await page.waitForTimeout(300);
  await page.locator('#palette .swatch').nth(5).tap();
  await page.waitForTimeout(350);
  ok((await openNow()).length === 0, 'palette closes after colour pick');
  const c = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--c').trim());
  ok(c === '#35b6f0', 'colour opener matches the picked swatch');
  ok(await page.locator('#badge i').count() === 1, 'exactly one colour dot in the colour opener');

  // --- pick a width: it takes effect and the opener dot grows
  const dotBefore = (await page.locator('#width-now i').evaluate((e) => e.offsetHeight));
  await page.locator('[data-open="widths"]').tap();
  await page.waitForTimeout(300);
  await page.locator('#widths .btn').nth(4).tap();
  await page.waitForTimeout(300);
  ok((await openNow()).length === 0, 'widths close after picking one');
  ok(await page.locator('#widths .btn.on').count() === 1 && await page.locator('#widths .btn').nth(4).evaluate((b) => b.classList.contains('on')),
    'picked width is marked');
  ok((await page.locator('#width-now i').evaluate((e) => e.offsetHeight)) > dotBefore, 'width opener stroke thickens with the line');

  // --- tool opener shows the active tool
  ok(await page.locator('#tool-now').getAttribute('data-tool') === 'crayon', 'tool opener shows crayon at start');
  await page.locator('[data-open="tools"]').tap();
  await page.waitForTimeout(300);
  await page.locator('[data-tool="marker"]').tap();
  await page.waitForTimeout(300);
  ok((await openNow()).length === 0, 'tools close after picking one');
  ok(await page.locator('#tool-now').getAttribute('data-tool') === 'marker', 'tool opener shows the marker after picking it');
  ok(await page.locator('#tool-now svg').count() === 1, 'tool opener has the tool icon');

  // --- draw a stroke: busy fade applies
  await page.mouse.move(100, 400);
  await page.mouse.down();
  await page.mouse.move(200, 500, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const busy = await page.evaluate(() => document.body.classList.contains('busy'));
  ok(busy, 'busy class set while drawing');
  await page.waitForTimeout(1200);
  const notBusy = await page.evaluate(() => !document.body.classList.contains('busy'));
  ok(notBusy, 'busy clears after lifting');

  // --- undo removes the stroke
  await page.locator('[data-action="undo"]').tap();
  await page.waitForTimeout(200);
  const blank = await page.evaluate(async () => {
    const p = document.getElementById('paper');
    const d = p.getContext('2d').getImageData(0, 0, p.width, p.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return false;
    return true;
  });
  ok(blank, 'undo restores a blank page');

  // --- letters keyboard opens with the ABC tool
  await page.locator('[data-open="tools"]').tap();
  await page.waitForTimeout(300);
  await page.locator('[data-tool="abc"]').tap();
  await page.waitForTimeout(300);
  ok(await shown('#keys'), 'letter keyboard appears for ABC tool');
  ok(await page.locator('#tool-now').getAttribute('data-tool') === 'abc', 'tool opener shows ABC');
  const keys = await box('#keys');
  ok(keys && keys.y + keys.height <= phone.height + 2, 'keyboard fully on screen at the bottom');
  await page.screenshot({ path: path.join(root, `shot-${mode}-abc.png`) });

  ok(errors.length === 0, 'no JS errors (' + (errors[0] || 'none') + ')');
  await ctx.close();
}
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
