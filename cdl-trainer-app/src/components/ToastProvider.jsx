// src/components/ToastProvider.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ToastContext from './ToastContext.js';
import { __bindToastCompat } from './toast-compat.js';
import { Toast } from './Toast.jsx';

/**
 * ToastProvider — wraps your app and makes showToast() available via context.
 * Also bridges to the legacy DOM-based toast-compat system.
 */
export default function ToastProvider({ children, defaultPosition = 'bottom-right' }) {
  const [queue, setQueue] = useState([]);
  const activeRef = useRef(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'info', duration = 3000, opts = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setQueue(q => [
      ...q,
      {
        id,
        message: String(message ?? ''),
        type,
        duration,
        position: opts.position || defaultPosition,
        action: opts.action,
        dismissible: opts.dismissible ?? true,
      },
    ]);
  }, [defaultPosition]);

  // Bind/unbind legacy bridge so non-React code can still call showToast()
  useEffect(() => {
    __bindToastCompat({ showToast });
    return () => __bindToastCompat(null);
  }, [showToast]);

  // Process one toast at a time
  useEffect(() => {
    if (activeRef.current || queue.length === 0) return;

    const [next, ...rest] = queue;
    activeRef.current = next;
    setQueue(rest);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      activeRef.current = null;
      setQueue(q => q.slice());
    }, next.duration || 3000);

    return () => clearTimeout(timerRef.current);
  }, [queue]);

  const dismiss = useCallback((id) => {
    if (activeRef.current && (!id || id === activeRef.current.id)) {
      clearTimeout(timerRef.current);
      activeRef.current = null;
      setQueue(q => q.slice());
    }
  }, []);

  const ctx = useMemo(() => ({ showToast }), [showToast]);
  const active = activeRef.current;

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {active ? (
        <Toast
          id={active.id}
          message={active.message}
          type={active.type}
          duration={active.duration}
          position={active.position}
          action={active.action}
          dismissible={active.dismissible}
          onClose={() => dismiss(active.id)}
        />
      ) : null}
    </ToastContext.Provider>
  );
}
