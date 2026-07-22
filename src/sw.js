// sw.js — Service Worker para "Dónde está mi micro"
const CACHE_NAME = "mi-micro-v1";

// Recursos estáticos que se cachean al instalar
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/css/main.css",
  "/css/tokens.css",
  "/css/accessibility-panel.css",
  "/css/header.css",
  "/css/sidebar.css",
  "/css/stops.css",
  "/css/search.css",
  "/css/map.css",
  "/css/footer.css",
  "/css/popUpParada.css",
  "/js/main.js",
  "/js/listeners.js",
  "/js/menu.js",
  "/js/bottomSheet.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Instalar: precachear recursos estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activar: limpiar caches viejos
self.addEventListener("activate", (event) => {
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

// Fetch: network-first para API, cache-first para estáticos
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Dejar pasar peticiones al proxy/API sin cachear
  if (url.pathname.startsWith("/api") || url.port === "3000") {
    return;
  }

  // Para todo lo demás: intentar red, si falla usar caché
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Guardar copia fresca en caché si la respuesta es válida
        if (response && response.status === 200 && request.method === "GET") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Sin red: intentar desde caché
        return caches.match(request).then(
          (cached) =>
            cached ||
            new Response(
              "<h1>Sin conexión</h1><p>Revisá tu conexión a internet.</p>",
              { headers: { "Content-Type": "text/html" } }
            )
        );
      })
  );
});
