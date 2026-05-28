const CACHE = 'toyo-checker-v3';
const ASSETS = ['./','./index.html','./style.css','./app.js','./data.js','./manifest.json','./icon.svg'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// network-first: 常に新しいバージョンを取りに行く。失敗時のみキャッシュ
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    try {
      const res = await fetch(e.request, { cache: 'no-store' });
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    } catch {
      const cached = await caches.match(e.request);
      return cached || new Response('Offline', { status: 503 });
    }
  })());
});
