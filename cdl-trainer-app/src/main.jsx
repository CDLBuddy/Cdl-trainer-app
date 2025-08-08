// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Optional: preload branding before first paint to avoid a flash of default logo/color
import { getCurrentSchoolBranding } from "./utils/school-branding";

// --- Bootstrap (Vite supports top-level await) ---
await (async () => {
  try {
    await getCurrentSchoolBranding(); // sets --brand-primary, caches logo/name, emits branding:updated
  } catch {
    // non-fatal; app can still render
  }
})();

const container = document.getElementById("root");
if (!container) {
  // Fail loudly in dev to catch bad HTML mounts
  // eslint-disable-next-line no-console
  console.error('Root node "#root" not found in index.html');
  throw new Error('Root node "#root" not found');
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// --- Vite HMR hygiene ---
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount();
  });
}