import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [visible, setVisible] = useState(false);

  const showToast = useCallback((message, duration = 3000, type = "info") => {
    setQueue((q) => [...q, { message, duration, type }]);
  }, []);

  React.useEffect(() => {
    if (!visible && queue.length > 0) {
      setVisible(true);
      const { message, duration, type } = queue[0];
      const timer = setTimeout(() => {
        setQueue((q) => q.slice(1));
        setVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [queue, visible]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {queue.length > 0 && visible && (
        <div
          className={`toast-message toast-${queue[0].type}`}
          role="status"
          aria-live="polite"
          tabIndex={0}
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background:
              queue[0].type === "error"
                ? "#e35656"
                : queue[0].type === "success"
                ? "#44a368"
                : "#333",
            color: "#fff",
            padding: "12px 26px",
            fontWeight: 500,
            borderRadius: 7,
            opacity: 1,
            boxShadow: "0 4px 18px 0 rgba(0,0,0,0.15)",
            transition: "opacity 0.45s cubic-bezier(.4,0,.2,1)",
            zIndex: 99999,
            cursor: "pointer",
          }}
          onClick={() => {
            setQueue((q) => q.slice(1));
            setVisible(false);
          }}
        >
          <span>{queue[0].message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}
