// src/pages/NotFound.jsx
import React, { useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getDashboardRoute,
  getCurrentRole,
  safeNavigate,
} from "../navigation/navigation.js";

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = getCurrentRole();
  const dashboard = getDashboardRoute(role);

  const goHome = useCallback(() => safeNavigate(navigate, dashboard, { replace: true }), [navigate, dashboard]);
  const goBack = useCallback(() => {
    try {
      if (window.history.length > 1) navigate(-1);
      else goHome();
    } catch {
      goHome();
    }
  }, [navigate, goHome]);

  useEffect(() => {
    const prev = document.title;
    document.title = "Page Not Found • CDL Trainer";
    return () => { document.title = prev; };
  }, []);

  // Keyboard shortcuts: H = home, B = back
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === "h") { e.preventDefault(); goHome(); }
      if (k === "b") { e.preventDefault(); goBack(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goHome, goBack]);

  return (
    <div className="container" style={{ padding: "56px 0 72px" }}>
      <div
        className="dashboard-card glass"
        style={{
          maxWidth: 720,
          margin: "0 auto",
          textAlign: "center",
          padding: "28px 22px",
        }}
        role="region"
        aria-labelledby="nf-title"
      >
        {/* Little SVG illustration */}
        <div aria-hidden="true" style={{ marginBottom: 14 }}>
          <svg width="116" height="116" viewBox="0 0 116 116">
            <defs>
              <linearGradient id="nfGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--brand-light)" />
                <stop offset="100%" stopColor="var(--brand-mid)" />
              </linearGradient>
            </defs>
            <circle cx="58" cy="58" r="52" fill="url(#nfGrad)" opacity="0.1" />
            <circle cx="58" cy="58" r="44" fill="none" stroke="url(#nfGrad)" strokeWidth="2" opacity="0.5" />
            <g fill="none" stroke="currentColor" strokeWidth="3" opacity="0.85">
              <path d="M38 48h14v36H38zM64 48h14v36H64z" />
              <path d="M32 48h52" />
              <path d="M44 38l6-10h16l6 10" />
              <path d="M52 74h12" />
            </g>
            <text
              x="58"
              y="98"
              textAnchor="middle"
              fontSize="12"
              fill="currentColor"
              opacity="0.7"
            >
              404
            </text>
          </svg>
        </div>

        <h1 id="nf-title" style={{ margin: "6px 0 4px" }}>Page Not Found</h1>
        <p className="u-muted" style={{ margin: "0 0 14px" }}>
          We couldn’t find <code style={{ opacity: 0.9 }}>{location.pathname}</code>.
        </p>

        <div
          className="u-flex u-flex-center u-wrap"
          style={{ gap: 10, marginTop: 8 }}
        >
          <button className="btn outline" onClick={goBack} aria-label="Go back">
            ← Back
          </button>
          <button className="btn" onClick={goHome} aria-label="Go to dashboard">
            Go to Dashboard
          </button>
        </div>

        <p className="u-muted" style={{ marginTop: 14, fontSize: ".92rem" }}>
          Tip: press <kbd>B</kbd> to go back or <kbd>H</kbd> for Home.
        </p>
      </div>
    </div>
  );
}