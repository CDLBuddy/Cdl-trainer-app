// instructor/instructor-dashboard.js

import { db, auth } from '../firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { showToast, getNextChecklistAlert } from '../ui-helpers.js';
import { renderAppShell } from '../ui-shell.js';
import * as instructorPages from './index.js';

// ========== MAIN INSTRUCTOR DASHBOARD ==========
export async function renderInstructorDashboard() {
  // --- Robust user/email detection
  const currentUserEmail =
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    (auth.currentUser && auth.currentUser.email) ||
    null;

  if (!currentUserEmail) {
    showToast('No user found. Please log in again.', 3500, 'error');
    return;
  }

  // --- Fetch user profile & role
  let userData = {};
  let userRole = 'instructor';
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || 'instructor';
      localStorage.setItem('userRole', userRole);
    }
  } catch (e) {
    userData = {};
  }
  if (userRole !== 'instructor') {
    showToast('Access denied: Instructor dashboard only.', 4000, 'error');
    return;
  }

  // --- Fetch assigned students (admin-assigned only)
  let assignedStudents = [];
  try {
    const assignSnap = await getDocs(
      query(
        collection(db, 'users'),
        where('assignedInstructor', '==', currentUserEmail)
      )
    );
    assignSnap.forEach((doc) => {
      const d = doc.data();
      assignedStudents.push({
        name: d.name || 'Student',
        email: d.email,
        cdlClass: d.cdlClass || 'Not set',
        experience: d.experience || 'Unknown',
        cdlPermit: d.cdlPermit || 'no',
        permitPhotoUrl: d.permitPhotoUrl || '',
        medicalCardUrl: d.medicalCardUrl || '',
        profileProgress: d.profileProgress || 0,
        checklistAlerts: getNextChecklistAlert(d),
        id: doc.id,
      });
    });
  } catch (e) {
    assignedStudents = [];
    showToast('Error fetching assigned students.', 3500, 'error');
    console.error('Assigned students fetch error', e);
  }

  // --- Fetch latest test results per student
  let testResultsByStudent = {};
  try {
    for (const student of assignedStudents) {
      const testsSnap = await getDocs(
        query(
          collection(db, 'testResults'),
          where('studentId', '==', student.email)
        )
      );
      let latest = null;
      testsSnap.forEach((doc) => {
        const t = doc.data();
        const tTime =
          t.timestamp?.toDate?.() || new Date(t.timestamp) || new Date(0);
        const lTime =
          latest?.timestamp?.toDate?.() ||
          new Date(latest?.timestamp) ||
          new Date(0);
        if (!latest || tTime > lTime) latest = t;
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
    showToast('Error fetching test results.', 3200, 'error');
    console.error('Instructor test results error', e);
  }

  // --- Main Dashboard Content (HTML Only, No Shell)
  const mainContent = `
    <button class="btn" id="edit-instructor-profile-btn" style="margin-bottom:1.2rem;max-width:260px;">👤 View/Edit My Profile</button>
    <button class="btn outline" id="export-csv-btn" style="margin-bottom:1.2rem;margin-left:10px;">⬇️ Export CSV</button>
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
                    <strong class="student-name" style="cursor:pointer;color:var(--accent);" data-email="${student.email}">${student.name}</strong>
                    <div>Email: ${student.email}</div>
                    <div>CDL Class: ${student.cdlClass}</div>
                    <div>Experience: ${student.experience}</div>
                    <div>Permit: ${
                      student.cdlPermit === 'yes' && student.permitPhotoUrl
                        ? '✔️ Uploaded'
                        : '❌ Not Uploaded'
                    }</div>
                    <div>Med Card: ${
                      student.medicalCardUrl ? '✔️ Uploaded' : '❌ Not Uploaded'
                    }</div>
                    <div>
                      Profile Completion:
                      <div class="progress-bar" style="width:120px;display:inline-block;">
                        <div class="progress" style="width:${student.profileProgress}%;"></div>
                      </div>
                      <span style="font-size:.95em;">${student.profileProgress}%</span>
                    </div>
                    <div style="color:#f47373;min-height:20px;">
                      ${
                        student.checklistAlerts !==
                        'All required steps complete! 🎉'
                          ? `⚠️ ${student.checklistAlerts}`
                          : `<span style="color:#56b870">✔️ All requirements met</span>`
                      }
                    </div>
                    <div>
                      Last Test: ${
                        testResultsByStudent[student.email]
                          ? `${testResultsByStudent[student.email].testName} – ${testResultsByStudent[student.email].pct}% on ${testResultsByStudent[student.email].date}`
                          : 'No recent test'
                      }
                    </div>
                    <button class="btn" data-student="${student.email}" data-nav="viewStudentProfile">View Profile</button>
                    <button class="btn outline" data-student="${student.email}" data-nav="reviewChecklist">Review Checklist</button>
                  </div>
                `
                )
                .join('')}
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
  `;

  // --- Render with shell!
  await renderAppShell({
    role: 'instructor',
    user: { name: userData.name },
    mainContent,
    showFooter: true,
    notifications: [],
  });

  // --- Instructor-specific handlers (AFTER shell render) ---
  document
    .getElementById('edit-instructor-profile-btn')
    ?.addEventListener('click', () => {
      if (instructorPages.renderInstructorProfile)
        instructorPages.renderInstructorProfile();
    });

  document.getElementById('export-csv-btn')?.addEventListener('click', () => {
    const headers = [
      'Name',
      'Email',
      'CDL Class',
      'Experience',
      'Permit',
      'Med Card',
      'Profile Completion',
      'Checklist Alerts',
      'Last Test',
    ];
    const rows = assignedStudents.map((s) => [
      `"${s.name}"`,
      `"${s.email}"`,
      `"${s.cdlClass}"`,
      `"${s.experience}"`,
      `"${s.cdlPermit === 'yes' && s.permitPhotoUrl ? 'Uploaded' : 'Not Uploaded'}"`,
      `"${s.medicalCardUrl ? 'Uploaded' : 'Not Uploaded'}"`,
      `"${s.profileProgress}%"`,
      `"${s.checklistAlerts.replace(/"/g, "'")}"`,
      `"${
        testResultsByStudent[s.email]
          ? testResultsByStudent[s.email].testName +
            ' - ' +
            testResultsByStudent[s.email].pct +
            '% on ' +
            testResultsByStudent[s.email].date
          : 'No recent test'
      }"`,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'assigned-students.csv';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 300);
    showToast('CSV export downloaded.', 2600, 'success');
  });

  // --- View Student Profile ---
  document
    .querySelectorAll('.student-name, button[data-nav="viewStudentProfile"]')
    .forEach((el) => {
      el.addEventListener('click', () => {
        const studentEmail =
          el.getAttribute('data-email') || el.getAttribute('data-student');
        if (instructorPages.renderStudentProfileForInstructor && studentEmail) {
          instructorPages.renderStudentProfileForInstructor(studentEmail);
        } else {
          showToast('No student email found.', 3000, 'error');
        }
      });
    });

  // --- Checklist Review modal ---
  document
    .querySelectorAll('button[data-nav="reviewChecklist"]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const studentEmail = btn.getAttribute('data-student');
        if (
          instructorPages.renderChecklistReviewForInstructor &&
          studentEmail
        ) {
          instructorPages.renderChecklistReviewForInstructor(studentEmail);
        } else {
          showToast(
            'No student email found for checklist review.',
            3200,
            'error'
          );
        }
      });
    });
}
