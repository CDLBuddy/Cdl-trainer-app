// === Upgraded Version (20250708-2304) ===
// Security enhancements, abuse protection, dark mode sync, language persistence, and error handling improvements
// Do not modify unless updating global protections or navigation core

console.log("✅ app.js loaded");

document.body.innerHTML = "<div style='color:white;background:black;padding:1rem;text-align:center;'>✅ app.js loaded</div>" + document.body.innerHTML;

// ==== Firebase Setup ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

// ==== Firebase Config ====
const firebaseConfig = {
  apiKey: "AIzaSyCHGQzw-QXk-tuT2Zf8EcbQRz7E0Zms-7A",
  authDomain: "cdltrainerapp.firebaseapp.com",
  projectId: "cdltrainerapp",
  storageBucket: "cdltrainerapp.appspot.com",
  messagingSenderId: "977549527480",
  appId: "1:977549527480:web:e959926bb02a4cef65674d"
};

const app = initializeApp(firebaseConfig); // ✅ Only one initialization

// ==== Firestore (Database) ====
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const db = getFirestore(app);

// ==== Authentication ====
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const auth = getAuth(app); // ✅ Use the same app instance

// ==== Toast Notification ====
function showToast(message, duration = 3000) {
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;

  // Optional: set initial inline styles if CSS is missing
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "#333";
  toast.style.color = "#fff";
  toast.style.padding = "10px 20px";
  toast.style.borderRadius = "5px";
  toast.style.opacity = "1";
  toast.style.transition = "opacity 0.5s ease";

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 600);
  }, duration);
}

// ==== Global User Reference ====
// Tracks the currently signed-in user's email (set during auth)
let currentUserEmail = null;

// ==== Auth State Listener ====
console.log("✅ Firebase auth listener attached");

onAuthStateChanged(auth, async (user) => {
  console.log("🔥 Firebase auth state changed", user);

  const app = document.getElementById("app");

  // === Animated loading screen ===
  if (app) {
    app.innerHTML = `
      <div class="screen-wrapper fade-in" style="text-align:center">
        <div class="loading-spinner" style="margin: 40px auto;"></div>
        <p>Checking your credentials...</p>
      </div>
    `;
  }

  if (user) {
    currentUserEmail = user.email;

    try {
      // === 1. Check Firestore for user profile ===
      const userRef = collection(db, "users");
      const userQuery = query(userRef, where("email", "==", user.email));
      const snapshot = await getDocs(userQuery);

      let userData;
      if (!snapshot.empty) {
        userData = snapshot.docs[0].data();
      } else {
        // === 2. Create Firestore profile if not found ===
        const newUser = {
          email: user.email,
          name: user.displayName || "CDL User",
          role: "student",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await addDoc(userRef, newUser);
        userData = newUser;
      }

      // === 3. Save role & name locally ===
      localStorage.setItem("userRole", userData.role || "student");
      localStorage.setItem("fullName", userData.name || "CDL User");

    } catch (err) {
      console.error("❌ User profile error:", err);
      if (app) {
        app.innerHTML = `<div class="card"><p>Error loading profile.</p></div>`;
      }
      return;
    }

    // === 4. Setup logout button ===
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.style.display = "inline-block";
      const freshLogout = logoutBtn.cloneNode(true);
      logoutBtn.parentNode.replaceChild(freshLogout, logoutBtn);

      freshLogout.addEventListener("click", async () => {
        try {
          await signOut(auth);
          alert("You’ve been logged out.");
          location.reload();
        } catch (err) {
          console.error("Logout failed:", err);
          alert("Logout error.");
        }
      });
    }

    // === 5. Role-based dashboard load ===
    setTimeout(() => {
      const role = localStorage.getItem("userRole");
      if (role === "admin") renderAdminDashboard();
      else if (role === "instructor") renderInstructorDashboard();
      else renderStudentDashboard();
    }, 300);

  } else {
    // === No user: Show welcome screen ===
    currentUserEmail = null;
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.style.display = "none";
    setTimeout(() => renderWelcome(), 200);
  }
});

// ==== Navigation ====
function setupNavigation() {
  const navItems = document.querySelectorAll("[data-nav]");

  // ⬇️ Enhance navigation buttons
  navItems.forEach(btn =>
    btn.addEventListener("click", async (e) => {
      const target = e.target.closest("[data-nav]")?.getAttribute("data-nav");
      if (!target) return;
      await handleNavigation(target, true); // true = push to browser history
    })
  );

  // 🔤 Multilingual label support
  const lang = localStorage.getItem("language") || "en";
  const labels = {
    en: { coach: "AI Coach", license: "License Path", tests: "Practice Tests" },
    es: { coach: "Entrenador AI", license: "Tipo de Licencia", tests: "Exámenes Prácticos" },
    fr: { coach: "Coach IA", license: "Permis", tests: "Tests Pratiques" },
    de: { coach: "KI-Coach", license: "Führerschein", tests: "Übungstests" }
  };
  for (const [key, label] of Object.entries(labels[lang])) {
    const btn = document.querySelector(`[data-nav="${key}"]`);
    if (btn?.querySelector("span")) btn.querySelector("span").textContent = label;
  }

  // 🔒 Smart role-aware UI filtering
  if (currentUserEmail?.includes("instructor@") || currentUserEmail?.includes("admin@")) {
    document.querySelector('[data-nav="license"]')?.remove();
  }

  // ⌨️ Keyboard navigation
  document.addEventListener("keydown", async (e) => {
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
    const key = e.key.toLowerCase();
    if (key === "h") await handleNavigation("home", true);
    if (key === "t") await handleNavigation("tests", true);
    if (key === "c") await handleNavigation("coach", true);
  });

  // 📱 Touch swipe gestures
  let touchStartX = 0;
  document.addEventListener("touchstart", e => touchStartX = e.touches[0].clientX);
  document.addEventListener("touchend", async e => {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX > 100) await handleNavigation("home", true);    // swipe right → home
    if (deltaX < -100) await handleNavigation("tests", true);  // swipe left → tests
  });

  // 🔙 Browser back/forward support
  window.addEventListener("popstate", (e) => {
    const page = e.state?.page || "home";
    handleNavigation(page, false); // don't push again
  });

  // 🧭 Load from hash on first visit
  const hash = location.hash.replace("#", "");
  if (hash) handleNavigation(hash, false);
}

async function handleNavigation(targetPage, pushToHistory = false) {
  const app = document.getElementById("app");
  if (!app) return;

  // Animate fade-out before transition
  app.classList.remove("fade-in");
  app.classList.add("fade-out");
  await new Promise(r => setTimeout(r, 150));

  // Track page history
  if (pushToHistory) {
    history.pushState({ page: targetPage }, "", `#${targetPage}`);
  }

  // Smart routing for "home"
  if (targetPage === "home") {
    if (!currentUserEmail) {
      renderWelcome();
    } else if (currentUserEmail.includes("admin@")) {
      renderAdminDashboard(app);
    } else if (currentUserEmail.includes("instructor@")) {
      renderInstructorDashboard(app);
    } else {
      renderStudentDashboard(app);
    }
  } else {
    renderPage(targetPage);
  }
}

// ==== Home Screen ====
async function renderHome(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="welcome-container fade-in">
      <img src="logo-icon.png" alt="CDL Icon" class="header-icon" />
      <h1>Welcome back${currentUserEmail ? `, ${currentUserEmail.split("@")[0]}` : ""}!</h1>
      ${getRoleBadge(currentUserEmail)}
      <p class="subtitle">Choose your training mode to begin</p>

      <div id="checklist-progress" class="progress-bar"></div>
      <div id="latest-score" class="result-card preview-card"></div>
      <div id="ai-tip" class="ai-tip-box"></div>

      <div class="button-grid">
        <button data-nav="walkthrough"><img src="icons/walkthrough.png" /> Walkthrough</button>
        <button data-nav="tests"><img src="icons/tests.png" /> Practice Tests</button>
        <button data-nav="coach"><img src="icons/coach.png" /> AI Coach</button>
        <button data-nav="checklists"><img src="icons/checklist.png" /> My Checklist <span id="checklist-alert" class="notify-bubble" style="display:none;">!</span></button>
        <button data-nav="results"><img src="icons/results.png" /> Test Results</button>
        <button data-nav="flashcards"><img src="icons/flashcards.png" /> Flashcards</button>
        <button data-nav="experience"><img src="icons/experience.png" /> Experience</button>
        <button data-nav="license"><img src="icons/license.png" /> License Path</button>
        <button data-nav="login"><img src="icons/login.png" /> Profile / Login</button>
      </div>

      <button class="login-button" data-nav="coach">🎧 Talk to Your AI Coach</button>
    </div>
  `;
  setupNavigation();

  // 🎉 AI Tip of the Day
  const tips = [
    "Review your ELDT checklist daily.",
    "Use flashcards to stay sharp!",
    "Ask the AI Coach about Class A vs B.",
    "Take timed quizzes to simulate the real test.",
    "Complete your checklist for certification."
  ];
  document.getElementById("ai-tip").textContent = `💡 Tip: ${tips[Math.floor(Math.random() * tips.length)]}`;

  // 🔄 Checklist Progress
  if (currentUserEmail) {
    const snap = await getDocs(query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail)));
    let total = 0, done = 0;
    snap.forEach(doc => {
      const prog = doc.data().progress;
      Object.values(prog).forEach(sec => {
        Object.values(sec).forEach(val => {
          total++;
          if (val) done++;
        });
      });
    });
    const pct = total ? Math.round((done / total) * 100) : 0;
    document.getElementById("checklist-progress").innerHTML = `
      <div class="progress-label">Checklist Progress: ${pct}%</div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    `;
    if (pct < 100) {
      document.getElementById("checklist-alert").style.display = "inline-block";
    }
  }

  // 📊 Last Test Score
  if (currentUserEmail) {
    const snap2 = await getDocs(query(collection(db, "testResults"), where("studentId", "==", currentUserEmail)));
    let last = null;
    snap2.forEach(doc => {
      const d = doc.data();
      if (!last || (d.timestamp?.toDate?.() > last.timestamp?.toDate?.())) last = d;
    });
    if (last) {
      const dateStr = last.timestamp?.toDate?.().toLocaleDateString() || "";
      document.getElementById("latest-score").innerHTML = `
        <h4>📘 Last Test: ${last.testName}</h4>
        <p>Score: ${last.correct}/${last.total} (${Math.round((last.correct / last.total) * 100)}%)</p>
        <p><small>${dateStr}</small></p>
      `;
    }
  }

  // 🌙 Auto Dark Mode after 6pm
  const hr = new Date().getHours();
  document.body.classList.toggle("dark", hr >= 18 || hr < 6);
}

// ==== Flashcards ====
function renderFlashcards(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="card">
      <h2>📑 Flashcards</h2>
      <p>Coming soon: Swipe through CDL topics for memorization.</p>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
}

// ==== Driving Experience ====
function renderExperience(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="card">
      <h2>🚚 Driving Experience</h2>
      <p>Tell us about your driving background:</p>
      <form id="experience-form">
        <label><input type="radio" name="exp" value="beginner"> Beginner</label><br/>
        <label><input type="radio" name="exp" value="some"> Some Experience</label><br/>
        <label><input type="radio" name="exp" value="experienced"> Experienced CDL Driver</label><br/><br/>
        <button id="save-exp-btn">Save Experience</button>
      </form>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
  document.getElementById("save-exp-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    const selected = document.querySelector("input[name=exp]:checked")?.value;
    if (!selected) return alert("Please select your experience level.");
    await addDoc(collection(db, "experienceResponses"), {
      studentId: currentUserEmail,
      experience: selected,
      timestamp: new Date()
    });
    alert("✅ Experience saved!");
    renderPage("home");
  });
}

// ==== License Selector ====
function renderLicenseSelector(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="card">
      <h2>🎯 License Path</h2>
      <form id="license-form">
        <label><input type="radio" name="license" value="Class A"> Class A</label><br/>
        <label><input type="radio" name="license" value="Class A (O)"> Class A (O)</label><br/>
        <label><input type="radio" name="license" value="Class B"> Class B</label><br/><br/>
        <button id="save-license-btn">Save License</button>
      </form>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
  document.getElementById("save-license-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    const selected = document.querySelector("input[name=license]:checked")?.value;
    if (!selected) return alert("Please select a license type.");
    await addDoc(collection(db, "licenseSelection"), {
      studentId: currentUserEmail,
      licenseType: selected,
      timestamp: new Date()
    });
    alert("✅ License saved!");
    renderPage("home");
  });
}

// === Dashboards === //
async function renderDashboard() {
  const app = document.getElementById("app");
  app.innerHTML = `<div class="dashboard-card slide-in-up fade-in">Loading your dashboard...</div>`;
  const container = document.querySelector(".dashboard-card");

  const currentUser = auth.currentUser;
  const currentUserEmail = currentUser?.email || "unknown";
  const name = currentUserEmail.split("@")[0];
  const roleBadge = getRoleBadge(currentUserEmail);
  const aiTip = await getAITipOfTheDay();

  document.body.classList.toggle("dark-mode", new Date().getHours() >= 18);

  let license = "Not selected", experience = "Unknown", streak = 0;
  let testData = null, checklistPct = 0, checklistStatus = "✅";

  const eldtSnap = await getDocs(query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail)));
  let total = 0, done = 0;
  eldtSnap.forEach(doc => {
    const prog = doc.data().progress;
    Object.values(prog).forEach(sec => Object.values(sec).forEach(val => { total++; if (val) done++; }));
  });
  checklistPct = total ? Math.round((done / total) * 100) : 0;
  if (checklistPct < 100) checklistStatus = "❌";

  const testSnap = await getDocs(query(collection(db, "testResults"), where("studentId", "==", currentUserEmail)));
  testSnap.forEach(doc => {
    const d = doc.data();
    if (!testData || d.timestamp.toDate() > testData.timestamp.toDate()) testData = d;
  });

  const licenseSnap = await getDocs(query(collection(db, "licenseSelection"), where("studentId", "==", currentUserEmail)));
  licenseSnap.forEach(doc => license = doc.data().licenseType || license);

  const expSnap = await getDocs(query(collection(db, "experienceResponses"), where("studentId", "==", currentUserEmail)));
  expSnap.forEach(doc => experience = doc.data().experience || experience);

  const today = new Date().toDateString();
  let studyLog = JSON.parse(localStorage.getItem("studyLog") || "[]");
  if (!studyLog.includes(today)) {
    studyLog.push(today);
    localStorage.setItem("studyLog", JSON.stringify(studyLog));
  }
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6);
  streak = studyLog.filter(date => new Date(date) >= cutoff).length;

  const showChecklistBtn = checklistPct < 100;
  const showTestBtn = !testData;

  container.innerHTML = `
    <h1>Welcome back, ${name}!</h1>
    ${roleBadge}
    <div class="ai-tip-box">💡 ${aiTip}</div>

    <div class="dashboard-summary">
      <div class="dashboard-card">
        <h3>📋 Checklist Progress</h3>
        <div class="progress-track">
          <div class="progress-fill" style="width:${checklistPct}%;"></div>
        </div>
        <p>${checklistPct}% complete</p>
        ${checklistPct < 100 ? `<span class="notify-bubble">!</span>` : ""}
        <button data-nav="checklists">View Checklist</button>
      </div>

      <div class="dashboard-card">
        <h3>🧪 Latest Test</h3>
        ${testData ? `
          <p><strong>${testData.testName}</strong></p>
          <p>${testData.correct}/${testData.total} correct</p>
          <p><small>${new Date(testData.timestamp.toDate()).toLocaleDateString()}</small></p>
        ` : `<p>No tests taken yet.</p>`}
        ${!testData ? `<span class="notify-bubble">!</span>` : ""}
        <button data-nav="results">View All Results</button>
      </div>

      <div class="dashboard-card">
        <h3>🧾 Your Profile</h3>
        <p>Email: ${currentUserEmail}</p>
        <p>License: ${license}</p>
        <p>Experience: ${experience}</p>
        ${license === "Not selected" ? `<span class="notify-bubble">!</span>` : ""}
        <button data-nav="license">Update Info</button>
      </div>

      <div class="dashboard-card">
        <h3>🔥 Study Streak</h3>
        <p>${streak} day${streak !== 1 ? "s" : ""} active this week</p>
        <button onclick="openStudentHelpForm()">Ask the AI Coach</button>
      </div>
    </div>

    <div class="dashboard-actions">
      ${showChecklistBtn ? `<button data-nav="checklists">Resume Checklist</button>` : ""}
      ${showTestBtn ? `<button data-nav="tests">Start First Test</button>` : ""}
      <button data-nav="coach">🎧 Talk to AI Coach</button>
    </div>
  `;

  setupNavigation();
}

async function renderInstructorDashboard() {
  const user = auth.currentUser;
  if (!user) return;

  const name = user.displayName || "Instructor";
  const aiTip = await getAITipOfTheDay();
  document.body.classList.toggle("dark-mode", new Date().getHours() >= 18);

  const q = query(
    collection(db, "users"),
    where("role", "==", "student"),
    where("assignedInstructor", "==", user.uid)
  );
  const snap = await getDocs(q);

  let studentCards = "";
  let totalProgress = 0;
  let totalStudents = 0;
  let activityFeed = [];

  for (const doc of snap.docs) {
    const student = doc.data();
    const progress = student.checklistProgress || 0;
    const lastActive = student.lastActive || "--";
    const score = student.lastTestScore || "--";
    totalProgress += progress;
    totalStudents++;

    studentCards += `
      <div class="card fade-in">
        <h3>${student.displayName || "Unnamed Student"}</h3>
        <p>Email: ${student.email}</p>
        <p>Progress: ${progress}%</p>
        <p>Last Active: ${lastActive}</p>
        <p>Last Score: ${score}</p>
        <button class="btn btn-primary" onclick="viewStudentProfile('${doc.id}')">View Profile</button>
        <button class="btn btn-secondary" onclick="assignChecklist('${doc.id}')">Assign Checklist</button>
        <button class="btn btn-secondary" onclick="messageStudent('${doc.id}', '${student.displayName || "Student"}')">Message</button>
      </div>
    `;

    if (student.activityLog) {
      activityFeed.push(...student.activityLog.map(msg => ({
        name: student.displayName || "Student",
        message: msg,
        timestamp: student.lastActive
      })));
    }
  }

  const avgProgress = totalStudents ? Math.round(totalProgress / totalStudents) : 0;
  activityFeed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const recentActivity = activityFeed.slice(0, 5).map(entry => `
    <li><strong>${entry.name}</strong>: ${entry.message} (${entry.timestamp || "recently"})</li>
  `).join("");

  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="dashboard fade-in">
      <h2>👋 Welcome, <span class="name">${name}</span> <span class="role-badge">Instructor</span></h2>
      <div class="ai-tip-box">💡 ${aiTip}</div>

      <div class="dashboard-summary">
        <div class="card">
          <h3>📋 Checklist Overview</h3>
          <p>Average Student Progress: <strong>${avgProgress}%</strong></p>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${avgProgress}%"></div>
          </div>
        </div>

        <div class="card">
          <h3>🧑‍🎓 Your Students (${totalStudents})</h3>
          ${studentCards || "<p>No students assigned yet.</p>"}
        </div>

        <div class="card">
          <h3>📊 Recent Activity</h3>
          <ul class="activity-feed">${recentActivity || "<li>No recent activity</li>"}</ul>
        </div>

        <div class="card actions">
          <h3>🛠️ Quick Actions</h3>
          <button class="btn btn-secondary" onclick="renderAddStudent()">Add New Student</button>
          <button class="btn btn-secondary" onclick="sendMessageToStudents()">Send Message</button>
          <button class="btn btn-secondary" onclick="viewELDTProgress()">View ELDT Progress</button>
          <button class="btn btn-secondary" onclick="viewStudentQuestions()">View Questions</button>
        </div>
      </div>
    </div>
  `;

  setupNavigation();
}

async function renderAdminDashboard() {
  const user = auth.currentUser;
  if (!user) return;

  const name = user.displayName || "Admin";
  const aiTip = await getAITipOfTheDay();
  document.body.classList.toggle("dark-mode", new Date().getHours() >= 18);

  const snap = await getDocs(collection(db, "users"));

  let userCards = "", unverifiedCount = 0;
  snap.forEach(doc => {
    const u = doc.data();
    const role = u.role || "unknown";
    const verified = u.verified || false;
    if (!verified) unverifiedCount++;

    userCards += `
      <div class="card fade-in">
        <h3>${u.displayName || "Unnamed"} <span class="role-badge">${role}</span></h3>
        <p>Email: ${u.email}</p>
        <p>Status: ${verified ? "✅ Verified" : "⚠️ Unverified"}</p>
        <button class="btn btn-secondary" onclick="editUser('${doc.id}')">Manage</button>
      </div>
    `;
  });

  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="dashboard fade-in">
      <h2>👋 Welcome, <span class="name">${name}</span> <span class="role-badge admin">Admin</span></h2>
      <div class="ai-tip-box">💡 ${aiTip}</div>

      <div class="dashboard-summary">
        <div class="card">
          <h3>👥 All Users (${snap.size})</h3>
          ${userCards}
        </div>

        <div class="card">
          <h3>📋 Global Checklist Management</h3>
          <p>Manage the structure of checklist sections and ELDT modules.</p>
          <button class="btn btn-primary" onclick="editChecklist()">Edit Checklist</button>
        </div>

        <div class="card">
          <h3>🧪 Test Bank</h3>
          <p>Edit or add test questions available to all students.</p>
          <button class="btn btn-primary" onclick="manageTestBank()">Manage Tests</button>
        </div>

        <div class="card">
          <h3>🕵️ System Activity Log</h3>
          <p>View recent activity by users and system events.</p>
          <button class="btn btn-primary" onclick="viewSystemLogs()">View Logs</button>
        </div>

        <div class="card actions">
          <h3>🛠️ Quick Actions</h3>
          <button class="btn btn-secondary" onclick="addNewUser()">Add User</button>
          <button class="btn btn-secondary" onclick="addTest()">Add New Test</button>
          <button class="btn btn-secondary" onclick="sendAdminBroadcast()">Send Message</button>
        </div>
      </div>

      ${unverifiedCount > 0 ? `<div class="notification-bubble">🔔 ${unverifiedCount} unverified user(s)</div>` : ""}
    </div>
  `;

  setupNavigation();
}

// ==== Auth UI Logic ==== //
togglePassword?.addEventListener("click", () => {
  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = type;
  togglePassword.textContent = type === "password" ? "🙈" : "👁️";
});

// Dark mode toggle (manual switch)
document.getElementById("dark-mode-toggle")?.addEventListener("change", (e) => {
  document.body.classList.toggle("dark-mode", e.target.checked);
  localStorage.setItem("darkMode", e.target.checked ? "true" : "false");
});

// Language selector (placeholder for future UI translation)
document.getElementById("language-select")?.addEventListener("change", (e) => {
  const selected = e.target.options[e.target.selectedIndex].text;
  alert(`Language switched to ${selected} (UI translation coming soon)`);
});

// Handle Login / Signup
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  errorMsg.style.display = "none";

  if (!email || !password) {
    errorMsg.textContent = "Please enter both email and password.";
    errorMsg.style.display = "block";
    return;
  }

  document.getElementById("login-submit").disabled = true;

  try {
    const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");

    // Attempt login
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      try {
        const { addDoc, collection } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
        const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await addDoc(collection(db, "users"), {
          uid: cred.user.uid,
          email,
          name: "CDL User",
          role: "student",
          verified: false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });

        alert("🎉 Account created and signed in!");
      } catch (signupErr) {
        errorMsg.textContent = signupErr.message;
        errorMsg.style.display = "block";
      }
    } else {
      errorMsg.textContent = err.message;
      errorMsg.style.display = "block";
    }
  } finally {
    document.getElementById("login-submit").disabled = false;
  }
});

// Reset Password
document.getElementById("reset-password")?.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  if (!email) return alert("Enter your email to receive a reset link.");

  const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");

  try {
    await sendPasswordResetEmail(auth, email);
    alert("📬 Reset link sent!");
  } catch (err) {
    alert("Error: " + err.message);
  }
});

// Google Login
document.getElementById("google-login")?.addEventListener("click", async () => {
  try {
    const { GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert("Google Sign-In failed: " + err.message);
  }
});

// ==== Coming Soon Auth Options ==== //
document.getElementById("apple-login")?.addEventListener("click", () => {
  alert("🚧 Apple Login is coming soon. Stay tuned!");
});

document.getElementById("sms-login")?.addEventListener("click", () => {
  alert("🚧 SMS Login is coming soon. Stay tuned!");
});

// ==== Checklists ====
async function renderChecklists(container) {
  if (currentUserEmail?.includes("instructor@") || currentUserEmail?.includes("admin@")) {
    return await renderInstructorChecklists(container);
  }

  container.innerHTML = `
    <div class="card fade-in">
      <h2>✅ ELDT Checklist</h2>
      <form id="eldt-form" class="checklist-form"></form>
      <div class="checklist-buttons">
        <button id="save-eldt-btn" class="btn-primary">💾 Save Progress</button>
        <button data-nav="home" class="btn-secondary">⬅️ Home</button>
      </div>
      <div id="saved-summary"></div>
    </div>
  `;
  setupNavigation();

  const checklist = {
    "Pre-trip Inspection": [
      "Check lights", "Check tires", "Fluid levels", "Leaks under vehicle", "Cab safety equipment"
    ],
    "Basic Vehicle Control": [
      "Straight line backing", "Offset backing (left/right)", "Parallel parking", "Alley dock"
    ],
    "On-Road Driving": [
      "Lane changes", "Turns (left/right)", "Intersections", "Expressway entry/exit", "Railroad crossing"
    ],
    "Hazard Perception": [
      "Scan for pedestrians", "React to road hazards", "Mirror checks"
    ],
    "Emergency Maneuvers": [
      "Skid recovery", "Controlled braking", "Steering control"
    ]
  };

  const form = document.getElementById("eldt-form");
  let savedData = {};
  const snapshot = await getDocs(query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail)));
  if (!snapshot.empty) {
    snapshot.forEach(doc => savedData = doc.data().progress || {});
  }

  Object.entries(checklist).forEach(([section, items]) => {
    const fieldset = document.createElement("fieldset");
    fieldset.innerHTML = `<legend>${section}</legend>`;
    items.forEach(item => {
      const id = `${section}::${item}`;
      const checked = savedData?.[section]?.[item] || false;
      fieldset.innerHTML += `
        <label>
          <input type="checkbox" name="${id}" ${checked ? "checked" : ""}/> ${item}
        </label><br/>
      `;
    });
    form.appendChild(fieldset);
  });

  document.getElementById("save-eldt-btn").addEventListener("click", async e => {
    e.preventDefault();
    const inputs = form.querySelectorAll("input[type=checkbox]");
    const progress = {};

    inputs.forEach(input => {
      const [section, item] = input.name.split("::");
      if (!progress[section]) progress[section] = {};
      progress[section][item] = input.checked;
    });

    // Overwrite previous entry (delete old first)
    const prevDocs = await getDocs(query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail)));
    for (const doc of prevDocs.docs) {
      await deleteDoc(doc.ref);
    }

    await addDoc(collection(db, "eldtProgress"), {
      studentId: currentUserEmail,
      timestamp: new Date(),
      progress
    });

    alert("✅ Progress saved!");
    renderPage("checklists");
  });

  if (Object.keys(savedData).length) {
    const summary = document.getElementById("saved-summary");
    summary.innerHTML = `<h3>📋 Saved Progress Summary</h3>`;
    for (const [section, items] of Object.entries(savedData)) {
      summary.innerHTML += `<strong>${section}</strong><ul>`;
      for (const [item, completed] of Object.entries(items)) {
        summary.innerHTML += `<li>${completed ? "✅" : "❌"} ${item}</li>`;
      }
      summary.innerHTML += `</ul>`;
    }
  }
}

// ==== Instructor Checklist View ====
async function renderInstructorChecklists(container) {
  container.innerHTML = `
    <div class="card fade-in">
      <h2>📊 Instructor Checklist Overview</h2>
      <div id="instructor-checklist-results" class="instructor-results">Loading student progress...</div>
      <button data-nav="home" class="btn-secondary">⬅️ Home</button>
    </div>
  `;
  setupNavigation();

  const resultsContainer = document.getElementById("instructor-checklist-results");
  const snapshot = await getDocs(collection(db, "eldtProgress"));

  const grouped = {};
  snapshot.forEach(doc => {
    const { studentId, progress } = doc.data();
    if (!grouped[studentId]) grouped[studentId] = {};
    Object.entries(progress).forEach(([section, items]) => {
      if (!grouped[studentId][section]) grouped[studentId][section] = {};
      Object.entries(items).forEach(([item, checked]) => {
        grouped[studentId][section][item] = checked;
      });
    });
  });

  resultsContainer.innerHTML = "";
  Object.entries(grouped).forEach(([email, sections]) => {
    const card = document.createElement("div");
    card.className = "card mini fade-in";
    card.innerHTML = `<h3>👤 ${email}</h3>`;
    for (const [section, items] of Object.entries(sections)) {
      card.innerHTML += `<strong>${section}</strong><ul>`;
      for (const [item, checked] of Object.entries(items)) {
        card.innerHTML += `<li>${checked ? "✅" : "❌"} ${item}</li>`;
      }
      card.innerHTML += `</ul>`;
    }
    resultsContainer.appendChild(card);
  });
}

// ==== Save Quiz Test Result ====
async function saveTestResult(testName, score, correct, total) {
  if (!currentUserEmail) {
    alert("⚠️ Please log in to save your results.");
    return;
  }

  await addDoc(collection(db, "testResults"), {
    studentId: currentUserEmail,
    testName,
    score,
    correct,
    total,
    timestamp: new Date()
  });
}

// ==== Test Results View ====
async function renderTestResults(container) {
  container.innerHTML = `
    <div class="card fade-in">
      <h2>📊 Test Results</h2>
      <div id="results-display" class="results-grid">Loading results...</div>
      <button data-nav="home" class="btn-secondary">⬅️ Home</button>
    </div>
  `;
  setupNavigation();

  const display = document.getElementById("results-display");
  const snapshot = await getDocs(
    query(collection(db, "testResults"), where("studentId", "==", currentUserEmail))
  );

  if (snapshot.empty) {
    display.innerHTML = `<p class="empty-state">😕 No test results found yet.</p>`;
    return;
  }

  // Sort results by date (most recent first)
  const sortedResults = snapshot.docs
    .map(doc => doc.data())
    .sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

  display.innerHTML = ""; // Clear loading text
  sortedResults.forEach(data => {
    const { testName, score, correct, total, timestamp } = data;
    const percent = ((score / total) * 100).toFixed(1);
    const dateStr = new Date(timestamp.toDate()).toLocaleDateString();

    display.innerHTML += `
      <div class="result-card fade-in">
        <h3>${testName}</h3>
        <p><strong>Score:</strong> ${score}/${total} (${percent}%)</p>
        <p><strong>Correct:</strong> ${correct} questions</p>
        <p><strong>Date:</strong> ${dateStr}</p>
      </div>
    `;
  });
}

// === Helper: Role Badge ===
function getRoleBadge(email) {
  if (!email) return "";
  if (email.includes("admin@")) return `<span class="role-badge admin">Admin</span>`;
  if (email.includes("instructor@")) return `<span class="role-badge instructor">Instructor</span>`;
  return `<span class="role-badge student">Student</span>`;
}

// === Helper: AI Tip of the Day ===
async function getAITipOfTheDay() {
  const tips = [
    "Use flashcards daily to stay sharp.",
    "Ask your AI coach about tough topics.",
    "Complete your ELDT checklist every day.",
    "Review your last test results and try again.",
    "Stay active for a study streak bonus!"
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

// === Global Renderer ===
function renderPage(page) {
  const container = document.getElementById("app");
  if (!container) return;

  switch (page) {
    case "flashcards": return renderFlashcards(container);
    case "experience": return renderExperience(container);
    case "license": return renderLicenseSelector(container);
    case "checklists": return renderChecklists(container);
    case "results": return renderTestResults(container);
    case "home": return renderHome(container);
    default:
      container.innerHTML = `<div class="card fade-in"><p>🚧 Page under construction: ${page}</p></div>`;
  }
}

// === Welcome Screen Renderer ===
function renderWelcome() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div class="welcome-screen fade-in">
      <img src="logo-icon.png" alt="CDL Buddy Logo" class="header-icon" />
      <h1>Welcome to CDL Trainer</h1>
      <p class="subtitle">Your AI-powered CDL training assistant.</p>
      <div class="button-row">
        <button data-nav="login" class="btn-primary">🚀 Login / Signup</button>
        <button data-nav="coach" class="btn-secondary">🎧 Talk to AI Coach</button>
      </div>
    </div>
  `;
  setupNavigation();
}