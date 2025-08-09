import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { ToastContainer } from "./Toast";

/**
 * ToastContext – exposes:
 *  - showToast(message | options)
 *  - success(message, opts?)
 *  - error(message, opts?)
 *  - info(message, opts?)
 *  - warning(message, opts?)
 *  - close(id)
 *  - clear()      // clear all
 *
 * Provider props:
 *  - maxToasts = 3        // max on screen
 *  - position = 'bottom-right'
 *  - defaultDuration = 3000
 */
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

let _id = 1;
function nextId() {
  return _id++;
}

export function ToastProvider({
  children,
  maxToasts = 3,
  position = "bottom-right",
  defaultDuration = 3000,
}) {
  const [toasts, setToasts] = useState([]);
  const pausedRef = useRef(false); // future: global pause on window blur if you want

  const normalize = useCallback(
    (input, type = "info", extra = {}) => {
      if (typeof input === "string") {
        return {
          id: nextId(),
          type,
          message: input,
          duration: defaultDuration,
          dismissible: true,
          ...extra,
        };
      }
      return {
        id: nextId(),
        type,
        duration: defaultDuration,
        dismissible: true,
        ...input,
      };
    },
    [defaultDuration]
  );

  const show = useCallback(
    (input, extra = {}) => {
      const t = normalize(input, input?.type || "info", extra);
      setToasts((curr) => {
        const next = [...curr, t];
        // cap stack
        if (next.length > maxToasts) next.splice(0, next.length - maxToasts);
        return next;
      });
      return t.id;
    },
    [normalize, maxToasts]
  );

  const success = useCallback((msg, opts = {}) => show({ ...opts, type: "success", message: msg }), [show]);
  const error   = useCallback((msg, opts = {}) => show({ ...opts, type: "error",   message: msg }), [show]);
  const info    = useCallback((msg, opts = {}) => show({ ...opts, type: "info",    message: msg }), [show]);
  const warning = useCallback((msg, opts = {}) => show({ ...opts, type: "warning", message: msg }), [show]);

  const close = useCallback((id) => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback(() => setToasts([]), []);

  // Optional: expose a single function named showToast to match your old API
  const showToast = show;

  const value = useMemo(
    () => ({ showToast, success, error, info, warning, close, clear }),
    [showToast, success, error, info, warning, close, clear]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Render stacked toasts */}
      <ToastContainer
        toasts={toasts}
        onClose={close}
        position={position}
      />
    </ToastContext.Provider>
  );
}