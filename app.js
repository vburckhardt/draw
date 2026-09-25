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

  // Line widths in CSS pixels.
  const SIZE = { crayon: 18, pencil: 4, marker: 13, eraser: 40 };

  const FONT = '"Chalkboard SE", "Comic Sans MS", "Marker Felt", "Arial Rounded MT Bold", ui-rounded, system-ui, sans-serif';
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Strokes kept as vectors so they can be undone; older ones are baked into `base`.
  const MAX_UNDO = 40;

  const board = document.getElementById('board');
  const paper = document.getElementById('paper');
  const panel = document.getElementById('panel');
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
    paper.style.width = w + 'px';
    paper.style.height = h + 'px';
    W = w; H = h;
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
    if (old) x.drawImage(old, 0, 0);
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
    const w = SIZE[stroke.tool];
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
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    c.restore();
  }

  function renderOp(c, op) {
    if (op.type === 'clear') return wipe(c);
    if (op.type === 'text') return drawLetter(c, op);
    const st = newState(op);
    while (st.i < op.pts.length) drawPoint(c, op, st);
    if (op.done) drawTail(c, op);
  }

  function redraw() {
    wipe(ctx);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(base, 0, 0);
    ctx.restore();
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
    if (tool === 'abc') {
      // Tap the page to choose where the letters go.
      const p = point(e);
      const size = letterSize();
      cur = { x: p.x, y: p.y - size / 2, size, lineX: p.x };
      showCaret();
      return;
    }
    try { paper.setPointerCapture(e.pointerId); } catch (_) {}
    const stroke = {
      type: 'stroke',
      tool,
      color,
      pen: e.pointerType === 'pen',
      seed: (Math.random() * 2 ** 32) >>> 0,
      pts: [point(e)],
      done: false,
    };
    const state = newState(stroke);
    ops.push(stroke);
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
    return Math.round(Math.max(36, Math.min(110, s)));
  }

  function ensureCursor() {
    if (!cur) {
      const size = letterSize();
      cur = { x: 24, y: 20, size, lineX: 24 };
    }
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

  // ---------- toolbar ----------

  const swatches = COLORS.map(([name, hex]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn swatch';
    b.dataset.color = hex;
    b.style.setProperty('--c', hex);
    b.setAttribute('aria-label', name);
    panel.appendChild(b);
    return b;
  });
  const tools = [...panel.querySelectorAll('[data-tool]')];

  function selectTool(t) {
    tool = t;
    if (t !== 'eraser' && t !== 'abc') lastDrawTool = t;
    for (const b of tools) b.classList.toggle('on', b.dataset.tool === t);
    keys.hidden = t !== 'abc';
    board.classList.toggle('typing', t === 'abc');
    showCaret();
  }

  function selectColor(hex) {
    color = hex;
    document.documentElement.style.setProperty('--ink', hex);
    for (const b of swatches) b.classList.toggle('on', b.dataset.color === hex);
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
    if (isBlank()) return false;
    const ghost = document.createElement('canvas');
    ghost.width = paper.width;
    ghost.height = paper.height;
    ghost.style.width = paper.style.width;
    ghost.style.height = paper.style.height;
    ghost.className = 'whoosh';
    ghost.getContext('2d').drawImage(paper, 0, 0);
    board.appendChild(ghost);
    ghost.addEventListener('animationend', () => ghost.remove());
    setTimeout(() => ghost.remove(), 1000);
    ops.push({ type: 'clear' });
    wipe(ctx);
    trim();
    cur = null;
    showCaret();
    return true;
  }

  // pointerdown (not click) so taps feel instant and work with several fingers.
  panel.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const b = e.target.closest('.btn');
    if (!b) return;
    if (b.dataset.tool) selectTool(b.dataset.tool);
    else if (b.dataset.color) selectColor(b.dataset.color);
    else if (b.dataset.action === 'undo') { if (undo()) bump(b); }
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
  selectColor(color);
  fit();
  new ResizeObserver(fit).observe(board);
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
