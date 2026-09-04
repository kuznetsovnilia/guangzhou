const CACHE = 'gz-guide-821a446cba';
const TILES = 'gz-tiles';
const ASSETS = 'gz-assets';
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icon-180.png', './icon-192.png', './icon-512.png'];
const EXTRA = ['./data-offline-bb4ca476d183.json','./data-walk-f31fe427e487.json','./ph-cuisine-dd4ec66a3ec9.json','./ph-dish-b9c29fd26a96.json','./ph-med-1b40464d23ee.json','./ph-paste-51226fa4ed28.json','./ph-place-450d5f123aa8.json','./ph-place-5b721f70b1f4.json','./ph-place-875b8fca69f9.json','./ph-place-8aef83f513d9.json','./ph-place-c5d916cbde54.json'];
const EXTRA_SET = new Set(EXTRA.map(u => new URL(u, self.registration.scope).href));
async function fillAssets() {
  const c = await caches.open(ASSETS);
  const have = new Set((await c.keys()).map(r => r.url));
  const todo = EXTRA.filter(u => !have.has(new URL(u, self.registration.scope).href));
  for (let i = 0; i < todo.length; i += 8) {
    await Promise.all(todo.slice(i, i + 8).map(u =>
      fetch(u).then(r => r.ok ? c.put(u, r) : null).catch(() => {})));
  }
}
self.addEventListener('install', e => { self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{})); });
self.addEventListener('activate', e => { e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.map(k => (k!==CACHE && k!==TILES && k!==ASSETS) ? caches.delete(k) : null)))
    .then(() => caches.open(TILES)).then(c => c.keys().then(ks =>
      Promise.all(ks.filter(r => /openstreetmap\.org/i.test(r.url)).map(r => c.delete(r)))))
    .then(() => caches.open(ASSETS)).then(c => c.keys().then(ks =>
      Promise.all(ks.filter(r => !EXTRA_SET.has(r.url)).map(r => c.delete(r)))))
    .catch(() => {}).then(() => self.clients.claim()).then(() => fillAssets())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (EXTRA_SET.has(url.href)) {
    e.respondWith(caches.open(ASSETS).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }
      catch (err) { return new Response('', {status: 504}); } })); return; }
  if (req.mode === 'navigate' || url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => { const c = res.clone();
      caches.open(CACHE).then(cc => cc.put(req, c)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))); return; }
  if (/openstreetmap\.org/i.test(url.href)) {
    e.respondWith(fetch(req).catch(() => caches.match(req))); return; }
  if (/autonavi|appmaptile|tile|cartocdn|basemaps|arcgisonline|server\.arcgis/i.test(url.href)) {
    e.respondWith(caches.open(TILES).then(async cache => {
      const hit = await cache.match(req);
      const net = fetch(req).then(res => {
        if (res && (res.status === 200 || res.type === 'opaque')) cache.put(req, res.clone());
        return res; }).catch(() => hit);
      return hit || net; })); return; }
  e.respondWith(caches.match(req).then(r => r || fetch(req)).catch(() => caches.match(req)));
});
