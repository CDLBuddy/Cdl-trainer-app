import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../utils/firebase"; // Adjust paths!
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getNextChecklistAlert, showToast } from "../../utils/ui-helpers"; // Adjust paths!

function getCurrentUserEmail() {
  return (
    window.currentUserEmail ||
    localStorage.getItem("currentUserEmail") ||
    (auth.currentUser && auth.currentUser.email) ||
    null
  );
}

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({});
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [testResultsByStudent, setTestResultsByStudent] = useState({});

  useEffect(() => {
    const fetchDashboardData = async () => {
      const email = getCurrentUserEmail();
      if (!email) {
        showToast("No user found. Please log in again.", 3500, "error");
        navigate("/login");
        return;
      }
      // 1. Instructor Profile & Role
      let profile = {};
      let userRole = "instructor";
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          profile = snap.docs[0].data();
          userRole = profile.role || "instructor";
          localStorage.setItem("userRole", userRole);
        }
      } catch (e) {
        profile = {};
      }
      if (userRole !== "instructor") {
        showToast("Access denied: Instructor dashboard only.", 4000, "error");
        navigate("/login");
        return;
      }
      setUserData(profile);

      // 2. Assigned Students
      let students = [];
      try {
        const assignSnap = await getDocs(
          query(collection(db, "users"), where("assignedInstructor", "==", email))
        );
        assignSnap.forEach((doc) => {
          const d = doc.data();
          students.push({
            name: d.name || "Student",
            email: d.email,
            cdlClass: d.cdlClass || "Not set",
            experience: d.experience || "Unknown",
            cdlPermit: d.cdlPermit || "no",
            permitPhotoUrl: d.permitPhotoUrl || "",
            medicalCardUrl: d.medicalCardUrl || "",
            profileProgress: d.profileProgress || 0,
            checklistAlerts: getNextChecklistAlert(d),
            id: doc.id,
          });
        });
      } catch (e) {
        students = [];
        showToast("Error fetching assigned students.", 3500, "error");
        console.error("Assigned students fetch error", e);
      }
      setAssignedStudents(students);

      // 3. Latest Test Results by Student
      let results = {};
      try {
        for (const student of students) {
          const testsSnap = await getDocs(
            query(collection(db, "testResults"), where("studentId", "==", student.email))
          );
          let latest = null;
          testsSnap.forEach((doc) => {
            const t = doc.data();
            const tTime = t.timestamp?.toDate?.() || new Date(t.timestamp) || new Date(0);
            const lTime = latest?.timestamp?.toDate?.() || new Date(latest?.timestamp) || new Date(0);
            if (!latest || tTime > lTime) latest = t;
          });
          if (latest) {
            results[student.email] = {
              testName: latest.testName,
              pct: Math.round((latest.correct / latest.total) * 100),
              date: latest.timestamp?.toDate
                ? latest.timestamp.toDate().toLocaleDateString()
                : new Date(latest.timestamp).toLocaleDateString(),
            };
          }
        }
      } catch (e) {
        results = {};
        showToast("Error fetching test results.", 3200, "error");
        console.error("Instructor test results error", e);
      }
      setTestResultsByStudent(results);
      setLoading(false);
    };
    fetchDashboardData();
    // eslint-disable-next-line
  }, []);

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      "Name",
      "Email",
      "CDL Class",
      "Experience",
      "Permit",
      "Med Card",
      "Profile Completion",
      "Checklist Alerts",
      "Last Test",
    ];
    const rows = assignedStudents.map((s) => [
      `"${s.name}"`,
      `"${s.email}"`,
      `"${s.cdlClass}"`,
      `"${s.experience}"`,
      `"${s.cdlPermit === "yes" && s.permitPhotoUrl ? "Uploaded" : "Not Uploaded"}"`,
      `"${s.medicalCardUrl ? "Uploaded" : "Not Uploaded"}"`,
      `"${s.profileProgress}%"`,
      `"${s.checklistAlerts.replace(/"/g, "'")}"`,
      `${
        testResultsByStudent[s.email]
          ? testResultsByStudent[s.email].testName +
            " - " +
            testResultsByStudent[s.email].pct +
            "% on " +
            testResultsByStudent[s.email].date
          : "No recent test"
      }"`,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "assigned-students.csv";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 300);
    showToast("CSV export downloaded.", 2600, "success");
  };

  // Student Navigation
  const handleViewStudentProfile = (studentEmail) => {
    navigate(`/instructor/student/${encodeURIComponent(studentEmail)}`);
  };
  const handleReviewChecklist = (studentEmail) => {
    navigate(`/instructor/checklist/${encodeURIComponent(studentEmail)}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading instructor dashboard…</p>
      </div>
    );
  }

  return (
    <div className="instructor-dashboard page-content">
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <button className="btn" style={{ maxWidth: 260 }}
          onClick={() => navigate("/instructor-profile")}
        >
          👤 View/Edit My Profile
        </button>
        <button className="btn outline" onClick={handleExportCSV}>
          ⬇️ Export CSV
        </button>
      </div>

      <div className="dashboard-card">
        <h3>📋 Assigned Students</h3>
        {assignedStudents.length === 0 ? (
          <p>No students assigned to you yet.</p>
        ) : (
          <div className="assigned-students-list">
            {assignedStudents.map((student) => (
              <div className="student-list-card" key={student.email}>
                <strong className="student-name"
                  style={{ cursor: "pointer", color: "var(--accent)" }}
                  onClick={() => handleViewStudentProfile(student.email)}
                  tabIndex={0}
                >
                  {student.name}
                </strong>
                <div>Email: {student.email}</div>
                <div>CDL Class: {student.cdlClass}</div>
                <div>Experience: {student.experience}</div>
                <div>
                  Permit:{" "}
                  {student.cdlPermit === "yes" && student.permitPhotoUrl
                    ? "✔️ Uploaded"
                    : "❌ Not Uploaded"}
                </div>
                <div>
                  Med Card:{" "}
                  {student.medicalCardUrl ? "✔️ Uploaded" : "❌ Not Uploaded"}
                </div>
                <div>
                  Profile Completion:
                  <div className="progress-bar" style={{
                      width: 120, display: "inline-block", marginLeft: 5,
                    }}>
                    <div className="progress"
                      style={{ width: `${student.profileProgress}%` }}>
                    </div>
                  </div>
                  <span style={{ fontSize: ".95em" }}>
                    {student.profileProgress}%
                  </span>
                </div>
                <div style={{ color: "#f47373", minHeight: 20 }}>
                  {student.checklistAlerts !== "All required steps complete! 🎉" ? (
                    <>⚠️ {student.checklistAlerts}</>
                  ) : (
                    <span style={{ color: "#56b870" }}>
                      ✔️ All requirements met
                    </span>
                  )}
                </div>
                <div>
                  Last Test:{" "}
                  {testResultsByStudent[student.email]
                    ? `${testResultsByStudent[student.email].testName} – ${testResultsByStudent[student.email].pct}% on ${testResultsByStudent[student.email].date}`
                    : "No recent test"}
                </div>
                <button className="btn"
                  onClick={() => handleViewStudentProfile(student.email)}
                  style={{ marginTop: 6, marginRight: 6 }}>
                  View Profile
                </button>
                <button className="btn outline"
                  onClick={() => handleReviewChecklist(student.email)}
                  style={{ marginTop: 6 }}>
                  Review Checklist
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-card">
        <h3>✅ Review Checklists</h3>
        <p>Sign off on student milestones (permit, walkthrough, etc).</p>
        <p>Select a student above and click "Review Checklist".</p>
      </div>
      <div className="dashboard-card">
        <h3>🧾 Student Test Results</h3>
        <p>
          See latest practice and official test results for your assigned students above.
        </p>
      </div>
    </div>
  );
}
