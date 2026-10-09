// Online: fetch the whole app as one unit (so HTML/CSS/JS always match), keep a copy.
// Offline: use the saved copy. Files are only swapped together, never mixed.
const CACHE = 'draw-v18';
const FILES = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
// On a very slow connection, fall back to the saved copy after this long.
const TIMEOUT = 4000;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(e.request.mode === 'navigate' ? pageFirst(e) : networkFirst(e));
});

// The page decides the version: fetch the latest HTML; if it changed, refresh the
// whole cache before showing it, so the app is never half old, half new.
async function pageFirst(e) {
  const c = await caches.open(CACHE);
  try {
    const r = await fetch(e.request.url, { cache: 'no-cache' });
    if (r.ok) {
      const cached = await c.match(e.request, { ignoreSearch: true });
      const same = cached && (await cached.text()) === (await r.clone().text());
      if (!same) {
        await refresh(c);
      } else {
        c.put(e.request, r.clone());
      }
      return r;
    }
  } catch (_) {}
  return (await c.match(e.request, { ignoreSearch: true })) || fetch(e.request);
}

// Re-download every file together. addAll is all-or-nothing, so on failure the
// previous complete set stays.
function refresh(c) {
  return c.addAll(FILES).catch(() => {});
}

async function networkFirst(e) {
  const c = await caches.open(CACHE);
  // 'no-cache' asks the server whether the file changed instead of trusting the browser cache.
  const net = fetch(e.request.url, { cache: 'no-cache' }).then((r) => {
    if (r.ok) c.put(e.request, r.clone());
    return r;
  });
  e.waitUntil(net.catch(() => {}));   // finish saving even if the saved copy was used
  try {
    return await Promise.race([
      net,
      new Promise((_, reject) => setTimeout(reject, TIMEOUT)),
    ]);
  } catch (_) {
    return (await c.match(e.request, { ignoreSearch: true })) || net;
  }
}
