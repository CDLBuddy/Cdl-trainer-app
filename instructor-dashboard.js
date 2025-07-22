// ─── INSTRUCTOR DASHBOARD ────────────────────────────────────────────────
async function renderInstructorDashboard(container = document.getElementById("app")) {
  if (!container) return;
  if (!currentUserEmail) {
    showToast("No user found. Please log in again.");
    renderWelcome();
    return;
  }

  // Defensive role fallback
  let userData = {};
  let userRole = localStorage.getItem("userRole") || "instructor";
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || userRole || "instructor";
      localStorage.setItem("userRole", userRole);
    }
  } catch (e) {
    userData = {};
  }
  if (userRole !== "instructor") {
    showToast("Access denied: Instructor role required.");
    renderDashboard();
    return;
  }

  // ---- Fetch Assigned Students (admin-appoints these) ----
  let assignedStudents = [];
  try {
    const assignSnap = await getDocs(
      query(collection(db, "users"), where("assignedInstructor", "==", currentUserEmail))
    );
    assignSnap.forEach(doc => {
      const d = doc.data();
      assignedStudents.push({
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
    assignedStudents = [];
    console.error("Assigned students fetch error", e);
  }

  // ---- Fetch Latest Test Results for Assigned Students ----
  let testResultsByStudent = {};
  try {
    for (const student of assignedStudents) {
      const testsSnap = await getDocs(
        query(collection(db, "testResults"), where("studentId", "==", student.email))
      );
      let latest = null;
      testsSnap.forEach(doc => {
        const t = doc.data();
        if (
          !latest ||
          (t.timestamp?.toDate
            ? t.timestamp.toDate()
            : new Date(t.timestamp)) >
            (latest?.timestamp?.toDate
              ? latest.timestamp.toDate()
              : new Date(latest?.timestamp))
        ) {
          latest = t;
        }
      });
      if (latest) {
        testResultsByStudent[student.email] = {
          testName: latest.testName,
          pct: Math.round((latest.correct / latest.total) * 100),
          date: latest.timestamp?.toDate
            ? latest.timestamp.toDate().toLocaleDateString()
            : new Date(latest.timestamp).toLocaleDateString(),
        };
      }
    }
  } catch (e) {
    testResultsByStudent = {};
    console.error("Instructor test results error", e);
  }

  // ---- Render Instructor Dashboard Layout ----
  container.innerHTML = `
    <h2 class="dash-head">Welcome, Instructor! <span class="role-badge instructor">Instructor</span></h2>
    <button class="btn" id="edit-instructor-profile-btn" style="margin-bottom:1.2rem;max-width:260px;">👤 View/Edit My Profile</button>
    <div class="dash-layout">
      <section class="dash-metrics">
        <div class="dashboard-card">
          <h3>📋 Assigned Students</h3>
          ${
            assignedStudents.length === 0
              ? `<p>No students assigned to you yet.</p>`
              : `<div class="assigned-students-list">
                  ${assignedStudents
                    .map(
                      (student) => `
                      <div class="student-list-card">
                        <strong>${student.name}</strong>
                        <div>Email: ${student.email}</div>
                        <div>CDL Class: ${student.cdlClass}</div>
                        <div>Experience: ${student.experience}</div>
                        <div>Permit: ${student.cdlPermit === "yes" && student.permitPhotoUrl ? "✔️ Uploaded" : "❌ Not Uploaded"}</div>
                        <div>Med Card: ${student.medicalCardUrl ? "✔️ Uploaded" : "❌ Not Uploaded"}</div>
                        <div>
                          Profile Completion:
                          <div class="progress-bar" style="width:120px;display:inline-block;">
                            <div class="progress" style="width:${student.profileProgress}%;"></div>
                          </div>
                          <span style="font-size:.95em;">${student.profileProgress}%</span>
                        </div>
                        <div style="color:#f47373;min-height:20px;">
                          ${student.checklistAlerts !== "All required steps complete! 🎉"
                            ? `⚠️ ${student.checklistAlerts}`
                            : `<span style="color:#56b870">✔️ All requirements met</span>`}
                        </div>
                        <div>
                          Last Test: ${
                            testResultsByStudent[student.email]
                              ? `${testResultsByStudent[student.email].testName} – ${testResultsByStudent[student.email].pct}% on ${testResultsByStudent[student.email].date}`
                              : "No recent test"
                          }
                        </div>
                        <button class="btn" data-student="${student.email}" data-nav="viewStudentProfile">View Profile</button>
                        <button class="btn outline" data-student="${student.email}" data-nav="reviewChecklist">Review Checklist</button>
                      </div>
                    `
                    )
                    .join("")}
                </div>`
          }
        </div>
        <div class="dashboard-card">
          <h3>✅ Review Checklists</h3>
          <p>Sign off on student milestones (permit, walkthrough, etc).</p>
          <p>Select a student above and click "Review Checklist".</p>
        </div>
        <div class="dashboard-card">
          <h3>🧾 Student Test Results</h3>
          <p>See latest practice and official test results for your assigned students above.</p>
        </div>
      </section>
      <button class="rail-btn logout wide-logout" id="logout-btn" aria-label="Logout">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="12" height="16" rx="2" stroke="#ff8080" stroke-width="2"/>
          <path d="M17 15l4-3-4-3m4 3H10" stroke="#ff8080" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="label">Logout</span>
      </button>
    </div>
  `;

  setupNavigation();

  // View/Edit My Profile button
  document.getElementById("edit-instructor-profile-btn")?.addEventListener("click", () => {
    renderInstructorProfile();
  });

  // Handle logout
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.clear();
    renderWelcome();
  });

  // View Student Profile modal
  container.querySelectorAll('button[data-nav="viewStudentProfile"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const studentEmail = btn.getAttribute("data-student");
      renderStudentProfileForInstructor(studentEmail);
    });
  });

  // Checklist Review modal
  container.querySelectorAll('button[data-nav="reviewChecklist"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const studentEmail = btn.getAttribute("data-student");
      renderChecklistReviewForInstructor(studentEmail);
    });
  });
}