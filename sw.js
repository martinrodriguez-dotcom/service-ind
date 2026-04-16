// Aumentamos la versión para forzar la actualización en los celulares
const CACHE_NAME = 'bnd-v2.6';

// Sumamos style.css a la lista de archivos offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './firebaseConfig.js',
  './Icons.jsx',
  './Components.jsx',
  './App.jsx',
  './manifest.json',
  './icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('BND: Archivos guardados en caché con éxito');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('BND: Limpiando caché antigua');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate' || ASSETS_TO_CACHE.includes(event.request.url.replace(self.location.origin, '.'))) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
