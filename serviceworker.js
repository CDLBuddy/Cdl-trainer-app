const CACHE_NAME = "cdl-trainer-cache-v2";
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/walkthrough.png",
  "/icons/tests.png",
  "/icons/coach.png",
  "/icons/checklist.png",
  "/icons/results.png",
  "/icons/flashcards.png",
  "/icons/experience.png",
  "/icons/license.png",
  "/icons/login.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => {
          if (event.request.headers.get("accept").includes("text/html")) {
            return caches.match("/offline.html");
          }
        })
      );
    })
  );
});