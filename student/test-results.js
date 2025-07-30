// student/test-results.js

import { db } from '../firebase.js';
import {
  getDocs,
  query,
  collection,
  where,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { setupNavigation, showToast } from '../ui-helpers.js';

// Accepts container param, and always checks for logged in user email
export async function renderTestResults(
  container = document.getElementById('app')
) {
  // --- USER ROLE RESOLUTION ---
  const currentUserEmail =
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    window.auth?.currentUser?.email ||
    null;
  const userRole = localStorage.getItem('userRole') || 'student';
  if (!container) return;

  // --- GUARD AGAINST MISSING USER ---
  if (!currentUserEmail) {
    container.innerHTML = `
      <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
        <h2>📊 Student Test Results</h2>
        <p>You must be logged in to view this page.</p>
      </div>
    `;
    setupNavigation();
    return;
  }

  // --- SHOW LOADING STATE ---
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>📊 Test Results</h2>
      <p>Loading...</p>
    </div>
  `;

  // --- FETCH RESULTS FOR CURRENT USER (student) OR ALL STUDENTS (admin/instructor) ---
  let results = [];
  let students = {}; // email => profile map for instructors/admins
  let isStaff =
    userRole === 'admin' ||
    userRole === 'instructor' ||
    userRole === 'superadmin';

  try {
    // For instructors/admins: fetch all visible students, else fetch self
    let studentFilterEmails = [currentUserEmail];

    if (isStaff) {
      // For now, get ALL students (upgrade to filter for assigned students when you implement it!)
      const userSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'student'))
      );
      userSnap.docs.forEach((doc) => {
        students[doc.data().email] = doc.data();
      });
      studentFilterEmails = Object.keys(students);
    }

    // Get test results for these users
    let allResults = [];
    for (const email of studentFilterEmails) {
      const snap = await getDocs(
        query(collection(db, 'testResults'), where('studentId', '==', email))
      );
      snap.docs.forEach((d) => {
        const data = d.data();
        const ts = data.timestamp;
        const date = ts?.toDate ? ts.toDate() : new Date(ts);
        allResults.push({ ...data, timestamp: date, studentId: email });
      });
    }

    // Sort descending by date
    results = allResults.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error('❌ Error loading test results:', e);
    showToast('Failed to load test results.', 3500, 'error');
    results = [];
  }

  // --- BUILD RESULTS TABLE ---
  let html = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:700px; margin:0 auto;">
      <h2>📊 ${isStaff ? 'All Student ' : ''}Test Results</h2>
      <table class="test-results-table" style="width:100%;margin-bottom:12px;">
        <thead>
          <tr>
            ${isStaff ? '<th>Name</th>' : ''}
            <th>Test</th>
            <th>Score</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (results.length === 0) {
    html += `<tr><td colspan="${isStaff ? 4 : 3}">No test results found.</td></tr>`;
  } else {
    results.forEach((r) => {
      const pct = Math.round((r.correct / r.total) * 100);
      const date = r.timestamp.toLocaleDateString();
      html += `<tr>`;
      if (isStaff) {
        const name = students[r.studentId]?.name || r.studentId || 'Unknown';
        html += `
          <td>
            <a href="#" class="student-name-link" data-email="${r.studentId}" style="color:#b48aff;font-weight:600;text-decoration:underline dotted;">
              ${name}
            </a>
          </td>
        `;
      }
      html += `
        <td>${r.testName}</td>
        <td><b>${pct}%</b> <span style="color:#888;">(${r.correct}/${r.total})</span></td>
        <td>${date}</td>
      </tr>`;
    });
  }

  html += `
        </tbody>
      </table>
      <div style="text-align:center; margin-top:18px;">
        <button class="btn outline" id="back-to-dashboard-btn" style="margin-right:8px;">⬅ Back to Dashboard</button>
        <button class="btn" id="retake-test-btn">🔄 Retake a Test</button>
        ${isStaff ? `<button class="btn" id="export-csv-btn">⬇️ Export CSV</button>` : ''}
      </div>
    </div>
  `;

  // Render and bind navigation
  container.innerHTML = html;
  setupNavigation();

  // Back and Retake navigation (always uses latest dashboard, no hardcode)
  document
    .getElementById('back-to-dashboard-btn')
    ?.addEventListener('click', () => {
      import('./student-dashboard.js').then((mod) =>
        mod.renderStudentDashboard(container)
      );
    });
  document.getElementById('retake-test-btn')?.addEventListener('click', () => {
    import('./practice-tests.js').then((mod) =>
      mod.renderPracticeTests(container)
    );
  });

  // --- CSV EXPORT FOR STAFF ---
  if (isStaff) {
    document.getElementById('export-csv-btn')?.addEventListener('click', () => {
      const rows = [['Name', 'Email', 'Test', 'Score', 'Date']];
      results.forEach((r) => {
        const name = students[r.studentId]?.name || r.studentId || 'Unknown';
        const pct = Math.round((r.correct / r.total) * 100);
        const date = r.timestamp.toLocaleDateString();
        rows.push([
          name,
          r.studentId,
          r.testName,
          `${pct}% (${r.correct}/${r.total})`,
          date,
        ]);
      });
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        rows
          .map((e) =>
            e.map((s) => `"${String(s).replace(/"/g, '""')}"`).join(',')
          )
          .join('\n');
      const a = document.createElement('a');
      a.href = csvContent;
      a.download = 'cdl-test-results.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  // --- Student name click for profile modal (staff only) ---
  if (isStaff) {
    container.querySelectorAll('.student-name-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        showStudentDetailsModal(link.dataset.email);
      });
    });
  }
}

// --- Student Details Modal (compatible for instructor/admin roles) ---
async function showStudentDetailsModal(email) {
  // Loader
  let modal = document.createElement('div');
  modal.className = 'modal-overlay fade-in';
  modal.innerHTML = `<div class="modal-card glass" style="max-width:460px;margin:40px auto;">
    <button class="modal-close" style="float:right;font-size:1.7em;">&times;</button>
    <div class="student-modal-content" style="padding:18px;">
      <h3 style="margin-top:0">Loading...</h3>
    </div>
  </div>`;
  document.body.appendChild(modal);

  // Safe close binding (no inline JS)
  modal.querySelector('.modal-close').onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  // Fetch student from Firestore
  try {
    const { collection, query, where, getDocs } = await import(
      'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js'
    );
    const { db } = await import('../firebase.js');
    const snap = await getDocs(
      query(collection(db, 'users'), where('email', '==', email))
    );
    if (snap.empty) throw new Error('Student not found.');
    const data = snap.docs[0].data();

    // Checklist/permit progress (sample logic; customize to match your fields)
    const checklist = [
      { label: 'Profile Complete', value: data.profileProgress + '%' },
      { label: 'Permit Uploaded', value: data.permitPhotoUrl ? '✅' : '❌' },
      {
        label: 'Vehicle Qualified',
        value: data.vehicleQualified === 'yes' ? '✅' : '❌',
      },
      { label: 'Experience', value: data.experience || 'n/a' },
      { label: 'CDL Class', value: data.cdlClass || 'n/a' },
    ];

    modal.querySelector('.student-modal-content').innerHTML = `
      <h3>${data.name || '(No Name)'} <span class="role-badge">${data.role || ''}</span></h3>
      <div style="color:#999;margin-bottom:7px;font-size:0.98em;">${email}</div>
      <ul class="profile-fields" style="list-style:none;padding:0 0 7px 0;">
        <li><strong>DOB:</strong> ${data.dob || '--'}</li>
        <li><strong>Permit Status:</strong> ${data.cdlPermit === 'yes' ? '✅ Yes' : data.cdlPermit === 'no' ? '❌ No' : '--'}</li>
        <li><strong>Profile Progress:</strong> ${data.profileProgress || 0}%</li>
        <li><strong>Endorsements:</strong> ${(data.endorsements || []).join(', ') || '--'}</li>
        <li><strong>Restrictions:</strong> ${(data.restrictions || []).join(', ') || '--'}</li>
        <li><strong>Experience:</strong> ${data.experience || '--'}</li>
        <li><strong>Vehicle Qualified:</strong> ${data.vehicleQualified === 'yes' ? '✅' : '❌'}</li>
      </ul>
      <div style="margin-top:8px;">
        ${data.profilePicUrl ? `<img src="${data.profilePicUrl}" alt="Profile" style="width:90px;height:90px;object-fit:cover;border-radius:10px;border:1.5px solid #b48aff;margin-bottom:7px;">` : ''}
      </div>
      <div style="margin-top:10px;text-align:center;">
        <button class="btn modal-close-btn" style="margin-top:9px;">Close</button>
      </div>
    `;

    modal.querySelector('.modal-close-btn').onclick = () => modal.remove();
  } catch (err) {
    modal.querySelector('.student-modal-content').innerHTML =
      `<h3>Error</h3><div>${err.message}</div>`;
  }
}
