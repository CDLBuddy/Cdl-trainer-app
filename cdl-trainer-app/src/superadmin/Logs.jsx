// src/superadmin/Logs.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../utils/firebase"; // adjust if your path differs
import {
  collection,
  query as fsQuery,
  orderBy,
  limit as fsLimit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { getUserRole } from "../utils/auth";
import { showToast } from "../utils/ui-helpers";

/* =========================
   Helpers
========================= */
function tsToMs(t) {
  // Firestore Timestamp | number | string -> ms
  if (!t) return null;
  if (typeof t === "number") return t;
  if (typeof t === "string") {
    const ms = Date.parse(t);
    return Number.isNaN(ms) ? null : ms;
  }
  // Firestore Timestamp object
  if (t.seconds != null) return t.seconds * 1000 + Math.floor((t.nanoseconds || 0) / 1e6);
  return null;
}

function toLocale(ts) {
  const ms = tsToMs(ts);
  return ms ? new Date(ms).toLocaleString() : "-";
}

function isErrorAction(action = "", details = "") {
  const str = `${action} ${details}`.toLowerCase();
  return /fail|error|denied|delete|blocked|invalid/.test(str);
}

function csvEscape(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

/* =========================
   Logs Page
========================= */
export default function Logs() {
  const navigate = useNavigate();

  // Guard: superadmin only
  useEffect(() => {
    const role = getUserRole?.() || localStorage.getItem("userRole");
    if (role !== "superadmin") {
      showToast("Access denied: Super Admins only.");
      navigate("/login", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetched data (paged)
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastDocRef = useRef(null);
  const PAGE_SIZE = 400; // fetch up to 400 at a time (you can tweak)

  // Filters / sorting
  const [dateFrom, setDateFrom] = useState(""); // yyyy-mm-dd
  const [dateTo, setDateTo] = useState(""); // yyyy-mm-dd
  const [userQ, setUserQ] = useState("");
  const [role, setRole] = useState("");
  const [action, setAction] = useState("");
  const [school, setSchool] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState("timeDesc"); // timeDesc | timeAsc | user | role | action

  // Debounce user/keyword
  const [userQDebounced, setUserQDebounced] = useState("");
  const [keywordDebounced, setKeywordDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setUserQDebounced(userQ.trim()), 250);
    return () => clearTimeout(id);
  }, [userQ]);
  useEffect(() => {
    const id = setTimeout(() => setKeywordDebounced(keyword.trim()), 250);
    return () => clearTimeout(id);
  }, [keyword]);

  // Initial load
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const q = fsQuery(
          collection(db, "systemLogs"),
          orderBy("timestamp", "desc"),
          fsLimit(PAGE_SIZE)
        );
        const snap = await getDocs(q);
        if (cancel) return;
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data(), _doc: d }));
        setLogs(items);
        lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      } catch (e) {
        showToast("Failed to load logs.");
        setLogs([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Paged load more
  async function onLoadMore() {
    if (!lastDocRef.current) {
      showToast("No more logs to load.");
      return;
    }
    setLoadingMore(true);
    try {
      const q = fsQuery(
        collection(db, "systemLogs"),
        orderBy("timestamp", "desc"),
        startAfter(lastDocRef.current),
        fsLimit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data(), _doc: d }));
      setLogs((prev) => prev.concat(items));
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      if (!items.length) showToast("No more logs.");
    } catch (e) {
      showToast("Failed to load more logs.");
    } finally {
      setLoadingMore(false);
    }
  }

  // Derived dropdown options from loaded logs
  const roles = useMemo(
    () =>
      Array.from(new Set(logs.map((l) => l.userRole).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [logs]
  );
  const actions = useMemo(
    () =>
      Array.from(new Set(logs.map((l) => l.action).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [logs]
  );
  const schools = useMemo(
    () =>
      Array.from(
        new Set(
          logs
            .map((l) => l.schoolName || l.schoolId)
            .filter(Boolean)
            .map(String)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [logs]
  );

  // Filtered/sorted view
  const view = useMemo(() => {
    let rows = logs.slice();

    // date range
    if (dateFrom) {
      const fromMs = Date.parse(dateFrom);
      rows = rows.filter((l) => {
        const ms = tsToMs(l.timestamp);
        return !fromMs || (ms && ms >= fromMs);
      });
    }
    if (dateTo) {
      // include the whole day
      const toMs = Date.parse(dateTo + "T23:59:59");
      rows = rows.filter((l) => {
        const ms = tsToMs(l.timestamp);
        return !toMs || (ms && ms <= toMs);
      });
    }

    // user contains
    if (userQDebounced) {
      const q = userQDebounced.toLowerCase();
      rows = rows.filter(
        (l) =>
          (l.userEmail && String(l.userEmail).toLowerCase().includes(q)) ||
          (l.userName && String(l.userName).toLowerCase().includes(q))
      );
    }

    // role equals
    if (role) rows = rows.filter((l) => l.userRole === role);

    // action equals
    if (action) rows = rows.filter((l) => l.action === action);

    // school equals (name or id)
    if (school)
      rows = rows.filter(
        (l) => l.schoolName === school || String(l.schoolId) === school
      );

    // keyword in details or target
    if (keywordDebounced) {
      const q = keywordDebounced.toLowerCase();
      rows = rows.filter(
        (l) =>
          (l.details && String(l.details).toLowerCase().includes(q)) ||
          (l.target && String(l.target).toLowerCase().includes(q))
      );
    }

    // sort
    rows.sort((a, b) => {
      if (sortBy === "timeAsc") {
        return (tsToMs(a.timestamp) || 0) - (tsToMs(b.timestamp) || 0);
      }
      if (sortBy === "user") {
        return (a.userEmail || a.userName || "").localeCompare(
          b.userEmail || b.userName || ""
        );
      }
      if (sortBy === "role") {
        return (a.userRole || "").localeCompare(b.userRole || "");
      }
      if (sortBy === "action") {
        return (a.action || "").localeCompare(b.action || "");
      }
      // timeDesc default
      return (tsToMs(b.timestamp) || 0) - (tsToMs(a.timestamp) || 0);
    });

    return rows;
  }, [
    logs,
    dateFrom,
    dateTo,
    userQDebounced,
    role,
    action,
    school,
    keywordDebounced,
    sortBy,
  ]);

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setUserQ("");
    setRole("");
    setAction("");
    setSchool("");
    setKeyword("");
    setSortBy("timeDesc");
  }

  function exportCSV() {
    if (!view.length) {
      showToast("No logs to export for current filters.");
      return;
    }
    const rows = [
      ["Time", "User", "Role", "School", "Action", "Target", "Details"],
      ...view.map((l) => [
        toLocale(l.timestamp),
        l.userName || l.userEmail || "",
        l.userRole || "",
        l.schoolName || l.schoolId || "",
        l.action || "",
        l.target || "",
        (l.details || "").replace(/\n/g, " "),
      ]),
    ];
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cdl-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast("Logs CSV exported.");
  }

  if (loading) {
    return (
      <div className="screen-wrapper" style={{ textAlign: "center", padding: 40 }}>
        <div className="spinner" />
        <p>Loading system logs…</p>
      </div>
    );
  }

  return (
    <div className="screen-wrapper fade-in" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h2 className="dash-head">
        📜 System Logs <span className="role-badge superadmin">Super Admin</span>
      </h2>

      <div className="dashboard-card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, marginRight: "auto" }}>Recent Actions & Audit Trail</h3>
          <button className="btn outline" onClick={exportCSV}>
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="logs-toolbar dashboard-controls" style={{ marginTop: "1rem", flexWrap: "wrap" }}>
          <label>
            Date From:
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ marginLeft: 6 }}
            />
          </label>
          <label>
            Date To:
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ marginLeft: 6 }}
            />
          </label>
          <input
            type="text"
            placeholder="User email/name"
            value={userQ}
            onChange={(e) => setUserQ(e.target.value)}
            style={{ width: 160 }}
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All Actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select value={school} onChange={(e) => setSchool(e.target.value)}>
            <option value="">All Schools</option>
            {schools.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search details…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 180 }}
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="timeDesc">Sort: Time (new → old)</option>
            <option value="timeAsc">Sort: Time (old → new)</option>
            <option value="user">Sort: User</option>
            <option value="role">Sort: Role</option>
            <option value="action">Sort: Action</option>
          </select>
          <button className="btn btn-outline" onClick={clearFilters}>
            Clear
          </button>
        </div>

        {/* Table */}
        <div className="user-table-scroll" style={{ marginTop: "1rem" }}>
          <table className="user-table logs-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>Time</th>
                <th>User</th>
                <th>Role</th>
                <th>School</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {view.length ? (
                view.slice(0, 200).map((l) => (
                  <tr key={l.id} className={isErrorAction(l.action, l.details) ? "log-row-error" : ""}>
                    <td style={{ whiteSpace: "nowrap" }}>{toLocale(l.timestamp)}</td>
                    <td>{l.userName || l.userEmail || "-"}</td>
                    <td>{l.userRole || "-"}</td>
                    <td>{l.schoolName || l.schoolId || "-"}</td>
                    <td>{l.action || "-"}</td>
                    <td>{l.target || "-"}</td>
                    <td style={{ fontSize: ".97em", maxWidth: 420, wordBreak: "break-word" }}>
                      {l.details || ""}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "1.4em", color: "#789" }}>
                    No logs found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info / Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "1rem", flexWrap: "wrap" }}>
          <div style={{ fontSize: ".95em", color: "#888" }}>
            Showing {Math.min(view.length, 200)} of {view.length} filtered logs
            {logs.length ? ` (loaded ${logs.length} in memory)` : ""}.
          </div>
          <div style={{ marginLeft: "auto" }}>
            <button className="btn outline" onClick={() => navigate("/superadmin-dashboard")}>
              ⬅ Dashboard
            </button>
            <button
              className="btn"
              style={{ marginLeft: 8 }}
              onClick={onLoadMore}
              disabled={loadingMore || !lastDocRef.current}
              title={!lastDocRef.current ? "All available logs loaded" : "Fetch the next page"}
            >
              {loadingMore ? "Loading…" : lastDocRef.current ? "Load More" : "No More"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}