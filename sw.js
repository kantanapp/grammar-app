/* Service worker: cache everything on first visit, then serve from cache.
   Bump CACHE_NAME whenever any file changes (including questions.json). */

var CACHE_NAME = 'grammar-v1';

var ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './questions.json',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        /* 'reload' skips the browser's own HTTP cache, so bumping CACHE_NAME
           really does pick up the edited files (questions.json especially). */
        var requests = ASSETS.map(function (url) {
          try { return new Request(url, { cache: 'reload' }); } catch (e) { return url; }
        });
        return cache.addAll(requests);
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names.map(function (name) {
          return name === CACHE_NAME ? null : caches.delete(name);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request)
        .then(function (response) {
          if (response && response.ok && response.type === 'basic') {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
          }
          return response;
        })
        .catch(function () {
          /* Offline and not cached: fall back to the app shell for page loads. */
          if (request.mode === 'navigate') return caches.match('./index.html');
          throw new Error('offline');
        });
    })
  );
});
