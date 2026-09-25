// Online: always fetch the latest files (and keep a copy). Offline: use the saved copy.
const CACHE = 'draw-v3';
const FILES = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
// On a very slow connection, fall back to the saved copy after this long.
const TIMEOUT = 4000;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
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
  e.respondWith(networkFirst(e));
});

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
