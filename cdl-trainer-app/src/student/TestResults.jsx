import React, { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import {
  getDocs,
  query,
  collection,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { showToast } from "../utils/ui-helpers";

// Util: fetch students if staff
async function fetchAllStudents() {
  const userSnap = await getDocs(
    query(collection(db, "users"), where("role", "==", "student"))
  );
  const students = {};
  userSnap.docs.forEach((doc) => {
    students[doc.data().email] = doc.data();
  });
  return students;
}

// Util: fetch all test results for given emails
async function fetchTestResults(emails) {
  let allResults = [];
  for (const email of emails) {
    const snap = await getDocs(
      query(collection(db, "testResults"), where("studentId", "==", email))
    );
    snap.docs.forEach((d) => {
      const data = d.data();
      const ts = data.timestamp;
      const date = ts?.toDate ? ts.toDate() : new Date(ts);
      allResults.push({ ...data, timestamp: date, studentId: email });
    });
  }
  // Sort descending by date
  return allResults.sort((a, b) => b.timestamp - a.timestamp);
}

// Modal for staff: view student details
function StudentDetailsModal({ email, onClose }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    async function fetchProfile() {
      const snap = await getDocs(
        query(collection(db, "users"), where("email", "==", email))
      );
      if (snap.empty) setProfile(null);
      else setProfile(snap.docs[0].data());
    }
    fetchProfile();
  }, [email]);

  return (
    <div className="modal-overlay fade-in" tabIndex={-1} style={{ zIndex: 1200 }}>
      <div className="modal-card glass" style={{ maxWidth: 460, margin: "40px auto" }}>
        <button
          className="modal-close"
          style={{ float: "right", fontSize: "1.7em" }}
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <div className="student-modal-content" style={{ padding: 18 }}>
          {!profile ? (
            <h3>Loading…</h3>
          ) : (
            <>
              <h3>
                {profile.name || "(No Name)"}{" "}
                <span className="role-badge">{profile.role || ""}</span>
              </h3>
              <div style={{ color: "#999", marginBottom: 7, fontSize: "0.98em" }}>{email}</div>
              <ul className="profile-fields" style={{ listStyle: "none", padding: "0 0 7px 0" }}>
                <li>
                  <strong>DOB:</strong> {profile.dob || "--"}
                </li>
                <li>
                  <strong>Permit Status:</strong>{" "}
                  {profile.cdlPermit === "yes"
                    ? "✅ Yes"
                    : profile.cdlPermit === "no"
                    ? "❌ No"
                    : "--"}
                </li>
                <li>
                  <strong>Profile Progress:</strong> {profile.profileProgress || 0}%
                </li>
                <li>
                  <strong>Endorsements:</strong>{" "}
                  {(profile.endorsements || []).join(", ") || "--"}
                </li>
                <li>
                  <strong>Restrictions:</strong>{" "}
                  {(profile.restrictions || []).join(", ") || "--"}
                </li>
                <li>
                  <strong>Experience:</strong> {profile.experience || "--"}
                </li>
                <li>
                  <strong>Vehicle Qualified:</strong>{" "}
                  {profile.vehicleQualified === "yes" ? "✅" : "❌"}
                </li>
              </ul>
              <div style={{ marginTop: 8 }}>
                {profile.profilePicUrl ? (
                  <img
                    src={profile.profilePicUrl}
                    alt="Profile"
                    style={{
                      width: 90,
                      height: 90,
                      objectFit: "cover",
                      borderRadius: 10,
                      border: "1.5px solid #b48aff",
                      marginBottom: 7,
                    }}
                  />
                ) : null}
              </div>
              <div style={{ marginTop: 10, textAlign: "center" }}>
                <button className="btn" style={{ marginTop: 9 }} onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const getCurrentUserEmail = () =>
  window.currentUserEmail ||
  localStorage.getItem("currentUserEmail") ||
  (window.auth?.currentUser && window.auth.currentUser.email) ||
  null;

const getRole = () =>
  localStorage.getItem("userRole") || "student";

const TestResults = () => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalEmail, setModalEmail] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const email = getCurrentUserEmail();
      const role = getRole();
      let isStaff =
        role === "admin" ||
        role === "instructor" ||
        role === "superadmin";
      let studentEmails = [email];
      let studentMap = {};
      if (!email) {
        setLoading(false);
        setResults([]);
        setStudents({});
        return;
      }

      if (isStaff) {
        // For now, fetch all students (filter for assigned later)
        studentMap = await fetchAllStudents();
        studentEmails = Object.keys(studentMap);
      }
      const allResults = await fetchTestResults(studentEmails);
      setStudents(studentMap);
      setResults(allResults);
      setLoading(false);
    }
    fetchData();
  }, []);

  const role = getRole();
  const isStaff =
    role === "admin" ||
    role === "instructor" ||
    role === "superadmin";

  function handleExportCSV() {
    const rows = [
      ["Name", "Email", "Test", "Score", "Date"],
      ...results.map((r) => {
        const name = students[r.studentId]?.name || r.studentId || "Unknown";
        const pct = Math.round((r.correct / r.total) * 100);
        const date = r.timestamp.toLocaleDateString();
        return [
          name,
          r.studentId,
          r.testName,
          `${pct}% (${r.correct}/${r.total})`,
          date,
        ];
      }),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows
        .map((e) =>
          e.map((s) => `"${String(s).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");
    const a = document.createElement("a");
    a.href = csvContent;
    a.download = "cdl-test-results.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (!getCurrentUserEmail()) {
    return (
      <div className="screen-wrapper fade-in" style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
        <h2>📊 Student Test Results</h2>
        <p>You must be logged in to view this page.</p>
      </div>
    );
  }

  return (
    <div className="screen-wrapper fade-in" style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <h2>📊 {isStaff ? "All Student " : ""}Test Results</h2>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <table className="test-results-table" style={{ width: "100%", marginBottom: 12 }}>
            <thead>
              <tr>
                {isStaff && <th>Name</th>}
                <th>Test</th>
                <th>Score</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={isStaff ? 4 : 3}>No test results found.</td>
                </tr>
              ) : (
                results.map((r, i) => {
                  const pct = Math.round((r.correct / r.total) * 100);
                  const date = r.timestamp.toLocaleDateString();
                  return (
                    <tr key={i}>
                      {isStaff && (
                        <td>
                          <a
                            href="#!"
                            className="student-name-link"
                            style={{
                              color: "#b48aff",
                              fontWeight: 600,
                              textDecoration: "underline dotted",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setModalEmail(r.studentId);
                              setShowModal(true);
                            }}
                          >
                            {students[r.studentId]?.name || r.studentId || "Unknown"}
                          </a>
                        </td>
                      )}
                      <td>{r.testName}</td>
                      <td>
                        <b>{pct}%</b> <span style={{ color: "#888" }}>
                          ({r.correct}/{r.total})
                        </span>
                      </td>
                      <td>{date}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <div style={{ textAlign: "center", marginTop: 18 }}>
            <button
              className="btn outline"
              style={{ marginRight: 8 }}
              onClick={() =>
                navigate(
                  isStaff
                    ? role === "admin"
                      ? "/admin-dashboard"
                      : role === "instructor"
                      ? "/instructor-dashboard"
                      : role === "superadmin"
                      ? "/superadmin-dashboard"
                      : "/student-dashboard"
                    : "/student-dashboard"
                )
              }
            >
              ⬅ Back to Dashboard
            </button>
            <button
              className="btn"
              onClick={() =>
                navigate(
                  isStaff
                    ? role === "admin"
                      ? "/admin-dashboard"
                      : role === "instructor"
                      ? "/instructor-dashboard"
                      : role === "superadmin"
                      ? "/superadmin-dashboard"
                      : "/student-practice-tests"
                    : "/student-practice-tests"
                )
              }
            >
              🔄 Retake a Test
            </button>
            {isStaff && (
              <button className="btn" onClick={handleExportCSV}>
                ⬇️ Export CSV
              </button>
            )}
          </div>
        </>
      )}
      {showModal && modalEmail && (
        <StudentDetailsModal email={modalEmail} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
};

export default TestResults;
