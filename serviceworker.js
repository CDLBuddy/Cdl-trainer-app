// === CDL Trainer Service Worker – Optimized for SPA and Modular Imports ===
// 1) Bump the cache version on any deploy to force update!
const CACHE_NAME = "cdl-trainer-cache-v4";  // ← incremented from v3

// 2) List your static (build-time) files here.
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/style.css",
  "/manifest.json",
  // JS Entrypoints (add more if code-split)
  "/app.js",
  "/ui-helpers.js",
  "/firebase.js",
  "/navigation.js",
  // Main role barrels (add if split for SSR or performance)
  "/student/index.js",
  "/instructor/index.js",
  "/admin/index.js",
  "/superadmin/index.js",
  // Student pages (add each if you import by path)
  "/student/student-dashboard.js",
  "/student/profile.js",
  "/student/checklists.js",
  "/student/practice-tests.js",
  "/student/flashcards.js",
  "/student/test-results.js",
  "/student/test-engine.js",
  "/student/walkthrough.js",
  "/student/ai-coach.js",
  "/student/ai-api.js",
  // Icons and images
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
  "/icons/login.png",
  // Mascot & background assets
  "/pattern.svg",
  "/noise.png"
];

// 3) Install handler: cache all static assets
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// 4) Activate handler: remove old caches
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

// 5) Fetch handler
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Handle navigation requests for SPA (pushState routes)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Network-first for all JS (so you get new code instantly, fallback to cache)
  if (url.pathname.endsWith(".js")) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache in the background
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first for HTML files (except navigation, which is handled above)
  if (event.request.destination === "document") {
    event.respondWith(
      fetch(event.request)
        .then(resp => resp)
        .catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Cache-first for images, icons, CSS, SVG, manifest, etc.
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});