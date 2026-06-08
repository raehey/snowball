// 눈덩이 Service Worker — Offline Support
const CACHE_NAME = 'snowball-v4.3.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for app assets, network-first for API calls
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-only for external API calls (Yahoo Finance, exchange rate)
  if (url.origin !== self.location.origin) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{}', {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // Cache-first for local assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Background update
        fetch(e.request).then(fresh => {
          if (fresh && fresh.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, fresh));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
