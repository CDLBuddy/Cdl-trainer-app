// src/superadmin/SuperAdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Firebase
import { db } from "../utils/firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

// UI helpers
import { showToast } from "../utils/ui-helpers";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({});
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [stats, setStats] = useState({
    schools: 0,
    users: 0,
    complianceAlerts: 0,
  });

  // ===== Lifecycle: Fetch Data =====
  useEffect(() => {
    async function fetchData() {
      try {
        // --- Role guard ---
        const role =
          localStorage.getItem("userRole") ||
          window.currentUserRole ||
          "";
        if (role !== "superadmin") {
          showToast("Access denied: Super Admins only.");
          if (window.handleLogout) window.handleLogout();
          navigate("/login");
          return;
        }

        // --- Current user email ---
        const email =
          localStorage.getItem("currentUserEmail") ||
          window.currentUserEmail ||
          "";
        setCurrentUserEmail(email);

        // --- Fetch profile ---
        if (email) {
          try {
            const usersQuery = query(
              collection(db, "users"),
              where("email", "==", email)
            );
            const snap = await getDocs(usersQuery);
            if (!snap.empty) {
              setUserData(snap.docs[0].data());
            }
          } catch (err) {
            console.error("Error fetching user data:", err);
          }
        }

        // --- Fetch stats ---
        try {
          const schoolsSnap = await getDocs(collection(db, "schools"));
          const usersSnap = await getDocs(collection(db, "users"));
          const alertsQuery = query(
            collection(db, "complianceAlerts"),
            where("resolved", "==", false)
          );
          const alertsSnap = await getDocs(alertsQuery);

          setStats({
            schools: schoolsSnap.size,
            users: usersSnap.size,
            complianceAlerts: alertsSnap.size,
          });
        } catch (err) {
          console.error("Error fetching stats:", err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // ===== Loading state =====
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" aria-label="Loading" />
        <p>Loading Super Admin Dashboard…</p>
      </div>
    );
  }

  // ===== Main render =====
  return (
    <div className="superadmin-page container">
      {/* Header */}
      <h2 className="dash-head">
        🏆 Super Admin Panel{" "}
        <span className="role-badge superadmin">Super Admin</span>
      </h2>

      {/* Stats bar */}
      <div className="stats-bar">
        <span>🏫 Schools: <b>{stats.schools}</b></span>
        <span>👤 Users: <b>{stats.users}</b></span>
        <span className="danger-text">
          🛡️ Compliance Alerts: <b>{stats.complianceAlerts}</b>
        </span>
      </div>

      {/* Profile card */}
      <div className="dashboard-card superadmin-profile">
        {userData.profilePicUrl ? (
          <img
            src={userData.profilePicUrl}
            alt="Profile"
            className="profile-pic"
          />
        ) : (
          <div className="profile-pic placeholder">SA</div>
        )}
        <div>
          <strong>Name:</strong> {userData.name || "Super Admin"}
          <br />
          <strong>Email:</strong> {currentUserEmail || ""}
        </div>
      </div>

      {/* Grid */}
      <div className="dash-layout">
        <SuperAdminCard
          title="🏫 School Management"
          desc="Create, edit, view, or remove CDL training schools. Manage TPR IDs, locations, and compliance status."
          btn="Manage Schools"
          nav="/superadmin-schools"
        />
        <SuperAdminCard
          title="👤 User Management"
          desc="Add, remove, or modify instructor, admin, and student accounts. Set roles, reset passwords, or assign users."
          btn="Manage Users"
          nav="/superadmin-users"
        />
        <SuperAdminCard
          title="🛡️ Compliance Center"
          desc="Audit schools and users for ELDT and FMCSA/State compliance. Generate reports or upload documentation."
          btn="Compliance Center"
          nav="/superadmin-compliance"
        />
        <SuperAdminCard
          title="💳 Billing & Licensing"
          desc="View or manage school billing info, subscriptions, and license renewals."
          btn="Billing & Licensing"
          nav="/superadmin-billing"
        />
        <SuperAdminCard
          title="⚙️ Platform Settings"
          desc="Configure system-wide settings, defaults, and advanced options."
          btn="Platform Settings"
          nav="/superadmin-settings"
        />
        <SuperAdminCard
          title="🪵 Audit Logs"
          desc="View platform activity logs, user actions, and system events."
          btn="View Logs"
          nav="/superadmin-logs"
        />
      </div>
    </div>
  );
}

// ===== Reusable card =====
function SuperAdminCard({ title, desc, btn, nav }) {
  const navigate = useNavigate();
  return (
    <div className="dashboard-card feature-card">
      <h3>{title}</h3>
      <p>{desc}</p>
      <button
        className="btn wide"
        onClick={() => navigate(nav)}
        aria-label={btn}
      >
        {btn}
      </button>
    </div>
  );
}