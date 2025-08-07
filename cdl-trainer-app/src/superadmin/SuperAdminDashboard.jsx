// src/superadmin/SuperAdminDashboard.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../utils/firebase"; // adjust if needed!
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { showToast } from "../utils/ui-helpers"; // adjust if needed

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

  // --- Role Guard, User Fetch, and Stats Fetch ---
  useEffect(() => {
    async function fetchData() {
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
      const email =
        localStorage.getItem("currentUserEmail") ||
        window.currentUserEmail ||
        "";
      setCurrentUserEmail(email);

      // User Data
      let user = {};
      try {
        const usersQuery = query(
          collection(db, "users"),
          where("email", "==", email)
        );
        const snap = await getDocs(usersQuery);
        if (!snap.empty) user = snap.docs[0].data();
      } catch {
        user = {};
      }
      setUserData(user);

      // Stats
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
      } catch {
        setStats({ schools: 0, users: 0, complianceAlerts: 0 });
      }
      setLoading(false);
    }
    fetchData();
    // eslint-disable-next-line
  }, []);

  // --- Loading state ---
  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading super admin dashboard…</p>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="superadmin-page" style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2 className="dash-head" style={{ marginTop: "1.4em" }}>
        🏆 Super Admin Panel{" "}
        <span className="role-badge superadmin">Super Admin</span>
      </h2>
      <div
        className="superadmin-stats-bar"
        style={{
          display: "flex",
          gap: "2.4em",
          marginBottom: "1.1em",
          fontWeight: 600,
        }}
      >
        <span>
          🏫 Schools: <b>{stats.schools}</b>
        </span>
        <span>
          👤 Users: <b>{stats.users}</b>
        </span>
        <span style={{ color: "#ff5e5e" }}>
          🛡️ Compliance Alerts: <b>{stats.complianceAlerts}</b>
        </span>
      </div>
      <div
        className="dashboard-card superadmin-profile"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2.4em",
        }}
      >
        {userData.profilePicUrl && (
          <img
            src={userData.profilePicUrl}
            alt="Profile"
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2.5px solid #b48aff",
            }}
          />
        )}
        <div>
          <strong>Name:</strong> {userData.name || "Super Admin"}
          <br />
          <strong>Email:</strong> {currentUserEmail || ""}
        </div>
      </div>
      <div
        className="dash-layout superadmin-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          gap: "2.4em",
          marginTop: "2em",
        }}
      >
        <SuperAdminCard
          title="🏫 School Management"
          desc="Create, edit, view, or remove CDL training schools. Manage TPR IDs, locations, and compliance status for each site."
          btn="Manage Schools"
          nav="/superadmin-schools"
        />
        <SuperAdminCard
          title="👤 User Management"
          desc="Add, remove, or modify instructor, admin, and student accounts. Set roles, reset passwords, or assign users to schools."
          btn="Manage Users"
          nav="/superadmin-users"
        />
        <SuperAdminCard
          title="🛡️ Compliance Center"
          desc="Audit schools and users for ELDT and FMCSA/State compliance. Generate compliance reports or upload supporting documentation."
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
          desc="View platform activity logs, user actions, and system events for security or troubleshooting."
          btn="View Logs"
          nav="/superadmin-logs"
        />
      </div>
    </div>
  );
}

// --- Card Component for DRY grid ---
function SuperAdminCard({ title, desc, btn, nav }) {
  const navigate = useNavigate();
  return (
    <div className="dashboard-card feature-card">
      <h3>{title}</h3>
      <p>{desc}</p>
      <button className="btn wide" onClick={() => navigate(nav)}>
        {btn}
      </button>
    </div>
  );
}