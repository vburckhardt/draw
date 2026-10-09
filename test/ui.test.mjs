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

  // --- collapsed state on load
  const strip = await page.locator('#actions').boundingBox();
  ok(strip && strip.x + strip.width > phone.width * 0.8, `${dark ? 'dark' : 'light'}: strip docked to right edge`);
  ok(strip && strip.y < 80, 'strip at top');
  const panelHidden = await page.locator('#panel').isVisible().then(v => !v);
  ok(panelHidden, 'picker hidden on load');

  // nothing else visible: panel, keys
  ok(!(await page.locator('#keys').isVisible()), 'letter keyboard hidden');

  // --- open the picker
  await page.locator('.handle').tap();
  await page.waitForTimeout(350);
  const panel = await page.locator('#panel').boundingBox();
  ok(!!panel, 'picker opens on handle tap');
  if (panel) {
    ok(panel.y < 100 && panel.y + panel.height < phone.height, 'picker docked top-right, on screen');
    ok(panel.x + panel.width <= strip.x + 4, 'picker does not overlap the strip');
    ok(panel.x > 20, 'picker not at center-left');
    ok(panel.y + panel.height < phone.height * 0.5, 'picker stays in the top half of the screen');
    const gap = strip.x - (panel.x + panel.width);
    ok(gap >= 4 && gap <= 24, 'picker sits beside the strip with a small gap');
  }

  // widths and swatches inside the panel only
  const widthsInPanel = await page.locator('#panel #widths').count();
  ok(widthsInPanel === 1, 'width dots inside the panel');
  const swatchCount = await page.locator('#palette .swatch').count();
  ok(swatchCount === 14, '14 swatches in the palette');

  // --- three separate palettes: tools, widths, colours as distinct groups
  const groups = await page.evaluate(() => {
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, bg: getComputedStyle(el).backgroundColor }; };
    const ids = ['tools-row', 'widths', 'palette'];
    const els = ids.map((id) => document.getElementById(id));
    const boxes = els.map(box);
    const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    return {
      count: document.querySelectorAll('#panel .group').length,
      ids,
      boxes,
      anyOverlap: overlaps(boxes[0], boxes[1]) || overlaps(boxes[1], boxes[2]) || overlaps(boxes[0], boxes[2]),
      ordered: boxes[0].y + boxes[0].h <= boxes[1].y && boxes[1].y + boxes[1].h <= boxes[2].y,
      visibleBg: boxes.every((b) => b.w > 0 && b.h > 0 && b.bg !== 'rgba(0, 0, 0, 0)'),
    };
  });
  ok(groups.count === 3, 'three palette groups in the panel (tools, widths, colours)');
  ok(!groups.anyOverlap, 'palette groups do not overlap each other');
  ok(groups.ordered, 'palette groups stack in order: tools, widths, colours');
  ok(groups.visibleBg, 'each palette group has its own visible background');

  // --- pick a colour: panel closes, badge updates
  await page.locator('#palette .swatch').nth(5).tap();
  await page.waitForTimeout(350);
  ok(!(await page.locator('#panel').isVisible()), 'picker collapses after colour pick');
  const c = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--c').trim());
  ok(c === '#35b6f0', 'badge colour matches the picked swatch');
  const badgeDots = await page.locator('#badge i').count();
  ok(badgeDots === 1, 'exactly one colour dot in the badge');

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
  await page.locator('.handle').tap();
  await page.waitForTimeout(300);
  await page.locator('[data-tool="abc"]').tap();
  await page.waitForTimeout(300);
  ok(await page.locator('#keys').isVisible(), 'letter keyboard appears for ABC tool');
  const keys = await page.locator('#keys').boundingBox();
  ok(keys && keys.y + keys.height <= phone.height + 2, 'keyboard fully on screen at the bottom');

  // screenshot both states for manual review
  await page.screenshot({ path: path.join(root, `shot-${dark ? 'dark' : 'light'}-abc.png`) });
  await page.locator('.handle').tap();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(root, `shot-${dark ? 'dark' : 'light'}-open.png`) });

  ok(errors.length === 0, 'no JS errors (' + (errors[0] || 'none') + ')');
  await ctx.close();
}
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
