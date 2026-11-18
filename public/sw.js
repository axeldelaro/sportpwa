const CACHE_NAME = 'pulsefit-pwa-v8.5';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

/**
 * Extrait automatiquement tous les bundles JS/CSS générés par Vite dans index.html
 * afin que l'application entière + le moteur Coach IA soient mis en cache dès le 1er lancement !
 */
function extractAssetsFromHtml(htmlText) {
  const found = new Set();
  const regex = /(?:src|href)=["'](\.?\/assets\/[^"']+)["']/g;
  let match;
  while ((match = regex.exec(htmlText)) !== null) {
    const raw = match[1];
    found.add(raw.startsWith('./') ? raw : `.${raw}`);
  }
  return Array.from(found);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // 1. Pré-cache l'App Shell de base
        await Promise.all(
          APP_SHELL.map((url) =>
            fetch(url, { cache: 'reload' })
              .then((res) => (res.ok ? cache.put(url, res) : null))
              .catch(() => cache.add(url).catch(() => null))
          )
        );

        // 2. Découvre et met en cache immédiatement tous les chunks JS/CSS (IA, aliments, exercices) dès l'ouverture du site
        try {
          const indexRes = await cache.match('./index.html');
          if (indexRes) {
            const html = await indexRes.clone().text();
            const bundleUrls = extractAssetsFromHtml(html);
            await Promise.all(
              bundleUrls.map((assetUrl) =>
                fetch(assetUrl, { cache: 'reload' })
                  .then((res) => (res.ok ? cache.put(assetUrl, res) : null))
                  .catch(() => null)
              )
            );
          }
        } catch {
          // Ignore
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation HTML : Network-First rapide avec repli hors-ligne instantané
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', cloned));
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  // Assets statiques JS/CSS/SVG : Cache-First ultra-rapide + rafraîchissement silencieux
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
