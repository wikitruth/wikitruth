const CACHE_NAME = 'wikitruth-app-shell-v3';
const APP_SHELL_ASSETS = [
  '/app',
  '/react-app.html',
  '/dist/bundle.js?v=navbar-20260426-entryparity-1',
  '/css/app.min.css',
  '/layouts/core.min.css',
  '/manifest.webmanifest',
];
const NETWORK_FIRST_ASSETS = new Set(['/app', '/react-app.html', '/dist/bundle.js']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve(false);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  const isAssetRequest =
    requestUrl.pathname.startsWith('/dist/') ||
    requestUrl.pathname.startsWith('/css/') ||
    requestUrl.pathname.startsWith('/layouts/') ||
    requestUrl.pathname.startsWith('/img/') ||
    requestUrl.pathname === '/app' ||
    requestUrl.pathname === '/react-app.html';

  if (!isAssetRequest) {
    return;
  }

  const shouldUseNetworkFirst = NETWORK_FIRST_ASSETS.has(requestUrl.pathname) || requestUrl.pathname.startsWith('/dist/');

  if (shouldUseNetworkFirst) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
