// src/components/ToastContext.jsx
// Global toast notification context provider

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { __bindToastCompat } from './toast-compat'; // bridge for legacy window.showToast
import Toast from './Toast.jsx';

/**
 * @typedef {'info'|'success'|'warning'|'error'} ToastType
 * @typedef {{ id?: string, message: string, type?: ToastType, duration?: number, dedupe?: boolean }} ShowToastOptions
 */

const ToastContext = createContext(null);

/**
 * Hook for child components to trigger toasts.
 * @returns {{ showToast: (messageOrOpts: string|ShowToastOptions, opts?: Omit<ShowToastOptions,'message'>) => string|undefined,
 *             removeToast: (id: string|number) => void,
 *             clearToasts: () => void,
 *             // temporary alias while migrating:
 *             addToast: (messageOrOpts: string|ShowToastOptions, opts?: Omit<ShowToastOptions,'message'>) => string|undefined
 *          }}
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export function ToastProvider({
  children,
  maxToasts = 3,
  defaultDuration = 3000,
}) {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    // clear any pending auto-dismiss
    const tid = timeoutsRef.current.get(id);
    if (tid) {
      clearTimeout(tid);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    for (const tid of timeoutsRef.current.values()) clearTimeout(tid);
    timeoutsRef.current.clear();
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (messageOrOpts, opts = {}) => {
      let message;
      let options;
      if (typeof messageOrOpts === 'string') {
        message = messageOrOpts;
        options = opts || {};
      } else {
        const { message: m, ...rest } = messageOrOpts || {};
        message = m;
        options = rest;
      }
      if (!message) return;

      const id =
        options.id ??
        (globalThis.crypto?.randomUUID?.() ??
          String(Date.now() + Math.random()));
      const type = options.type ?? 'info';
      const duration = Math.max(0, options.duration ?? defaultDuration);
      const dedupe = options.dedupe ?? true;

      setToasts((prev) => {
        // optional de-dupe: drop identical (message+type) that are already visible
        let next = dedupe
          ? prev.filter((t) => !(t.message === message && t.type === type))
          : prev;

        // cap queue length (keep latest)
        if (next.length >= maxToasts) next = next.slice(1);

        return [...next, { id, message, type }];
      });

      if (duration > 0) {
        const tid = setTimeout(() => removeToast(id), duration);
        timeoutsRef.current.set(id, tid);
      }

      return id;
    },
    [defaultDuration, maxToasts, removeToast]
  );

  // Bind legacy global window.showToast → real showToast
  useEffect(() => {
    __bindToastCompat({ showToast });
  }, [showToast]);

  const value = useMemo(
    () => ({
      showToast,
      addToast: showToast, // temporary alias for older code
      removeToast,
      clearToasts,
    }),
    [showToast, removeToast, clearToasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* A11y-friendly live region; do not add tabIndex or click handlers here */}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastContext;
