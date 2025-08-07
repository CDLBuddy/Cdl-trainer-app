import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../utils/firebase"; // Adjust path!
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { showToast } from "../utils/ui-helpers"; // Adjust path!

function SuperAdminDashboard() {
  const navigate = useNavigate();

  // Role & user state
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({});
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [stats, setStats] = useState({
    schools: 0,
    users: 0,
    complianceAlerts: 0,
  });

  // ---- Role/auth check and stats fetch
  useEffect(() => {
    const checkAndFetch = async () => {
      const role =
        localStorage.getItem("userRole") || window.currentUserRole || "";
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

      // Fetch superadmin info
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

      // Fetch platform stats
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
      } catch (e) {
        setStats({ schools: 0, users: 0, complianceAlerts: 0 });
      }
      setLoading(false);
    };
    checkAndFetch();
    // eslint-disable-next-line
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading super admin dashboard…</p>
      </div>
    );
  }

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
        <span>🏫 Schools: <b>{stats.schools}</b></span>
        <span>👤 Users: <b>{stats.users}</b></span>
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
      <div className="dash-layout superadmin-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "2.4em", marginTop: "2em" }}>
        <div className="dashboard-card feature-card">
          <h3>🏫 School Management</h3>
          <p>
            Create, edit, view, or remove CDL training schools.<br />
            Manage TPR IDs, locations, and compliance status for each site.
          </p>
          <button className="btn wide" onClick={() => navigate("/superadmin-schools")}>Manage Schools</button>
        </div>
        <div className="dashboard-card feature-card">
          <h3>👤 User Management</h3>
          <p>
            Add, remove, or modify instructor, admin, and student accounts.<br />
            Set roles, reset passwords, or assign users to schools.
          </p>
          <button className="btn wide" onClick={() => navigate("/superadmin-users")}>Manage Users</button>
        </div>
        <div className="dashboard-card feature-card">
          <h3>🛡️ Compliance Center</h3>
          <p>
            Audit schools and users for ELDT and FMCSA/State compliance.<br />
            Generate compliance reports or upload supporting documentation.
          </p>
          <button className="btn wide" onClick={() => navigate("/superadmin-compliance")}>Compliance Center</button>
        </div>
        <div className="dashboard-card feature-card">
          <h3>💳 Billing & Licensing</h3>
          <p>
            View or manage school billing info, subscriptions, and license renewals.
          </p>
          <button className="btn wide" onClick={() => navigate("/superadmin-billing")}>Billing & Licensing</button>
        </div>
        <div className="dashboard-card feature-card">
          <h3>⚙️ Platform Settings</h3>
          <p>
            Configure system-wide settings, defaults, and advanced options.
          </p>
          <button className="btn wide" onClick={() => navigate("/superadmin-settings")}>Platform Settings</button>
        </div>
        <div className="dashboard-card feature-card">
          <h3>🪵 Audit Logs</h3>
          <p>
            View platform activity logs, user actions, and system events for security or troubleshooting.
          </p>
          <button className="btn wide" onClick={() => navigate("/superadmin-logs")}>View Logs</button>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
