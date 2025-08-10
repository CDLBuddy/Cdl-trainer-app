// src/components/toast-compat.js
// Transitional shim: routes legacy showToast(...) calls through the ToastContext provider.
// Safe to keep until every call site is fully migrated to `const { showToast } = useToast()`.

let _api = null;

// Called by the provider once it knows how to show toasts
export function __bindToastCompat(api) {
  // `api` can be a function or an object with showToast; both are supported
  if (typeof api === 'function') {
    _api = { showToast: api };
  } else if (api && typeof api.showToast === 'function') {
    _api = api;
  } else {
    console.warn('[toast-compat] Invalid API passed to __bindToastCompat');
  }
}

// Legacy-style call that will be re-routed through the bound API
export function showToast(...args) {
  if (!_api) {
    // avoids crashing during very early app boot
    console.warn('[toast-compat] Toast API not ready yet.');
    return;
  }
  return _api.showToast(...args);
}
