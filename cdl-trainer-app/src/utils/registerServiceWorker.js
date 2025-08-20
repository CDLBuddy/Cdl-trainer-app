/* eslint-disable no-console */
// src/utils/registerServiceWorker.js
// ======================================================================
// Service Worker Registration Helper
// - Registers /sw.js when supported
// - Silent fail in production, verbose in development
// ======================================================================

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Delay until window load to avoid blocking initial render
  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then(reg => {
        if (import.meta.env.DEV) {
          console.info('[SW] Registered:', reg.scope);
          if (reg.installing) {
            console.info('[SW] Installing…');
          } else if (reg.waiting) {
            console.info('[SW] Waiting…');
          } else if (reg.active) {
            console.info('[SW] Active');
          }
        }
        return reg;
      })
      .catch(err => {
        if (import.meta.env.DEV) {
          console.warn('[SW] Registration failed:', err);
        }
        // In production: silent fail (best-effort)
      });
  });
}