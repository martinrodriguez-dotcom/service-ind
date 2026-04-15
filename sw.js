const CACHE_NAME = 'bnd-v1';

// Lista de archivos vitales para que la app funcione offline o cargue rápido
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './firebaseConfig.js',
  './Icons.jsx',
  './Components.jsx',
  './App.jsx',
  './manifest.json',
  './icon.png'
];

// 1. EVENTO DE INSTALACIÓN: Guarda los archivos en la memoria del dispositivo
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('BND: Archivos guardados en caché con éxito');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. EVENTO DE ACTIVACIÓN: Limpia versiones viejas de la app si las hubiera
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

// 3. EVENTO FETCH: Intercepta las peticiones para servir los archivos desde el caché
self.addEventListener('fetch', (event) => {
  // Solo interceptamos peticiones de archivos locales
  if (event.request.mode === 'navigate' || ASSETS_TO_CACHE.includes(event.request.url)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Retorna el archivo del caché o lo busca en internet si no está
        return response || fetch(event.request);
      })
    );
  }
});
