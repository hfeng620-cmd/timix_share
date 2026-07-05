/**
 * Timix观察站 Service Worker
 * 缓存策略：App Shell (Cache First) + API (Network First)
 */

const CACHE_NAME = "timix-shell-v1";
const SHELL_ASSETS = [
  "/",
  "/stations/",
  "/community/",
  "/models/",
  "/guides/",
  "/manifest.json",
];

// Install: pre-cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch(() => {
        // Silently skip failed pre-cache entries
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network First for navigation, Cache First for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests (Supabase, GitHub API, etc.)
  if (url.origin !== location.origin) return;

  // Static assets (JS, CSS, images, fonts): Cache First
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "image" ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|webp|svg|woff2?|ttf|ico)$/i)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigation / HTML: Network First with cache fallback
  if (request.destination === "document" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match("/").then((root) => root || new Response("Timix观察站 — 离线中，请检查网络连接", {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }));
          });
        })
    );
    return;
  }

  // Everything else: Network only
  event.respondWith(fetch(request));
});
