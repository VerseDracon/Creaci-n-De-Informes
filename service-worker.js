// Service Worker - Gestor de Informes de Actividades
// Cambia este número cada vez que subas una versión nueva del HTML,
// así los celulares descargan la actualización en vez de usar la copia vieja.
const CACHE_VERSION = 'gestor-informes-v2';

const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js',
  'https://unpkg.com/lucide@latest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      // Los recursos de CDN son de otro dominio: se guardan como
      // respuesta "opaca" (no se puede verificar el status, pero igual sirve).
      await Promise.all(
        CDN_ASSETS.map((url) =>
          fetch(url, { mode: 'no-cors' })
            .then((resp) => cache.put(url, resp))
            .catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo manejamos GET; lo demás (POST a Drive, etc.) pasa directo a la red.
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // Cache-first: si ya lo tenemos guardado, se sirve al instante (offline u online).
      const fetchAndUpdate = fetch(req)
        .then((networkResp) => {
          if (networkResp && (networkResp.ok || networkResp.type === 'opaque')) {
            const clone = networkResp.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          }
          return networkResp;
        })
        .catch(() => cached); // sin internet y sin red: nos quedamos con lo cacheado

      return cached || fetchAndUpdate;
    })
  );
});
