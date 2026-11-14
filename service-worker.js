const CACHE_NAME = "flowboard-v5";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./css/base.css",
  "./css/components.css",
  "./css/overlays.css",
  "./css/variables.css",
  "./js/main.js",
  "./js/boards.js",
  "./js/drag-drop.js",
  "./js/filters.js",
  "./js/i18n.js",
  "./js/sorting.js",
  "./js/state.js",
  "./js/statistics.js",
  "./js/storage.js",
  "./js/tasks.js",
  "./js/ui.js",
  "./js/workflow.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))),
  );
});
