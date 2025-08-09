// src/admin/AdminUsers.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { showToast } from "../utils/ui-helpers";
import ExportUsersControls from "./ExportUsersControls"; // ← use the new component

const roles = ["student", "instructor", "admin"];

const fetchSchoolUsers = async (schoolId) => {
  const db = getFirestore();
  // First try with assignedSchools array
  let usersSnap = await getDocs(
    query(
      collection(db, "users"),
      where("role", "in", roles),
      where("assignedSchools", "array-contains", schoolId)
    )
  );
  let schoolUsers = usersSnap.docs.map((d) => ({ ...d.data(), id: d.id }));

  // Fallback to legacy schoolId field
  if (schoolUsers.length === 0) {
    usersSnap = await getDocs(
      query(
        collection(db, "users"),
        where("role", "in", roles),
        where("schoolId", "==", schoolId)
      )
    );
    schoolUsers = usersSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
  }

  return schoolUsers;
};

const AdminUsers = ({ currentRole, adminSchoolId }) => {
  const [schoolUsers, setSchoolUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [loading, setLoading] = useState(false);

  // Load users for this admin's school
  useEffect(() => {
    if (!adminSchoolId) return;
    setLoading(true);
    fetchSchoolUsers(adminSchoolId)
      .then((users) => setSchoolUsers(users))
      .finally(() => setLoading(false));
  }, [adminSchoolId]);

  const instructorList = useMemo(
    () => schoolUsers.filter((u) => u.role === "instructor"),
    [schoolUsers]
  );

  const companyList = useMemo(
    () =>
      Array.from(new Set(schoolUsers.map((u) => u.assignedCompany).filter(Boolean))),
    [schoolUsers]
  );

  // Filters
  const filteredUsers = useMemo(() => {
    return schoolUsers.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (companyFilter && u.assignedCompany !== companyFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.assignedCompany && u.assignedCompany.toLowerCase().includes(q))
      );
    });
  }, [schoolUsers, search, roleFilter, companyFilter]);

  // Inline updates
  const handleRoleChange = async (user, newRole) => {
    const db = getFirestore();
    try {
      await setDoc(doc(db, "users", user.id), { role: newRole }, { merge: true });
      await setDoc(doc(db, "userRoles", user.id), { role: newRole }, { merge: true });
      showToast(`Role updated for ${user.email}`);
      setLoading(true);
      setSchoolUsers(await fetchSchoolUsers(adminSchoolId));
      setLoading(false);
    } catch {
      showToast("Failed to update role.");
    }
  };

  const handleCompanyChange = async (user, company) => {
    const db = getFirestore();
    try {
      await setDoc(doc(db, "users", user.id), { assignedCompany: company }, { merge: true });
      showToast(`Company assigned to ${user.email}`);
    } catch {
      showToast("Failed to assign company.");
    }
  };

  const handleInstructorChange = async (user, instructorEmail) => {
    const db = getFirestore();
    try {
      await setDoc(
        doc(db, "users", user.id),
        { assignedInstructor: instructorEmail },
        { merge: true }
      );
      showToast(`Instructor assigned to ${user.email}`);
      setLoading(true);
      setSchoolUsers(await fetchSchoolUsers(adminSchoolId));
      setLoading(false);
    } catch {
      showToast("Failed to assign instructor.");
    }
  };

  const handleRemoveUser = async (user) => {
    if (!window.confirm(`Remove user: ${user.email}? This cannot be undone.`)) return;
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, "users", user.id));
      await deleteDoc(doc(db, "userRoles", user.id));
      showToast(`User ${user.email} removed`);
      setSchoolUsers(await fetchSchoolUsers(adminSchoolId));
    } catch {
      showToast("Failed to remove user.");
    }
  };

  if (currentRole !== "admin") {
    return (
      <div className="dashboard-card" style={{ margin: "2em auto", maxWidth: 440 }}>
        <h3>Access Denied</h3>
        <p>This page is for admins only.</p>
      </div>
    );
  }

  if (!adminSchoolId) {
    return (
      <div className="screen-wrapper">
        <h2>Error: No school assigned to this admin account.</h2>
      </div>
    );
  }

  return (
    <div
      className="screen-wrapper fade-in admin-users-page"
      style={{ padding: 24, maxWidth: 1160, margin: "0 auto" }}
    >
      <h2>👥 Manage Users</h2>

      {/* Top controls: search + export */}
      <div style={{ marginBottom: "1em", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="🔍 Search users..."
          style={{ padding: "6px 14px", width: 240 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Replacement for old three buttons */}
        <ExportUsersControls users={filteredUsers} />
      </div>

      <div className="dashboard-card" style={{ marginBottom: "1.3rem" }}>
        {/* Filters */}
        <div style={{ marginBottom: "1em", display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label>
            Filter by Role:
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              <option value="">All</option>
              <option value="student">Students</option>
              <option value="instructor">Instructors</option>
              <option value="admin">Admins</option>
            </select>
          </label>

          <label>
            Company:
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              <option value="">All</option>
              {companyList.map((c) => (
                <option value={c} key={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Table */}
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
                <th>Phone</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center" }}>
                    Loading...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", color: "#789" }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  // Highlight permits expiring within 30 days
                  let expiring = {};
                  if (user.permitExpiry) {
                    const now = new Date();
                    const exp = new Date(user.permitExpiry);
                    const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                    if (days >= 0 && days <= 30) expiring = { color: "#e02", fontWeight: "bold" };
                  }

                  return (
                    <tr key={user.id || user.email}>
                      <td>{user.name || "User"}</td>
                      <td>{user.email}</td>
                      <td>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                        >
                          {roles.map((r) => (
                            <option value={r} key={r}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={user.assignedCompany || ""}
                          onChange={(e) => handleCompanyChange(user, e.target.value)}
                          placeholder="(Company)"
                          style={{ width: 120 }}
                        />
                      </td>
                      <td>
                        <select
                          value={user.assignedInstructor || ""}
                          onChange={(e) => handleInstructorChange(user, e.target.value)}
                        >
                          <option value="">(None)</option>
                          {instructorList.map((inst) => (
                            <option value={inst.email} key={inst.email}>
                              {inst.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{user.profileProgress || 0}%</td>
                      <td style={expiring}>{user.permitExpiry || ""}</td>
                      <td>{user.medCardExpiry || ""}</td>
                      <td>{user.phone || ""}</td>
                      <td>{user.paymentStatus || ""}</td>
                      <td>
                        <button
                          className="btn outline btn-remove-user"
                          onClick={() => handleRemoveUser(user)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button
        className="btn outline wide"
        style={{ marginTop: "1.3rem" }}
        onClick={() => window.history.back()}
      >
        ⬅ Back to Dashboard
      </button>
    </div>
  );
};

export default AdminUsers;
