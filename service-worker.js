/* ═══════════════════════════════════════════════════════════════════
   Math Pro Calculator — service-worker.js
   Offline-first caching strategy
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_NAME  = 'math-pro-v1';
const CACHE_URLS  = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.png',
];

/* ─── INSTALL: pre-cache all assets ────────────────────────────── */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_URLS);
    })
  );
});

/* ─── ACTIVATE: clear old caches ────────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ─── FETCH: cache-first strategy ───────────────────────────────── */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      // Not in cache — try network, then cache the response
      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type !== 'opaque'
        ) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network unavailable and not in cache
        return new Response('Offline — please reload when online.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      });
    })
  );
});
