// src/utils/RequireRole.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { auth, db } from "./firebase"; // <- adjust if your firebase file lives elsewhere
import {
  onAuthStateChanged,
  getIdTokenResult,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

/* =========================================================
   CONFIG (tweak to your project)
   ========================================================= */
// Where to read the role from (in order). All are tried until one works.
const ROLE_SOURCES = [
  "customClaims", // Firebase custom claims: token.claims.role
  "userDocByUid", // Firestore: users/<uid>
  "userDocByEmail", // Firestore: users where email == currentUser.email
];

// Local cache key (session-scoped so it resets on new tab)
const CACHE_KEY = "roleCache_v1";

/* =========================================================
   Hook: useUserRole
   - Subscribes to Firebase auth
   - Fetches role from claims/Firestore
   - Caches role in sessionStorage
   ========================================================= */
export function useUserRole() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    user: null,
    role: null,
    email: null,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          // clear cache on sign-out
          sessionStorage.removeItem(CACHE_KEY);
          setState({ loading: false, error: null, user: null, role: null, email: null });
          return;
        }

        const email = user.email || null;

        // 1) try cache
        const cached = safeGetCache(user.uid, email);
        if (cached) {
          setState({ loading: false, error: null, user, role: cached.role, email });
          return;
        }

        // 2) live fetch from sources
        const role = await resolveRoleFromSources(user, email);
        if (!role) {
          // Not fatal: user logged in but no role set yet
          setState({ loading: false, error: null, user, role: null, email });
          // cache null to avoid hammering reads for 30s
          safeSetCache(user.uid, email, null, 30);
          return;
        }

        // Cache & update
        safeSetCache(user.uid, email, role);
        // Also keep compatibility with your existing global usage
        window.currentUserRole = role;
        localStorage.setItem("userRole", role);

        setState({ loading: false, error: null, user, role, email });
      } catch (err) {
        setState((s) => ({ ...s, loading: false, error: err || new Error("Role check failed") }));
      }
    });
    return () => unsub();
  }, []);

  return state;
}

/* =========================================================
   Component: RequireRole
   - Pass role="student" or role={["admin","superadmin"]}
   - Optional props:
       redirectTo="/login"
       fallback={<YourLoader />}
       onDeny={<YourDeniedUI />}
   ========================================================= */
export function RequireRole({
  role,
  children,
  redirectTo = "/login",
  fallback = <DefaultLoader text="Checking permissions…" />,
  onDeny = <DefaultAccessDenied />,
}) {
  const location = useLocation();
  const { loading, user, role: currentRole } = useUserRole();

  // Not signed in → send to login, preserve "from"
  if (!loading && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Still determining
  if (loading) return fallback;

  // Signed in, but role not set (or mismatch)
  const allowed = useMemo(() => {
    if (!role) return true; // if no role specified, just requires sign-in
    return Array.isArray(role) ? role.includes(currentRole) : currentRole === role;
  }, [role, currentRole]);

  if (!allowed) return onDeny;

  return <>{children}</>;
}

/* =========================================================
   Default UI Components (you can override via props)
   ========================================================= */
export function DefaultLoader({ text = "Loading…" }) {
  return (
    <div className="loading-container" style={{ textAlign: "center", marginTop: "4em" }}>
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

export function DefaultAccessDenied() {
  return (
    <div className="dashboard-card" style={{ maxWidth: 560, margin: "2em auto", textAlign: "center" }}>
      <h2>Access Denied</h2>
      <p style={{ opacity: 0.85 }}>
        Your account doesn’t have permission to view this page.
      </p>
      <div style={{ marginTop: 14 }}>
        <button className="btn" onClick={() => (window.location.href = "/")}>
          Go Home
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   Helpers: Role resolution + caching
   ========================================================= */
async function resolveRoleFromSources(user, email) {
  for (const source of ROLE_SOURCES) {
    try {
      // eslint-disable-next-line default-case
      switch (source) {
        case "customClaims": {
          const token = await getIdTokenResult(user, true);
          const claimRole = token?.claims?.role || token?.claims?.roles?.[0];
          if (claimRole) return claimRole;
          break;
        }
        case "userDocByUid": {
          const ref = doc(db, "users", user.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const role = snap.data()?.role;
            if (role) return role;
          }
          break;
        }
        case "userDocByEmail": {
          if (!email) break;
          const q = query(collection(db, "users"), where("email", "==", email));
          const res = await getDocs(q);
          if (!res.empty) {
            const role = res.docs[0].data()?.role;
            if (role) return role;
          }
          break;
        }
      }
    } catch (_) {
      // ignore and try next source
    }
  }
  return null;
}

// Session cache structure: { [uidOrEmail]: { role, exp: timestampMillis } }
function safeGetCache(uid, email) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const key = uid || email;
    const entry = key ? data[key] : null;
    if (!entry) return null;
    if (Date.now() > entry.exp) return null;
    return { role: entry.role };
  } catch {
    return null;
  }
}

function safeSetCache(uid, email, role, ttlSeconds = 300) {
  try {
    const key = uid || email;
    if (!key) return;
    const raw = sessionStorage.getItem(CACHE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[key] = {
      role,
      exp: Date.now() + ttlSeconds * 1000,
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}