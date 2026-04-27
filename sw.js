// Service Worker - خدمة العمل بدون إنترنت
const CACHE_NAME = 'athir-v1';
const URLS_TO_CACHE = [
  '/Athir-/',
  '/Athir-/index.html',
  '/Athir-/app.js',
  '/Athir-/manifest.json',
  '/Athir-/sw.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE).catch(err => {
        console.log('بعض الملفات غير متاحة للتخزين المؤقت', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/Athir-/index.html');
        }
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
