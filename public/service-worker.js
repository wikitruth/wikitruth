const CACHE_NAME = 'wikitruth-app-shell-v4';
const APP_SHELL_ASSETS = [
  '/app',
  '/react-app.html',
  '/dist/css/app.min.css?v=icon-assets-20260801-1',
  '/dist/css/core.min.css?v=icon-assets-20260801-1',
  '/dist/fonts/glyphicons-halflings-regular.woff2',
  '/dist/fonts/fontawesome-webfont.woff2?v=4.7.0',
  '/dist/bundle.js?v=icon-assets-20260801-1',
  '/img/favicons/manifest.json',
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
