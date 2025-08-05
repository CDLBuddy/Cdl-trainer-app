// school-switching.js

import { db, auth } from './firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { showToast, setupNavigation } from './ui-helpers.js';
import { handleNavigation } from './navigation.js';
import { renderWelcome } from './welcome.js';

// === Role-aware dashboard routing helper ===
function getDashboardRoute(role) {
  switch (role) {
    case 'superadmin':
      return 'superadmin-dashboard';
    case 'admin':
      return 'admin-dashboard';
    case 'instructor':
      return 'instructor-dashboard';
    case 'student':
    default:
      return 'student-dashboard';
  }
}

export async function renderSchoolSwitching(
  container = document.getElementById('app')
) {
  if (!container) return;

  // Get current user
  const userEmail =
    (auth.currentUser && auth.currentUser.email) ||
    localStorage.getItem('currentUserEmail');
  const userRole =
    window.currentUserRole || localStorage.getItem('userRole') || 'student';

  if (!userEmail) {
    showToast('You must be logged in to switch schools.');
    renderWelcome();
    return;
  }

  // Fetch all schools this user is permitted to join (from userRoles)
  let userSchools = [];
  try {
    const userDocSnap = await getDocs(
      query(collection(db, 'userRoles'), where('email', '==', userEmail))
    );
    if (!userDocSnap.empty) {
      userDocSnap.forEach((doc) => {
        const d = doc.data();
        // Use assignedSchools or schoolId, but fallback to legacy 'schools'
        if (Array.isArray(d.assignedSchools)) userSchools = d.assignedSchools;
        else if (d.schoolId) userSchools = [d.schoolId];
        else if (Array.isArray(d.schools)) userSchools = d.schools;
      });
    }
  } catch (e) {
    showToast('Error fetching assigned schools.');
  }

  // Fetch all schools from Firestore
  let schoolBrandList = [];
  try {
    const schoolsSnap = await getDocs(collection(db, 'schools'));
    schoolBrandList = schoolsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (e) {
    showToast('Error loading school list.');
  }

  // === Superadmin: can see all schools ===
  // === Others: only allowed their assigned school(s) ===
  let allowedSchools = [];
  if (userRole === 'superadmin' || userSchools.includes('all')) {
    allowedSchools = schoolBrandList;
  } else if (userSchools.length > 0) {
    allowedSchools = schoolBrandList.filter((s) => userSchools.includes(s.id));
  } else {
    allowedSchools = [];
  }

  // If no allowed schools, show error and return
  if (!allowedSchools.length) {
    container.innerHTML = `
      <div class="school-switch-card fade-in" style="max-width:400px;margin:50px auto;">
        <h2>No School Assigned</h2>
        <p>Your account is not assigned to any school.<br>
        Please contact support for assistance.</p>
        <div style="margin-top:1em;text-align:center;font-size:.96em;">
          <a href="mailto:support@cdltrainerapp.com"
            style="color:#b48aff;text-decoration:underline;">Contact Support</a>
        </div>
        <button class="btn outline" id="back-to-dashboard-btn" style="margin-top:2em;">⬅ Back</button>
      </div>
    `;
    setupNavigation();
    document
      .getElementById('back-to-dashboard-btn')
      ?.addEventListener('click', () => {
        handleNavigation(getDashboardRoute(userRole));
      });
    return;
  }

  // Determine current school for selection
  const currentSchoolId =
    localStorage.getItem('schoolId') || allowedSchools[0]?.id || '';
  const currentBrand =
    allowedSchools.find((s) => s.id === currentSchoolId) || allowedSchools[0];

  // === If only one allowed school, skip dropdown ===
  const showDropdown = allowedSchools.length > 1;

  container.innerHTML = `
    <div class="school-switch-card fade-in" style="max-width:500px;margin:40px auto 0 auto;">
      <h2 style="text-align:center;">
        <img src="${currentBrand.logoUrl || '/default-logo.svg'}"
             alt="Current School Logo"
             style="height:46px;max-width:96px;margin-bottom:0.3em;border-radius:7px;box-shadow:0 1px 8px #22115533;">
        <br>Switch School
      </h2>
      <form id="school-switch-form" style="display:flex;flex-direction:column;gap:1.3rem;">
        ${
          showDropdown
            ? `<label for="school-select" style="font-weight:500;font-size:1.06em;">Select Your School:</label>
        <select id="school-select" required>
          ${allowedSchools
            .map(
              (s) =>
                `<option value="${s.id}" ${s.id === currentSchoolId ? 'selected' : ''}>
              ${s.schoolName || s.name || s.id}
            </option>`
            )
            .join('')}
        </select>`
            : `<input type="hidden" id="school-select" value="${currentSchoolId}">`
        }
        <button class="btn primary" type="submit">
          ${showDropdown ? 'Switch School' : 'Continue'}
        </button>
        <button class="btn outline" id="back-to-dashboard-btn" type="button">⬅ Back</button>
      </form>
      <div style="margin-top:1em;text-align:center;font-size:.96em;">
        Need help? <a href="mailto:${currentBrand.contactEmail || 'support@cdltrainerapp.com'}"
          style="color:${currentBrand.primaryColor || '#b48aff'};text-decoration:underline;">Contact Support</a>
      </div>
    </div>
  `;

  setupNavigation();

  // Handle switching
  document.getElementById('school-switch-form').onsubmit = async (e) => {
    e.preventDefault();
    const schoolId = document.getElementById('school-select').value;
    const school = allowedSchools.find((s) => s.id === schoolId);
    if (!school) {
      showToast('Invalid school selected.', 2000, 'error');
      return;
    }
    // Save to localStorage (only the ID; all branding is fetched dynamically)
    localStorage.setItem('schoolId', schoolId);

    showToast(
      `Switched to: ${school.schoolName || school.name || school.id}`,
      1700,
      'success'
    );
    // Reload/re-render with new brand, go to correct dashboard
    setTimeout(() => {
      handleNavigation(getDashboardRoute(userRole));
    }, 500);
  };

  // Back to dashboard
  document
    .getElementById('back-to-dashboard-btn')
    ?.addEventListener('click', () => {
      handleNavigation(getDashboardRoute(userRole));
    });
}
