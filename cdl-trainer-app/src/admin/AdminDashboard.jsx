import React, { useEffect, useState, useMemo } from "react";
import { db } from "../utils/firebase"; // adjust path!
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc as firestoreDoc,
  deleteDoc,
} from "firebase/firestore";
import { showToast } from "../utils/ui-helpers"; // adjust path!
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";

function daysBetween(dateStr) {
  if (!dateStr) return 99999;
  const dt = new Date(dateStr);
  if (isNaN(dt)) return 99999;
  const now = new Date();
  return Math.floor((dt - now) / (1000 * 60 * 60 * 24));
}

function expirySoon(dateStr) {
  return daysBetween(dateStr) <= 30;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({});
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [search, setSearch] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [userRole, setUserRole] = useState("admin");

  // --- Fetch current admin, users, etc ---
  useEffect(() => {
    const fetchData = async () => {
      const currentUserEmail =
        window.currentUserEmail || localStorage.getItem("currentUserEmail") || null;
      if (!currentUserEmail) {
        showToast("No user found. Please log in again.");
        if (window.handleLogout) window.handleLogout();
        navigate("/login");
        return;
      }
      // Fetch current admin
      let profile = {};
      let role = localStorage.getItem("userRole") || "admin";
      let sid = localStorage.getItem("schoolId");
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", currentUserEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          profile = snap.docs[0].data();
          role = profile.role || role;
          sid = profile.schoolId || sid;
          localStorage.setItem("userRole", role);
          if (sid) localStorage.setItem("schoolId", sid);
        }
      } catch {}
      setUserData(profile);
      setUserRole(role);
      setSchoolId(sid);
      if (role !== "admin" || !sid) {
        showToast("Access denied: Admin role and school required.");
        if (window.handleLogout) window.handleLogout();
        navigate("/login");
        return;
      }

      // Fetch all users for school
      let allUsers = [];
      try {
        const usersSnap = await getDocs(
          query(
            collection(db, "users"),
            where("schoolId", "==", sid),
            where("role", "in", ["student", "instructor", "admin"])
          )
        );
        usersSnap.forEach((docSnap) => {
          const d = docSnap.data();
          allUsers.push({
            name: d.name || "User",
            email: d.email,
            phone: d.phone || "",
            role: d.role || "student",
            assignedInstructor: d.assignedInstructor || "",
            assignedCompany: d.assignedCompany || "",
            id: docSnap.id,
            profileProgress: d.profileProgress || 0,
            permitExpiry: d.permitExpiry || "",
            medCardExpiry: d.medCardExpiry || "",
            paymentStatus: d.paymentStatus || "",
            compliance: d.compliance || "",
          });
        });
      } catch (e) {
        allUsers = [];
        showToast("Error fetching users", 2500, "error");
      }
      setUsers(allUsers);
      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line
  }, []);

  // --- Memoized derived lists for performance
  const instructorList = useMemo(
    () => users.filter((u) => u.role === "instructor"),
    [users]
  );
  const companyList = useMemo(
    () => Array.from(new Set(users.map((u) => u.assignedCompany).filter(Boolean))),
    [users]
  );
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (companyFilter && u.assignedCompany !== companyFilter) return false;
      const q = search.trim().toLowerCase();
      if (
        q &&
        !(
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
        )
      )
        return false;
      return true;
    });
  }, [users, roleFilter, companyFilter, search]);

  // --- Metrics
  const studentCount = users.filter((u) => u.role === "student").length;
  const instructorCount = users.filter((u) => u.role === "instructor").length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const permitSoon = users.filter((u) => expirySoon(u.permitExpiry)).length;
  const medSoon = users.filter((u) => expirySoon(u.medCardExpiry)).length;
  const incomplete = users.filter((u) => u.profileProgress < 80).length;

  // --- Inline edit handlers
  const updateUser = async (email, changes) => {
    try {
      await setDoc(
        firestoreDoc(db, "users", email),
        { ...changes, schoolId },
        { merge: true }
      );
      if (changes.role) {
        await setDoc(
          firestoreDoc(db, "userRoles", email),
          { role: changes.role, schoolId },
          { merge: true }
        );
      }
      showToast(`Updated user: ${email}`);
      setUsers((prev) =>
        prev.map((u) => (u.email === email ? { ...u, ...changes } : u))
      );
    } catch (err) {
      showToast("Failed to update user.");
    }
  };
  const removeUser = async (email) => {
    if (!window.confirm(`Remove user: ${email}? This cannot be undone.`)) return;
    try {
      await deleteDoc(firestoreDoc(db, "users", email));
      await deleteDoc(firestoreDoc(db, "userRoles", email));
      showToast(`User ${email} removed`);
      setUsers((prev) => prev.filter((u) => u.email !== email));
    } catch (err) {
      showToast("Failed to remove user.");
    }
  };

  // --- Export helpers
  function exportUsersToCSV(list, filename = "users") {
    if (!list.length) return showToast("No users to export.");
    const headers = Object.keys(list[0]);
    const csv = [
      headers.join(","),
      ...list.map((u) =>
        headers
          .map((h) => `"${(u[h] ?? "").toString().replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  async function exportUsersToPDF(list) {
    if (!list.length) return showToast("No users to export.");
    const docPdf = new jsPDF();
    docPdf.setFontSize(14);
    docPdf.text("Users List", 10, 16);
    const headers = Object.keys(list[0]);
    let y = 25;
    docPdf.setFontSize(10);
    docPdf.text(headers.join(" | "), 10, y);
    y += 7;
    list.forEach((u) => {
      docPdf.text(headers.map((h) => u[h] ?? "").join(" | "), 10, y);
      y += 6;
      if (y > 280) {
        docPdf.addPage();
        y = 15;
      }
    });
    docPdf.save(`users-export-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading admin dashboard…</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard" style={{ marginBottom: "4em" }}>
      <button
        className="btn"
        style={{ marginBottom: "1.2rem", maxWidth: 260 }}
        onClick={() => navigate("/admin-profile")}
      >
        👤 View/Edit My Profile
      </button>
      <div style={{ display: "flex", gap: "1.5em", flexWrap: "wrap", marginBottom: "2em" }}>
        <div className="dashboard-card" style={{ minWidth: 190 }}>
          <b>👨‍🎓 Students:</b> <span>{studentCount}</span>
        </div>
        <div className="dashboard-card" style={{ minWidth: 190 }}>
          <b>👨‍🏫 Instructors:</b> <span>{instructorCount}</span>
        </div>
        <div className="dashboard-card" style={{ minWidth: 190 }}>
          <b>📝 Incomplete Profiles:</b> <span>{incomplete}</span>
        </div>
        <div className="dashboard-card warn" style={{ minWidth: 190, background: "#fff5f5" }}>
          <b>🚨 Permit Expiring Soon:</b> <span>{permitSoon}</span>
        </div>
        <div className="dashboard-card warn" style={{ minWidth: 190, background: "#fff5f5" }}>
          <b>🚨 Med Card Expiring Soon:</b> <span>{medSoon}</span>
        </div>
      </div>
      {/* User Table & Filters */}
      <div className="dashboard-card">
        <h3>👥 Manage Users</h3>
        <div style={{ marginBottom: "1em", display: "flex", gap: "1em" }}>
          <label>
            Filter by Role:{" "}
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All</option>
              <option value="student">Students</option>
              <option value="instructor">Instructors</option>
              <option value="admin">Admins</option>
            </select>
          </label>
          <label>
            Company:{" "}
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
              <option value="">All</option>
              {companyList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <input
            type="text"
            placeholder="Search by name/email"
            style={{ flex: 1, minWidth: 140, padding: "6px 11px", borderRadius: 7, border: "1px solid #ddd" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn outline" type="button" onClick={() => exportUsersToCSV(filteredUsers)}>
            Export CSV
          </button>
          <button className="btn outline" type="button" onClick={() => exportUsersToPDF(filteredUsers)}>
            Export PDF
          </button>
          <button
            className="btn outline"
            style={{ color: "#c80" }}
            type="button"
            onClick={() =>
              exportUsersToCSV(filteredUsers.filter((u) => expirySoon(u.permitExpiry)), "permit-expiring")
            }
          >
            Export Expiring Permits
          </button>
        </div>
        <div className="user-table-scroll">
          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Company</th>
                <th>Assigned Instructor</th>
                <th>Profile %</th>
                <th>Permit Exp.</th>
                <th>MedCard Exp.</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.email} className={expirySoon(user.permitExpiry) ? "row-warn" : ""}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => updateUser(user.email, { role: e.target.value })}
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={user.assignedCompany}
                      onChange={(e) => updateUser(user.email, { assignedCompany: e.target.value })}
                      placeholder="(Company)"
                      style={{ width: 100 }}
                    />
                  </td>
                  <td>
                    <select
                      value={user.assignedInstructor}
                      onChange={(e) => updateUser(user.email, { assignedInstructor: e.target.value })}
                    >
                      <option value="">(None)</option>
                      {instructorList.map((inst) => (
                        <option key={inst.email} value={inst.email}>
                          {inst.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{user.profileProgress || 0}%</td>
                  <td style={{ color: expirySoon(user.permitExpiry) ? "#b10" : undefined }}>
                    {user.permitExpiry || ""}
                  </td>
                  <td style={{ color: expirySoon(user.medCardExpiry) ? "#b10" : undefined }}>
                    {user.medCardExpiry || ""}
                  </td>
                  <td>{user.paymentStatus || ""}</td>
                  <td>
                    <button className="btn outline" onClick={() => removeUser(user.email)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center" }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="dashboard-card">
        <h3>🏢 Manage Companies</h3>
        <p>Create, edit, and view all companies who send students to your school.</p>
        <button className="btn wide" style={{ marginTop: 10 }} onClick={() => navigate("/admin-companies")}>
          Open Companies Page
        </button>
      </div>
      <div className="dashboard-card">
        <h3>📝 Reports & Batch Messaging</h3>
        <p>
          Download user data, filter for missing docs, and message all students or instructors with one click.
          <br />
          <em>(Coming soon: Download/export, batch reminders, activity logs...)</em>
        </p>
        <button className="btn wide" style={{ marginTop: 10 }} onClick={() => navigate("/admin-reports")}>
          Open Reports Page
        </button>
      </div>
    </div>
  );
}
