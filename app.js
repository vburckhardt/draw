(() => {
  'use strict';

  const COLORS = [
    ['red', '#e8322f'],
    ['orange', '#ff8a1f'],
    ['yellow', '#ffd21f'],
    ['light green', '#8bd13b'],
    ['green', '#1e9e48'],
    ['sky blue', '#35b6f0'],
    ['blue', '#2456d6'],
    ['purple', '#8a3fd1'],
    ['pink', '#ff6fb5'],
    ['peach', '#f6c29b'],
    ['brown', '#8b5a2b'],
    ['gray', '#9a9a9a'],
    ['black', '#1b1b1b'],
    ['white', '#ffffff'],
  ];
  // Black on the dark-mode paper (or white on light) looks like "it stopped drawing",
  // so that swatch becomes teal instead.
  const SAME_AS_PAPER = { dark: '#1b1b1b', light: '#ffffff' };
  const TEAL = ['teal', '#14a39a'];
  const darkMode = matchMedia('(prefers-color-scheme: dark)');

  // Line widths in CSS pixels.
  const SIZE = { crayon: 18, pencil: 4, marker: 13, eraser: 40 };
  // Size steps, small to big: line width for drawing tools, eraser size, letter size.
  const WIDTHS = [.55, .8, 1, 1.6, 2.4];

  // Outlines to stamp on the page and colour in, drawn in a 100x100 box.
  // The maps are traced from real coastlines.
  const SHAPES = [
    ['France', 'M50 5 L51 5 L55 8 L62 12 L65 14 L66 17 L72 19 L76 20 L80 23 L87 25 L85 29 L83 37 L80 38 L79 40 L74 47 L73 51 L78 52 L80 57 L77 61 L80 63 L79 67 L83 72 L81 74 L79 77 L76 79 L73 79 L69 78 L65 77 L63 76 L60 76 L56 78 L54 81 L55 85 L51 86 L45 85 L39 82 L33 82 L26 78 L23 77 L25 74 L27 66 L27 57 L27 51 L23 48 L21 43 L18 40 L16 38 L12 36 L7 35 L4 33 L6 30 L4 28 L7 28 L11 27 L17 28 L22 28 L24 28 L24 22 L22 18 L27 18 L27 21 L33 21 L36 20 L37 17 L44 14 L45 11 L45 7 L47 6 Z M95 80 L96 84 L95 90 L94 95 L91 93 L90 91 L90 86 L94 83 Z'],
    ['Ireland', 'M58 4 L65 8 L74 8 L81 18 L79 22 L85 25 L81 30 L76 36 L74 43 L76 52 L77 61 L72 78 L63 80 L55 84 L45 88 L35 94 L24 96 L27 90 L20 88 L27 87 L17 83 L24 80 L15 80 L23 76 L26 70 L35 68 L30 64 L31 56 L35 54 L27 54 L19 50 L23 43 L19 37 L23 30 L33 29 L41 30 L42 25 L38 21 L42 16 L45 9 L53 8 Z'],
    ['Titanic', 'M4 54 L96 54 L88 76 L14 76 Q8 70 4 54 Z M16 54 V46 H82 V54 M26 46 L22 22 H30 L33 46 M40 46 L36 22 H44 L47 46 M54 46 L50 22 H58 L61 46 M68 46 L64 22 H72 L75 46 M10 54 L12 18 M90 54 L88 14 M12 18 L88 14 M22 64 h0.1 M32 64 h0.1 M42 64 h0.1 M52 64 h0.1 M62 64 h0.1 M72 64 h0.1 M82 64 h0.1'],
    ['Eiffel Tower', 'M50 2 V10 M46 10 H54 L56 36 L64 62 L82 96 H64 Q50 74 36 96 H18 L36 62 L44 36 Z M42 36 H58 M33 62 H67'],
    ['Sailboat', 'M48 8 V70 M48 12 L80 62 H48 M44 18 L18 62 H44 M10 72 H90 L80 86 H20 Z'],
    ['Rocket', 'M50 4 Q68 20 66 58 H34 Q32 20 50 4 Z M34 44 L20 64 L34 64 M66 44 L80 64 L66 64 M40 64 L44 76 H56 L60 64 M44 80 L50 96 L56 80 M50 34 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0'],
    ['Plane', 'M8 50 Q8 42 18 42 H80 Q94 44 96 50 Q94 56 80 58 H18 Q8 58 8 50 Z M40 42 L56 14 H64 L58 42 M40 58 L56 86 H64 L58 58 M14 42 L8 26 H16 L24 42 M78 46 H88'],
    ['Car', 'M6 70 V56 Q6 50 14 48 L28 46 L38 30 H66 L78 46 L88 48 Q94 50 94 58 V70 H80 M60 70 H40 M20 70 H6 M38 46 H78 M52 30 V46 M30 70 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 M70 70 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0'],
    ['House', 'M10 46 L50 10 L90 46 M20 38 V92 H80 V38 M42 92 V66 H58 V92 M28 50 H40 V62 H28 Z M60 50 H72 V62 H60 Z M66 24 V12 H76 V33'],
    ['Star', 'M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z'],
    ['Heart', 'M50 88 C20 66 6 50 6 32 C6 18 16 10 28 10 C38 10 46 16 50 26 C54 16 62 10 72 10 C84 10 94 18 94 32 C94 50 80 66 50 88 Z'],
    ['Fish', 'M14 50 Q40 20 70 40 L92 24 L86 50 L92 76 L70 60 Q40 80 14 50 Z M30 46 h0.1 M56 36 Q62 50 56 64'],
  ];

  const FONT = getComputedStyle(document.documentElement).getPropertyValue('--kid-font').trim();
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Strokes kept as vectors so they can be undone; older ones are baked into `base`.
  const MAX_UNDO = 40;

  const board = document.getElementById('board');
  const paper = document.getElementById('paper');
  const ghost = document.getElementById('ghost');
  const gtx = ghost.getContext('2d');
  const keys = document.getElementById('keys');
  const caret = document.getElementById('caret');
  const ctx = paper.getContext('2d');
  const base = document.createElement('canvas');
  const bctx = base.getContext('2d');
  // Capped at 2: sharp enough for crayons, and keeps memory low on phones.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0, H = 0;
  let tool = 'crayon';
  let lastDrawTool = 'crayon';
  let color = COLORS[0][1];
  let widthMul = 1;
  let ops = [];              // strokes, letters and clears since `base`
  let cur = null;            // where the next letter goes: { x, y, size, lineX }
  let upper = true;          // capital letters on the keyboard
  const live = new Map();    // pointerId -> { stroke, state }

  // ---------- canvas sizing ----------

  // The canvas only ever grows, so rotating the device never loses any drawing.
  function fit() {
    const w = Math.max(W, Math.ceil(board.clientWidth));
    const h = Math.max(H, Math.ceil(board.clientHeight));
    if (w === W && h === H) return;
    grow(paper, w, h);
    grow(base, w, h);
    grow(ghost, w, h);
    paper.style.width = w + 'px';
    paper.style.height = h + 'px';
    ghost.style.width = w + 'px';
    ghost.style.height = h + 'px';
    W = w; H = h;
    if (float) drawGhost();
  }

  function grow(c, w, h) {
    let old = null;
    if (c.width && c.height) {
      old = document.createElement('canvas');
      old.width = c.width;
      old.height = c.height;
      old.getContext('2d').drawImage(c, 0, 0);
    }
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const x = c.getContext('2d');
    if (old) {
      x.drawImage(old, 0, 0);
      old.width = old.height = 0;   // iOS caps total canvas memory: free it now, not at GC
    }
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------- textures ----------

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Grain alpha maps, fixed to the page like paper texture.
  const GRAIN = 128;
  const grains = {
    crayon: makeGrain(7, (r, lo) => {
      const v = r();
      const a = v < 0.2 ? 0 : v < 0.4 ? 0.25 + r() * 0.35 : 0.8 + r() * 0.2;
      return a * (0.72 + 0.28 * lo);
    }),
    pencil: makeGrain(11, (r, lo) => {
      const v = r();
      const a = v < 0.12 ? 0.2 : 0.6 + r() * 0.4;
      return a * (0.85 + 0.15 * lo);
    }),
  };

  function makeGrain(seed, pick) {
    const r = rng(seed);
    // low-frequency blotches so the wax looks uneven
    const L = 9;
    const low = [];
    for (let i = 0; i < L * L; i++) low.push(r());
    const lowAt = (x, y) => {
      const fx = x / GRAIN * (L - 1), fy = y / GRAIN * (L - 1);
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0;
      const g = (i, j) => low[Math.min(j, L - 1) * L + Math.min(i, L - 1)];
      return (g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx) * (1 - ty) +
             (g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx) * ty;
    };
    const a = new Float32Array(GRAIN * GRAIN);
    for (let y = 0; y < GRAIN; y++) {
      for (let x = 0; x < GRAIN; x++) a[y * GRAIN + x] = pick(r, lowAt(x, y));
    }
    return a;
  }

  const patterns = new Map();
  function pattern(c, kind, hex) {
    const key = kind + hex + (c === ctx ? 'p' : 'b');
    let p = patterns.get(key);
    if (p) return p;
    const cv = document.createElement('canvas');
    cv.width = cv.height = GRAIN;
    const g = cv.getContext('2d');
    const img = g.createImageData(GRAIN, GRAIN);
    const n = parseInt(hex.slice(1), 16);
    const R = n >> 16, G = (n >> 8) & 255, B = n & 255;
    const grain = grains[kind];
    for (let i = 0; i < grain.length; i++) {
      img.data[i * 4] = R;
      img.data[i * 4 + 1] = G;
      img.data[i * 4 + 2] = B;
      img.data[i * 4 + 3] = Math.round(grain[i] * 255);
    }
    g.putImageData(img, 0, 0);
    p = c.createPattern(cv, 'repeat');
    patterns.set(key, p);
    return p;
  }

  // ---------- stroke rendering ----------
  // A stroke is drawn point by point (live) or all at once (redraw after undo);
  // both go through drawPoint so the result is identical.

  function newState(stroke) {
    return { i: 0, r: rng(stroke.seed) };
  }

  function width(stroke, p) {
    // each stroke keeps the size it was drawn with, so undo redraws it the same
    const w = SIZE[stroke.tool] * stroke.mul;
    if (!stroke.pen || stroke.tool === 'eraser') return w;
    return w * (0.35 + 1.3 * p);   // Apple Pencil / stylus pressure
  }

  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, p: (a.p + b.p) / 2 });

  function style(c, stroke, w, r) {
    c.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = w;
    if (stroke.tool === 'crayon') {
      c.lineWidth = w * (0.88 + r() * 0.24);
      c.strokeStyle = c.fillStyle = pattern(c, 'crayon', stroke.color);
    } else if (stroke.tool === 'pencil') {
      c.strokeStyle = c.fillStyle = pattern(c, 'pencil', stroke.color);
    } else {
      c.strokeStyle = c.fillStyle = stroke.tool === 'eraser' ? '#000' : stroke.color;
    }
  }

  // Draws the piece of the stroke that point i completes.
  function drawPoint(c, stroke, st) {
    const pts = stroke.pts, i = st.i++;
    const p = pts[i];
    c.beginPath();
    if (i === 0) {
      const w = width(stroke, p.p);
      style(c, stroke, w, st.r);
      c.arc(p.x, p.y, c.lineWidth / 2, 0, Math.PI * 2);
      c.fill();
      return;
    }
    const a = i === 1 ? pts[0] : mid(pts[i - 2], pts[i - 1]);
    const ctl = pts[i - 1];
    const b = mid(ctl, p);
    const w = width(stroke, ctl.p);
    style(c, stroke, w, st.r);
    c.moveTo(a.x, a.y);
    c.quadraticCurveTo(ctl.x, ctl.y, b.x, b.y);
    c.stroke();
    if (stroke.tool === 'crayon') specks(c, a, b, w, st.r);
  }

  function drawTail(c, stroke) {
    const pts = stroke.pts, n = pts.length;
    if (n < 2) return;
    const a = mid(pts[n - 2], pts[n - 1]), b = pts[n - 1];
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
  }

  // A few waxy crumbs along the edges of a crayon line.
  function specks(c, a, b, w, r) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return;
    const nx = -dy / len, ny = dx / len;
    const count = Math.ceil(len / 4);
    for (let k = 0; k < count; k++) {
      const t = r();
      const side = r() < 0.5 ? -1 : 1;
      const off = side * w * (0.42 + r() * 0.2);
      const rad = 0.5 + r() * 1.1;
      c.beginPath();
      c.arc(a.x + dx * t + nx * off, a.y + dy * t + ny * off, rad, 0, Math.PI * 2);
      c.fill();
    }
  }

  function wipe(c) {
    c.save();
    try {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    } finally {
      c.restore();
    }
  }

  // The canvas scale can be lost if iOS resets the canvas (e.g. in the background);
  // drawing would then land in the wrong place, so set it again before each stroke.
  function resetTransform() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function renderOp(c, op) {
    if (op.type === 'clear') return wipe(c);
    if (op.type === 'text') return drawLetter(c, op);
    if (op.type === 'shape') return drawShape(c, op);
    const st = newState(op);
    while (st.i < op.pts.length) drawPoint(c, op, st);
    if (op.done) drawTail(c, op);
  }

  function redraw() {
    resetTransform();
    wipe(ctx);
    if (base.width && base.height) {
      ctx.save();
      try {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(base, 0, 0);
      } finally {
        ctx.restore();
      }
    }
    for (const op of ops) renderOp(ctx, op);
  }

  // Bake the oldest finished strokes into the base layer.
  let baseBlank = true;
  function trim() {
    while (ops.length > MAX_UNDO && (ops[0].type !== 'stroke' || ops[0].done)) {
      const op = ops.shift();
      renderOp(bctx, op);
      baseBlank = op.type === 'clear';
    }
  }

  // ---------- pointer input ----------

  function point(e) {
    const r = paper.getBoundingClientRect();
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      p: e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.5,
    };
  }

  paper.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    closePops();
    cancelShape();
    if (tool === 'abc') {
      // Tap the page to choose where the letters go.
      const p = point(e);
      cur = newCursor(p.x, p.y - letterSize() / 2);
      showCaret();
      return;
    }
    // First finger down while strokes are still "in progress": their lift was never
    // reported (iOS can drop it), so finish them instead of leaving them stuck.
    if (e.isPrimary && live.size) stopLive();
    resetTransform();
    try { paper.setPointerCapture(e.pointerId); } catch (_) {}
    const stroke = {
      type: 'stroke',
      tool,
      color,
      mul: widthMul,
      pen: e.pointerType === 'pen',
      seed: (Math.random() * 2 ** 32) >>> 0,
      pts: [point(e)],
      done: false,
    };
    const state = newState(stroke);
    ops.push(stroke);
    devStrokes++;
    live.set(e.pointerId, { stroke, state });
    drawPoint(ctx, stroke, state);
  });

  paper.addEventListener('pointermove', (e) => {
    const l = live.get(e.pointerId);
    if (!l) return;
    e.preventDefault();
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of events.length ? events : [e]) {
      const p = point(ev);
      const last = l.stroke.pts[l.stroke.pts.length - 1];
      if (Math.abs(p.x - last.x) + Math.abs(p.y - last.y) < 1) continue;
      l.stroke.pts.push(p);
      drawPoint(ctx, l.stroke, l.state);
    }
  });

  function end(e) {
    const l = live.get(e.pointerId);
    if (!l) return;
    live.delete(e.pointerId);
    l.stroke.done = true;
    drawTail(ctx, l.stroke);
    trim();
  }
  paper.addEventListener('pointerup', end);
  paper.addEventListener('pointercancel', end);
  paper.addEventListener('lostpointercapture', end);

  // ---------- letters ----------

  function letterSize() {
    const s = Math.min(board.clientWidth, board.clientHeight) / 7.5;
    return Math.round(Math.max(36, Math.min(110, s)) * widthMul);
  }

  function newCursor(x, y) {
    return { x, y, size: letterSize(), lineX: x };
  }

  function ensureCursor() {
    if (!cur) cur = newCursor(24, 20);
  }

  function showCaret() {
    caret.hidden = tool !== 'abc';
    if (caret.hidden) return;
    ensureCursor();
    caret.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
    caret.style.height = cur.size + 'px';
  }

  function drawLetter(c, op) {
    c.globalCompositeOperation = 'source-over';
    c.font = `bold ${op.size}px ${FONT}`;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillStyle = op.color;
    c.fillText(op.ch, op.x, op.y + op.size / 2);
  }

  function newLine() {
    cur.x = cur.lineX;
    cur.y += cur.size * 1.15;
  }

  function typeLetter(ch) {
    stopLive();
    cancelShape();
    ensureCursor();
    ctx.font = `bold ${cur.size}px ${FONT}`;
    const w = ctx.measureText(ch).width;
    if (cur.x + w > board.clientWidth - 8 && cur.x > cur.lineX) wrap();
    const next = cur.x + w + cur.size * 0.06;
    const op = { type: 'text', ch, color, x: cur.x, y: cur.y, size: cur.size, lineX: cur.lineX, next };
    ops.push(op);
    drawLetter(ctx, op);
    cur.x = next;
    trim();
    showCaret();
  }

  // At the edge of the screen, carry the word being typed down to the next line.
  function wrap() {
    const word = [];
    let x = cur.x;
    for (let i = ops.length - 1; i >= 0; i--) {
      const op = ops[i];
      if (op.type !== 'text' || op.y !== cur.y || op.next !== x) break;
      word.unshift(op);
      x = op.x;
    }
    if (!word.length || word[0].x <= cur.lineX) return newLine();
    const dx = word[0].x - cur.lineX, dy = cur.size * 1.15;
    for (const op of word) {
      op.x -= dx;
      op.next -= dx;
      op.y += dy;
    }
    cur.x -= dx;
    cur.y += dy;
    redraw();
  }

  function typeSpace() {
    ensureCursor();
    cur.x += cur.size * 0.45;
    showCaret();
  }

  function typeEnter() {
    ensureCursor();
    newLine();
    showCaret();
  }

  // Delete only takes back letters, never drawings.
  function typeDelete() {
    const last = ops[ops.length - 1];
    return !!last && last.type === 'text' && undo();
  }

  const ICONS = {
    space: '<svg viewBox="0 0 64 64"><path d="M10 30 V44 H54 V30" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    delete: '<svg viewBox="0 0 64 64"><path d="M22 14 H52 Q56 14 56 18 V46 Q56 50 52 50 H22 L6 32 Z" fill="currentColor"/><path d="M29 24 L45 40 M45 24 L29 40" stroke="var(--panel)" stroke-width="6" stroke-linecap="round"/></svg>',
    enter: '<svg viewBox="0 0 64 64"><path d="M50 12 V36 Q50 42 44 42 H14" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M24 30 L12 42 L24 54" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const letterKeys = [];
  for (const k of [...LETTERS, ...'1234567890', 'space', 'delete', 'enter', 'case']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'key';
    b.dataset.key = k;
    if (k.length === 1) {
      b.textContent = k;
      if (/\d/.test(k)) b.classList.add('digit');
      else letterKeys.push(b);
    } else if (k === 'case') {
      b.classList.add('special', 'case');
      b.setAttribute('aria-label', 'Capital or small letters');
    } else {
      b.classList.add('special');
      b.innerHTML = ICONS[k];
      b.setAttribute('aria-label', k);
    }
    keys.appendChild(b);
  }
  const caseKey = keys.querySelector('[data-key="case"]');

  function setCase(up) {
    upper = up;
    for (const b of letterKeys) b.textContent = up ? b.dataset.key : b.dataset.key.toLowerCase();
    caseKey.textContent = up ? 'abc' : 'ABC';
  }

  function press(k) {
    if (k === 'space') typeSpace();
    else if (k === 'delete') typeDelete();
    else if (k === 'enter') typeEnter();
    else if (k === 'case') setCase(!upper);
    else typeLetter(/\d/.test(k) ? k : upper ? k : k.toLowerCase());
  }

  keys.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const b = e.target.closest('.key');
    if (!b) return;
    press(b.dataset.key);
    b.classList.remove('tap');
    void b.offsetWidth;
    b.classList.add('tap');
  });

  // ---------- shapes ----------

  const shapePaths = new Map(SHAPES.map(([name, d]) => [name, new Path2D(d)]));

  function drawShape(c, op) {
    c.save();
    try {
      c.globalCompositeOperation = 'source-over';
      c.translate(op.x, op.y);
      c.scale(op.s / 100, op.s / 100);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.lineWidth = op.w * 100 / op.s;
      c.strokeStyle = op.color;
      c.stroke(shapePaths.get(op.name));
    } finally {
      c.restore();
    }
  }

  // The shape picked from the palette, floating on the ghost layer until it is
  // dropped. Drag it to move it; tap to drop it where you tap; release to place.
  let float = null;   // { type:'shape', name, color, s, x, y, w, drag }

  // A big outline in the middle of the free part of the page, ready to be moved
  // and coloured in. The size button sets how thick its line is.
  function stampShape(name) {
    stopLive();
    resetTransform();
    const r = board.getBoundingClientRect();
    const right = Math.min(r.width, pickers.getBoundingClientRect().left - r.left) - 12;
    const s = Math.round(Math.min(right - 12, r.height - 24) * 0.85);
    float = {
      type: 'shape', name, color, s,
      x: Math.round((right - s) / 2 + 6),
      y: Math.round((r.height - s) / 2),
      w: 4 + 3 * widthMul,
      drag: false,
      // the shape is kept inside the free part of the page, clear of the toolbar
      bounds: { x0: 6, x1: right - s, y0: 6, y1: r.height - s - 6 },
    };
    document.body.classList.add('ghosting');
    drawGhost();
  }

  function clampFloat() {
    const b = float.bounds;
    float.x = Math.round(Math.max(b.x0, Math.min(b.x1, float.x)));
    float.y = Math.round(Math.max(b.y0, Math.min(b.y1, float.y)));
  }

  function drawGhost() {
    if (!float) return;
    gtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    wipe(gtx);
    drawShape(gtx, float);
  }

  // Drop the floating shape on the page (committed, undoable), or take it back.
  function placeShape() {
    if (!float) return;
    const op = { ...float };
    delete op.drag;
    delete op.bounds;
    ops.push(op);
    float = null;
    document.body.classList.remove('ghosting');
    wipe(gtx);
    resetTransform();
    drawShape(ctx, op);
    trim();
    // Next comes colouring it in, so leave the eraser or letters for a drawing tool.
    if (tool === 'eraser' || tool === 'abc') selectTool(lastDrawTool);
  }

  function cancelShape() {
    if (!float) return;
    float = null;
    document.body.classList.remove('ghosting');
    wipe(gtx);
  }

  function ghostPoint(e) {
    const r = ghost.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  ghost.addEventListener('pointerdown', (e) => {
    if (!float || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    closePops();
    resetTransform();
    try { ghost.setPointerCapture(e.pointerId); } catch (_) {}
    const p = ghostPoint(e);
    // A tap (no drag yet) drops the shape right where it is tapped.
    float.drag = { id: e.pointerId, dx: float.x - p.x, dy: float.y - p.y, moved: false };
    float.x = Math.round(p.x + float.drag.dx);
    float.y = Math.round(p.y + float.drag.dy);
    drawGhost();
  });

  ghost.addEventListener('pointermove', (e) => {
    if (!float || !float.drag || float.drag.id !== e.pointerId) return;
    e.preventDefault();
    const p = ghostPoint(e);
    const nx = Math.round(p.x + float.drag.dx);
    const ny = Math.round(p.y + float.drag.dy);
    if (nx !== float.x || ny !== float.y) {
      float.drag.moved = true;
      float.x = nx;
      float.y = ny;
      clampFloat();
      drawGhost();
    }
  });

  function dropShape(e) {
    if (!float || !float.drag || float.drag.id !== e.pointerId) return;
    const wasTap = !float.drag.moved;
    float.drag = false;
    if (wasTap) {
      // A tap moves the shape's centre to the tap and drops it there.
      const p = ghostPoint(e);
      float.x = Math.round(p.x - float.s / 2);
      float.y = Math.round(p.y - float.s / 2);
      clampFloat();
    }
    placeShape();
  }
  ghost.addEventListener('pointerup', dropShape);
  ghost.addEventListener('pointercancel', dropShape);
  ghost.addEventListener('lostpointercapture', dropShape);

  // ---------- toolbar ----------

  const palette = document.getElementById('palette');
  const pickers = document.getElementById('pickers');
  const actions = document.getElementById('actions');
  const widthsEl = document.getElementById('widths');
  const toolsEl = document.getElementById('tools');
  const toolNow = document.getElementById('tool-now');
  const widthNow = document.getElementById('width-now');
  const shapesEl = document.getElementById('shapes');
  const pops = [toolsEl, widthsEl, palette, shapesEl];
  const swatches = COLORS.map(() => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn swatch';
    palette.appendChild(b);
    return b;
  });

  function paintSwatches() {
    const hidden = SAME_AS_PAPER[darkMode.matches ? 'dark' : 'light'];
    COLORS.forEach(([name, hex], i) => {
      if (hex === hidden) [name, hex] = TEAL;
      const b = swatches[i];
      b.dataset.color = hex;
      b.style.setProperty('--c', hex);
      b.setAttribute('aria-label', name);
    });
    // If the selected colour just left the palette, switch to its replacement.
    markColor(color === hidden ? TEAL[1] : color);
  }
  // preview sizes for size step i: stroke thickness, and letter size for ABC
  function sizeVars(el, i) {
    el.style.setProperty('--dot', (6 + i * 5) + 'px');
    el.style.setProperty('--a', (12 + i * 5) + 'px');
  }

  const widthDots = WIDTHS.map((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.dataset.mul = m;
    sizeVars(b, i);
    b.setAttribute('aria-label', 'Size ' + (i + 1) + ' of ' + WIDTHS.length);
    widthsEl.appendChild(b);
    return b;
  });

  function markWidth(m) {
    widthMul = m;
    for (const b of widthDots) b.classList.toggle('on', +b.dataset.mul === m);
    // a floating shape gets the new line thickness right away
    if (float) { float.w = 4 + 3 * widthMul; drawGhost(); }
    // the opener previews the chosen size
    sizeVars(widthNow, WIDTHS.indexOf(m));
    // with letters on, the next letters come out at the new size
    if (cur) {
      cur.size = letterSize();
      showCaret();
    }
  }

  for (const [name, d] of SHAPES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn shape';
    b.dataset.shape = name;
    b.setAttribute('aria-label', name);
    b.innerHTML = `<svg viewBox="-4 -4 108 108" aria-hidden="true"><path d="${d}"/></svg>`;
    shapesEl.appendChild(b);
  }

  const tools = [...toolsEl.querySelectorAll('[data-tool]')];

  function selectTool(t) {
    cancelShape();
    tool = t;
    if (t !== 'eraser' && t !== 'abc') lastDrawTool = t;
    for (const b of tools) b.classList.toggle('on', b.dataset.tool === t);
    // the tool opener shows the active tool
    const active = tools.find((b) => b.dataset.tool === t);
    toolNow.innerHTML = active.innerHTML;
    toolNow.dataset.tool = t;
    toolNow.setAttribute('aria-label', 'Tools: ' + active.getAttribute('aria-label'));
    // the size button means line width, eraser size or letter size; CSS previews it
    document.documentElement.dataset.tool = t;
    widthNow.setAttribute('aria-label', t === 'abc' ? 'Letter size' : t === 'eraser' ? 'Eraser size' : 'Line width');
    keys.hidden = t !== 'abc';
    board.classList.toggle('typing', t === 'abc');
    showCaret();
  }

  function markColor(hex) {
    color = hex;
    document.documentElement.style.setProperty('--ink', hex);
    for (const b of swatches) b.classList.toggle('on', b.dataset.color === hex);
    // a floating shape is drawn in the colour picked while it floats
    if (float) { float.color = hex; drawGhost(); }
  }

  function selectColor(hex) {
    markColor(hex);
    // Picking a colour while erasing means "I want to draw again".
    if (tool === 'eraser') selectTool(lastDrawTool);
  }

  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  // Undo/clear with one hand while the other is drawing: finish those lines first.
  function stopLive() {
    for (const l of live.values()) l.stroke.done = true;
    live.clear();
  }

  function undo() {
    stopLive();
    cancelShape();
    if (!ops.length) return false;
    const op = ops.pop();
    // Taking back a letter puts the cursor back where it was.
    if (op.type === 'text') cur = { x: op.x, y: op.y, size: op.size, lineX: op.lineX };
    redraw();
    showCaret();
    return true;
  }

  function isBlank() {
    return ops.length ? ops[ops.length - 1].type === 'clear' : baseBlank;
  }

  function clearPage() {
    stopLive();
    cancelShape();
    if (isBlank()) return false;
    whoosh();
    ops.push({ type: 'clear' });
    wipe(ctx);
    trim();
    cur = null;
    showCaret();
    return true;
  }

  // The old drawing flies away. Purely decorative, so it must never stop the clear.
  function whoosh() {
    try {
      const ghost = document.createElement('canvas');
      ghost.width = paper.width;
      ghost.height = paper.height;
      ghost.style.width = paper.style.width;
      ghost.style.height = paper.style.height;
      ghost.className = 'whoosh';
      ghost.getContext('2d').drawImage(paper, 0, 0);
      board.appendChild(ghost);
      const done = () => {
        ghost.remove();
        ghost.width = ghost.height = 0;   // free the memory right away (iOS canvas limit)
      };
      ghost.addEventListener('animationend', done, { once: true });
      setTimeout(done, 1000);
    } catch (_) {}
  }

  // Back from the background: make sure the canvas scale is right and nudge iOS to
  // repaint the canvas layer. (No full redraw: that would lose older strokes if iOS
  // had dropped the hidden base layer while keeping the visible one.)
  function wake() {
    resetTransform();
    paper.style.opacity = '0.99';
    requestAnimationFrame(() => { paper.style.opacity = ''; });
  }

  // pointerdown (not click) so taps feel instant and work with several fingers.
  // Each opener in the strip pops its own palette out beside it; picking something,
  // tapping the page, or drawing closes it again. Only one palette is open at a time.
  const openers = [...pickers.querySelectorAll('.opener')];

  function closePops() { openPop(null); }

  function openPop(el) {
    for (const p of pops) p.classList.toggle('open', p === el);
    for (const o of openers) o.setAttribute('aria-expanded', o.dataset.open === (el && el.id) ? 'true' : 'false');
    if (el) placePop(el);
  }

  // Centre the palette on its opener, but keep it on screen.
  function placePop(el) {
    const o = pickers.querySelector(`[data-open="${el.id}"]`).getBoundingClientRect();
    const h = el.offsetHeight;
    const top = Math.max(8, Math.min(innerHeight - h - 8, o.top + o.height / 2 - h / 2));
    el.style.setProperty('--top', top + 'px');
  }

  // The actions pill sits just under the openers pill, whatever their size.
  function placeActions() {
    const r = pickers.getBoundingClientRect();
    actions.style.setProperty('--actions-top', (r.bottom + 12) + 'px');
  }

  pickers.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const b = e.target.closest('.opener');
    if (!b) return;
    const el = document.getElementById(b.dataset.open);
    openPop(el.classList.contains('open') ? null : el);
  });
  // Picking from a palette applies the choice and closes it.
  function onPick(el, attr, pick) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const b = e.target.closest(`[data-${attr}]`);
      if (b) { pick(b.dataset[attr]); closePops(); }
    });
  }
  onPick(toolsEl, 'tool', selectTool);
  onPick(widthsEl, 'mul', (m) => markWidth(+m));
  onPick(palette, 'color', selectColor);
  onPick(shapesEl, 'shape', stampShape);
  actions.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const b = e.target.closest('.btn');
    if (!b) return;
    closePops();
    if (b.dataset.action === 'undo') { if (undo()) bump(b); }
    else if (b.dataset.action === 'clear') { if (clearPage()) bump(b); }
  });

  // Keyboard on a Mac: Cmd/Ctrl+Z undoes; typing letters switches to the ABC tool.
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey) {
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      return;
    }
    if (e.altKey) return;
    if (/^[a-z0-9]$/i.test(e.key)) {
      e.preventDefault();
      if (tool !== 'abc') selectTool('abc');
      const up = e.shiftKey || upper;
      typeLetter(up ? e.key.toUpperCase() : e.key.toLowerCase());
    } else if (tool === 'abc') {
      const k = { ' ': 'space', Backspace: 'delete', Enter: 'enter' }[e.key];
      if (k) {
        e.preventDefault();
        press(k);
      }
    }
  });

  // ---------- hidden dev mode ----------
  // Typed "dev" or #dev toggles a HUD with the app's live internals.
  // Invisible to a normal user: no button, no UI until activated.

  let dev = false;
  let devFrames = 0;
  let devStrokes = 0;
  const hud = document.createElement('pre');
  hud.id = 'devhud';
  hud.hidden = true;
  document.body.appendChild(hud);

  function devTick() {
    if (!dev) return;
    devFrames++;
    requestAnimationFrame(devTick);
  }

  setInterval(() => {
    if (!dev) return;
    const fps = devFrames;
    devFrames = 0;
    const mem = performance.memory ?
      Math.round(performance.memory.usedJSHeapSize / 1048576) + '/' +
      Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB' : 'n/a';
    hud.textContent =
      `build      ${build.branch} @ ${build.commit}\n` +
      `built      ${build.time}${build.preview ? ' (preview)' : ''}\n` +
      `fps        ${fps}\n` +
      `tool       ${tool}${tool === 'eraser' ? ' (last draw: ' + lastDrawTool + ')' : ''}\n` +
      `color      ${color}\n` +
      `ops        ${ops.length} (undo cap ${MAX_UNDO}, baked base ${baseBlank ? 'blank' : 'set'})\n` +
      `live ptr   ${live.size}\n` +
      `strokes    ${devStrokes}\n` +
      `canvas     ${W}x${H} css @ dpr ${dpr} (${paper.width}x${paper.height})\n` +
      `palette    ${darkMode.matches ? 'dark' : 'light'} paper\n` +
      `heap       ${mem}\n` +
      `worker     ${navigator.serviceWorker && navigator.serviceWorker.controller ? 'active' : 'none'}\n` +
      `online     ${navigator.onLine}\n` +
      `viewport   ${innerWidth}x${innerHeight} ${screen.orientation ? screen.orientation.type : ''}`;
  }, 500);

  let build = { branch: '?', commit: '?', time: '?', preview: false };
  // Never cached: the point is to see which deploy is *currently* live.
  fetch('build.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { if (j) build = j; })
    .catch(() => {});

  function setDev(on) {
    dev = on;
    hud.hidden = !on;
    try { localStorage.setItem('draw-dev', on ? '1' : '0'); } catch (_) {}
    if (on) { devFrames = 0; requestAnimationFrame(devTick); }
  }

  // Typing "dev" also types d-e-v on the page; take those letters back on toggle.
  const devBuf = [];
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!/^[a-z]$/i.test(e.key)) return;
    devBuf.push(e.key.toLowerCase());
    if (devBuf.length > 3) devBuf.shift();
    if (devBuf.join('') !== 'dev') return;
    devBuf.length = 0;
    let n = 3;
    while (n-- && ops.length && ops[ops.length - 1].type === 'text') undo();
    setDev(!dev);
  }, true);

  window.addEventListener('hashchange', () => {
    if (location.hash === '#dev') setDev(!dev);
  });

  // Four fingers touching the paper at once: the only way to toggle on a phone.
  // Any stroke dots those taps left are taken back before showing the HUD.
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length < 4) return;
    stopLive();
    let n = e.touches.length;
    while (n-- && ops.length && ops[ops.length - 1].type === 'stroke' &&
           !ops[ops.length - 1].done && ops[ops.length - 1].pts.length <= 1) {
      ops.pop();
    }
    redraw();
    setDev(!dev);
  }, { passive: true });

  try { if (localStorage.getItem('draw-dev') === '1') setDev(true); } catch (_) {}

  // ---------- keep the page still ----------

  const stop = (e) => e.preventDefault();
  for (const t of ['touchstart', 'touchmove', 'gesturestart', 'gesturechange', 'dblclick', 'contextmenu', 'selectstart']) {
    document.addEventListener(t, stop, { passive: false });
  }
  // Pinch-zoom on a Mac trackpad arrives as ctrl+wheel.
  document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });

  // ---------- start ----------

  setCase(true);
  selectTool('crayon');
  markWidth(1);
  paintSwatches();
  darkMode.addEventListener('change', paintSwatches);
  fit();
  placeActions();
  new ResizeObserver(() => { fit(); placeActions(); }).observe(board);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  window.addEventListener('pageshow', wake);
  // iOS threw the canvas away and gave back a blank one: draw everything again.
  paper.addEventListener('contextrestored', () => { stopLive(); redraw(); });
  ghost.addEventListener('contextrestored', () => { drawGhost(); });
  window.addEventListener('orientationchange', () => setTimeout(fit, 300));

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // When an update takes over, reload to show it, unless something is already drawn.
    const hadWorker = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadWorker && !ops.length && baseBlank) location.reload();
    });
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
