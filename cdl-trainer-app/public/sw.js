/* public/sw.js
   CDL Trainer — PWA Service Worker
   ------------------------------------------------------------
   - Cache-first for static assets (.js/.css/fonts/images)
   - Network-first for navigations (HTML), fallback: /index.html
   - Skips Firebase/backend requests & dev/HMR endpoints
   - Gentle cache versioning + cleanup
   - Logs in DEV mode (silent in PROD)
*/

const SW_VERSION = 'v1.0.0'; // bump to invalidate old caches
const SHELL_CACHE = `cdl-shell-${SW_VERSION}`;
const RUNTIME_CACHE = `cdl-runtime-${SW_VERSION}`;

// Tiny app shell pre-cache (don’t bloat this list!)
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
];

// Skip caching for APIs, Firebase, Vite dev, analytics, etc.
const SKIP_PATTERNS = [
  /^https?:\/\/.*(?:googleapis|gstatic)\.com\//i,
  /^https?:\/\/.*\/__\/firebase\//i,
  /^https?:\/\/.*\/sockjs-node\//i, // Vite/React Fast Refresh
  /\/@vite\//i,
  /\/vite\.[\w.-]+\.js$/i,
  /\/(api|functions|rpc)\//i,
];

// Helpers
const isGET = (req) => req.method === 'GET';
const isHTML = (req) => req.headers.get('accept')?.includes('text/html');
const isStaticAsset = (url) =>
  /\.(?:js|css|woff2?|ttf|eot|png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname);
const shouldSkip = (url) => SKIP_PATTERNS.some((re) => re.test(url.href));
const log = (...args) => {
  if (self?.location?.hostname === 'localhost') {
    console.warn('[SW]', ...args);
  }
};

// Install — pre-cache shell
self.addEventListener('install', (event) => {
  log('install');
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener('activate', (event) => {
  log('activate');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => {
            log('deleting old cache', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// Fetch — SPA-safe strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isGET(request)) return;

  const url = new URL(request.url);

  if (shouldSkip(url)) {
    log('skip', url.href);
    return;
  }

  // Navigations (HTML): network-first with offline fallback
  if (isHTML(request)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return (
            cached ||
            new Response('Offline', {
              status: 503,
              statusText: 'Offline',
              headers: { 'Content-Type': 'text/html' },
            })
          );
        })
    );
    return;
  }

  // Same-origin static assets: cache-first
  if (url.origin === location.origin && isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // Other same-origin GETs: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (url.origin === location.origin && res.ok) {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});