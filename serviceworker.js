// serviceworker.js

// 1) Bump the cache version whenever you change your code!
const CACHE_NAME = "cdl-trainer-cache-v3";  // ← incremented from v2

// 2) List your truly static files here
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/style.css",
  "/manifest.json",
  // images & icons
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

// 3) On install, cache your static assets
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// 4) On activate, clear out old caches
self.addEventListener("activate", event => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
});

// 5) Fetch handler:  
//    - For app.js (and any .js), try network first → fallback to cache  
//    - For HTML pages, try network first → fallback to offline.html  
//    - For everything else, use cache first → fallback to network
self.addEventListener("fetch", event => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Network-first for JavaScript bundles
  if (url.pathname.endsWith(".js")) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update the cache in the background
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first for HTML pages
  if (event.request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(event.request)
        .then(resp => resp)
        .catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Otherwise--static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});