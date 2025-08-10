//src/main.jsx
// React & React DOM
import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";

// Global styles (tokens + reset + utilities)
import "./styles/index.css";

// Shared components
import SplashScreen from "@components/SplashScreen.jsx";
// Global UI providers & core app
import { ToastProvider } from "@components/ToastContext";

import App from "./App.jsx";
// Optional: friendly fallback while lazy routes load
// Preload school branding (sets CSS vars + caches logo/name)
import { getCurrentSchoolBranding } from './utils/school-branding'

// ---- Bootstrap (Vite supports top-level await) -------------------------
await (async () => {
  try {
    const brand = await getCurrentSchoolBranding()

    // Sync the browser UI color with the brand on first paint
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta && brand?.primaryColor) {
      meta.setAttribute('content', brand.primaryColor)
    }

    // React to later branding switches (e.g., school switcher)
    window.addEventListener('branding:updated', e => {
      const b = e?.detail
      if (meta && b?.primaryColor) meta.setAttribute('content', b.primaryColor)
    })
  } catch {
    // Branding fetch failing is non-fatal; continue rendering.
  }
})()

// ---- Mount --------------------------------------------------------------
const container = document.getElementById('root')
if (!container) {
  // Fail loudly in dev to catch bad HTML mounts

  console.error('Root node "#root" not found in index.html')
  throw new Error('Root node "#root" not found')
}

const root = createRoot(container)

root.render(
  <React.StrictMode>
    <ToastProvider>
      {/* If you lazy-load big routes/pages inside App, this gives a friendly fallback */}
      <Suspense
        fallback={
          <SplashScreen message="Loading CDL Trainer…" showTip={false} />
        }
      >
        <App />
      </Suspense>
    </ToastProvider>
  </React.StrictMode>
)

// ---- Optional: Service Worker (only if you ship /sw.js) -----------------
// if ("serviceWorker" in navigator && import.meta.env.PROD) {
//   window.addEventListener("load", () => {
//     navigator.serviceWorker.register("/sw.js").catch(() => {});
//   });
// }

// ---- Vite HMR hygiene ---------------------------------------------------
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount()
  })
}
