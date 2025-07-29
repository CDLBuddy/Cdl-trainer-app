// ======== DEBUG/DEV TRAP ========
console.log('✅ app.js loaded!');
window.onerror = function (msg, src, lineno, col, error) {
  alert('🚨 JS Error: ' + msg + '\n' + src + ' @ ' + lineno + ':' + col);
  console.error('🚨 JS Error:', msg, src, lineno, col, error);
};
window.addEventListener('unhandledrejection', function (event) {
  alert(
    '🚨 Promise Rejection: ' +
      (event.reason && event.reason.message
        ? event.reason.message
        : event.reason)
  );
  console.error('🚨 Promise Rejection:', event.reason);
});
// ================================

// --- IMPORTS ---
console.log('📦 Importing modules...');
import { db, auth, storage } from './firebase.js';
import {
  showToast,
  showPageTransitionLoader,
  hidePageTransitionLoader,
} from './ui-helpers.js';
import { handleNavigation } from './navigation.js';
import { renderWelcome } from './welcome.js';
import { renderLogin } from './login.js';
import { renderSignup } from './signup.js';
// === ROLE INDEX IMPORTS (UPDATED for folders) ===
import * as studentPages from './student/index.js';
import * as instructorPages from './instructor/index.js';
import * as adminPages from './admin/index.js';
import * as superadminPages from './superadmin/index.js';
import {
  getCurrentSchoolBranding,
  setCurrentSchool,
} from './school-branding.js';
import { getBlankUserProfile } from './utils/user-profile.js';

// --- GLOBAL STATE ---
console.log('🌐 Setting global state...');
let currentUserEmail = null;
let currentUserRole = null;
let schoolId = null;

window.currentUserEmail = null;
window.currentUserRole = null;
window.schoolId = null;

let loaderShownAt = Date.now();
let loaderEl = document.getElementById('app-loader');

// --- NAV HANDLERS ---
console.log('🖱️ Setting up nav handlers...');
document.body.addEventListener('click', (e) => {
  const target = e.target.closest('[data-nav]');
  if (target) {
    const page = target.getAttribute('data-nav');
    if (page) {
      let dir = 'forward';
      if (window.location.hash.replace('#', '') === page) dir = 'back';
      console.log('🔄 Navigation event: ', page, dir);
      handleNavigation(page, dir);
    }
  }
});
window.addEventListener('popstate', () => {
  const page = location.hash.replace('#', '') || null;
  console.log('🔄 popstate navigation: ', page);
  if (!page) {
    // Fallback to role-specific dashboard
    const role = getCurrentRole();
    let dash;
    switch (role) {
      case 'superadmin':
        dash = 'superadmin-dashboard';
        break;
      case 'admin':
        dash = 'admin-dashboard';
        break;
      case 'instructor':
        dash = 'instructor-dashboard';
        break;
      case 'student':
      default:
        dash = 'student-dashboard';
        break;
    }
    handleNavigation(dash, 'back');
  } else {
    handleNavigation(page, 'back');
  }
});

// --- AUTH STATE LISTENER ---
console.log('📦 Importing Firebase listeners...');
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

// -- FIREBASE AUTH LISTENER --
console.log('🛡️ Setting up onAuthStateChanged...');
onAuthStateChanged(auth, async (user) => {
  console.log('🔔 Auth state changed! User:', user);

  // Remove any loading overlays/errors
  document.getElementById('js-error')?.classList.add('hidden');
  document.getElementById('loading-screen')?.classList.add('hidden');

  // Feedback: Show loading spinner
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.innerHTML = `
      <div class="screen-wrapper fade-in" style="text-align:center">
        <div class="loading-spinner" style="margin:40px auto;"></div>
        <p>Checking your credentials…</p>
      </div>
    `;
    console.log('⏳ Rendered loader in app div');
  }

  if (user) {
    console.log('👤 User is signed in:', user.email);

    // --- ROLE/ORG LOGIC ---
    currentUserEmail = user.email;
    window.currentUserEmail = user.email;
    let userRole = 'student';
    let schoolIdVal = null;
    let userData = {};

    try {
      // 1. Fetch user role from userRoles collection
      console.log('🔍 Fetching user role from userRoles:', user.email);
      const roleDoc = await getDoc(doc(db, 'userRoles', user.email));
      if (roleDoc.exists()) {
        const data = roleDoc.data();
        userRole = data.role || 'student';
        schoolIdVal = data.schoolId || null;
        console.log('✅ userRoles found:', data);
      } else {
        showToast('⚠️ No userRoles entry found for: ' + user.email, 4000);
        console.warn('⚠️ No userRoles entry found for:', user.email);
      }

      // 2. Fetch or create user profile in users collection
      console.log('🔍 Fetching user profile from users collection...');
      const usersRef = collection(db, 'users');
      const snap = await getDocs(
        query(usersRef, where('email', '==', user.email))
      );
      if (!snap.empty) {
        userData = snap.docs[0].data();
        // Ensure role is synced in profile
        if (!userData.role || userData.role !== userRole) {
          userData.role = userRole;
          await setDoc(
            doc(db, 'users', user.email),
            { ...userData },
            { merge: true }
          );
          console.log('🔄 Synced user role in profile:', userRole);
        }
        if (userData.schoolId) schoolIdVal = userData.schoolId;
        localStorage.setItem('fullName', userData.name || 'CDL User');
      } else {
        // --- BLANK PROFILE SAFETY: Create a blank profile doc ---
        const blankProfile = getBlankUserProfile({
          user,
          userRole,
          schoolIdVal,
        });
        await setDoc(doc(db, 'users', user.email), blankProfile);
        userData = blankProfile;
        localStorage.setItem('fullName', userData.name);
      }

      // --- SYNC TO LOCAL STORAGE AND WINDOW ---
      console.log('💾 Syncing role & schoolId to localStorage...');
      localStorage.setItem('userRole', userRole);
      localStorage.setItem('currentUserEmail', user.email);
      window.currentUserRole = userRole;
      currentUserRole = userRole;
      if (schoolIdVal) {
        localStorage.setItem('schoolId', schoolIdVal);
        window.schoolId = schoolIdVal;
        schoolId = schoolIdVal;
        setCurrentSchool(schoolIdVal); // Update CSS vars/theme
        console.log('🎨 Applied school branding for:', schoolIdVal);
      } else {
        localStorage.removeItem('schoolId');
        window.schoolId = null;
        schoolId = null;
      }
      if (userRole === 'superadmin') localStorage.setItem('isSuperAdmin', '1');
      else localStorage.removeItem('isSuperAdmin');

      // --- ROUTE TO DASHBOARD ---
      console.log('🚦 Routing to dashboard...');
      showPageTransitionLoader();
      setTimeout(() => {
        // Choose dashboard based on role!
        let dash;
        switch (userRole) {
          case 'superadmin':
            dash = 'superadmin-dashboard';
            break;
          case 'admin':
            dash = 'admin-dashboard';
            break;
          case 'instructor':
            dash = 'instructor-dashboard';
            break;
          case 'student':
          default:
            dash = 'student-dashboard';
            break;
        }
        handleNavigation(dash);
        hidePageTransitionLoader();
        console.log('🏠 Dashboard render triggered:', dash);
      }, 350);
    } catch (err) {
      console.error('❌ Auth/profile error:', err);
      showToast('Error loading profile: ' + (err.message || err), 4800);
      renderWelcome();
      console.log('⚠️ Error handled, fallback to welcome page');
    }
  } else {
    // --- LOGOUT or NOT LOGGED IN ---
    console.log('👋 User not logged in (or logged out).');
    currentUserEmail = null;
    currentUserRole = null;
    schoolId = null;
    window.currentUserEmail = null;
    window.currentUserRole = null;
    window.schoolId = null;
    localStorage.removeItem('userRole');
    localStorage.removeItem('schoolId');
    localStorage.removeItem('schoolBrand'); // Clear branding on logout!
    showPageTransitionLoader();
    setTimeout(() => {
      renderWelcome();
      hidePageTransitionLoader();
      console.log('🏁 Rendered welcome screen');
    }, 300);
  }

  // Loader hiding
  const elapsed = Date.now() - loaderShownAt;
  setTimeout(
    () => {
      loaderEl?.classList.add('hide');
      console.log('🕓 Hiding initial loader after', elapsed, 'ms');
    },
    Math.max(0, 400 - elapsed)
  );
});

// --- INITIAL LOAD ---
console.log('🚦 Initial DOMContentLoaded hook set.');
window.addEventListener('DOMContentLoaded', () => {
  // On initial load, always update CSS vars for current school
  const sid = localStorage.getItem('schoolId');
  if (sid) {
    setCurrentSchool(sid);
    console.log('🎨 Set initial school theme for:', sid);
  }
  // Auth state listener will trigger and handle boot
  console.log('🔄 DOM ready, waiting for Firebase auth...');
});

// Optionally, export any globals you want available to the rest of your app here (for testing/dev)
// export { currentUserEmail, currentUserRole, schoolId };
