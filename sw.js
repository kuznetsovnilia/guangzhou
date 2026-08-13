const CACHE = 'gz-guide-6d6a6bd45e';
const TILES = 'gz-tiles';
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{})); });
self.addEventListener('activate', e => { e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.map(k => (k!==CACHE && k!==TILES) ? caches.delete(k) : null)))
    .then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' || url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => { const c = res.clone();
      caches.open(CACHE).then(cc => cc.put(req, c)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))); return; }
  if (/tile|cartocdn|basemaps|arcgisonline|server\.arcgis/i.test(url.href)) {
    e.respondWith(caches.open(TILES).then(async cache => {
      const hit = await cache.match(req);
      const net = fetch(req).then(res => { if (res && res.status === 200) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net; })); return; }
  e.respondWith(caches.match(req).then(r => r || fetch(req)).catch(() => caches.match(req)));
});
