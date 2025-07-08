// ==== Firebase Setup ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

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

// ==== Firebase Config ====
const firebaseConfig = {
  apiKey: "AIzaSyCHGQzw-QXk-tuT2Zf8EcbQRz7E0Zms-7A",
  authDomain: "cdltrainerapp.firebaseapp.com",
  projectId: "cdltrainerapp",
  storageBucket: "cdltrainerapp.appspot.com",
  messagingSenderId: "977549527480",
  appId: "1:977549527480:web:e959926bb02a4cef65674d"
};

// ==== Initialize Core Services ====
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ==== Global User Reference ====
let currentUserEmail = null;

// ==== Auth State Listener ====
onAuthStateChanged(auth, async (user) => {
  const app = document.getElementById("app");
  const logoutBtn = document.getElementById("logout-btn");

  // Show loading while checking auth state
  app.innerHTML = `
    <div class="card fade-in">
      <p>🔄 Loading...</p>
    </div>
  `;

  if (user) {
    currentUserEmail = user.email;

    // Handle logout button
    if (logoutBtn) {
      logoutBtn.style.display = "inline-block";

      // Remove old listeners by cloning
      const newLogoutBtn = logoutBtn.cloneNode(true);
      logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);

      newLogoutBtn.addEventListener("click", async () => {
        try {
          await signOut(auth);
          alert("You’ve been logged out.");
          location.reload(); // reload to re-trigger auth state check
        } catch (err) {
          console.error("Logout failed:", err);
          alert("Error logging out. Try again.");
        }
      });
    }

    // Allow Firebase to fully sync before rendering home
    setTimeout(() => renderPage("home"), 250);
  } else {
    currentUserEmail = null;

    // Hide logout button if it exists
    if (logoutBtn) logoutBtn.style.display = "none";

    // Show welcome screen for unauthenticated users
    setTimeout(() => renderWelcome(), 200);
  }
});

// ==== Auth State Listener ====
onAuthStateChanged(auth, async (user) => {
  const app = document.getElementById("app");
  const logoutBtn = document.getElementById("logout-btn");

  // === Animated loading screen ===
  app.innerHTML = `
    <div class="screen-wrapper fade-in" style="text-align:center">
      <div class="loading-spinner" style="margin: 40px auto;"></div>
      <p>Checking your credentials...</p>
    </div>
  `;

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
      console.error("User profile error:", err);
      app.innerHTML = `<div class="card"><p>Error loading profile.</p></div>`;
      return;
    }

    // === 4. Setup logout button ===
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
    currentUserEmail = null;
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
    } else if (currentUserEmail.includes("admin@") || currentUserEmail.includes("instructor@")) {
      renderInstructorDashboard(app);
    } else {
      renderDashboard(app);
    }
  } else {
    renderPage(targetPage);
  }

  // Animate fade-in + scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => {
    app.classList.remove("fade-out");
    app.classList.add("fade-in");
  }, 10);
}
// ==== Home Screen ====
async function renderHome(container slide-in-up fade-in) {
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
    const pct = total ? Math.round((done/total)*100) : 0;
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
      if (!last || d.timestamp.toDate() > last.timestamp.toDate()) last = d;
    });
    if (last) {
      document.getElementById("latest-score").innerHTML = `
        <h4>📘 Last Test: ${last.testName}</h4>
        <p>Score: ${last.correct}/${last.total} (${Math.round((last.correct/last.total)*100)}%)</p>
        <p><small>${new Date(last.timestamp.toDate()).toLocaleDateString()}</small></p>
      `;
    }
  }

  // 🌙 Auto Dark Mode after 6pm
  const hr = new Date().getHours();
  document.body.classList.toggle("dark", hr >= 18 || hr < 6);
}

// ==== Flashcards ====
function renderFlashcards(container) {
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

  // Dark mode after 6pm
  const now = new Date();
  document.body.classList.toggle("dark-mode", now.getHours() >= 18);

  // Fetch Profile Data
  let license = "Not selected", experience = "Unknown", streak = 0;
  let testData = null, checklistPct = 0, checklistStatus = "✅";

  // 🔍 Checklist Progress
  const eldtSnap = await getDocs(query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail)));
  let total = 0, done = 0;
  eldtSnap.forEach(doc => {
    const prog = doc.data().progress;
    Object.values(prog).forEach(sec => Object.values(sec).forEach(val => { total++; if (val) done++; }));
  });
  checklistPct = total ? Math.round((done / total) * 100) : 0;
  if (checklistPct < 100) checklistStatus = "❌";

  // 🧪 Last Test Score
  const testSnap = await getDocs(query(collection(db, "testResults"), where("studentId", "==", currentUserEmail)));
  testSnap.forEach(doc => {
    const d = doc.data();
    if (!testData || d.timestamp.toDate() > testData.timestamp.toDate()) testData = d;
  });

  // 👤 Profile Summary
  const licenseSnap = await getDocs(query(collection(db, "licenseSelection"), where("studentId", "==", currentUserEmail)));
  licenseSnap.forEach(doc => license = doc.data().licenseType || license);
  const expSnap = await getDocs(query(collection(db, "experienceResponses"), where("studentId", "==", currentUserEmail)));
  expSnap.forEach(doc => experience = doc.data().experience || experience);

  // 🔥 Study Streak via localStorage
  const today = new Date().toDateString();
  let studyLog = JSON.parse(localStorage.getItem("studyLog") || "[]");
  if (!studyLog.includes(today)) {
    studyLog.push(today);
    localStorage.setItem("studyLog", JSON.stringify(studyLog));
  }
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6);
  streak = studyLog.filter(date => new Date(date) >= cutoff).length;

  // Actions
  const showChecklistBtn = checklistPct < 100;
  const showTestBtn = !testData;

  // Render UI
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
        <p>${streak} days active this week</p>
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
  const now = new Date();
  const isDarkMode = now.getHours() >= 18;

  document.body.classList.toggle("dark-mode", isDarkMode);

  const studentsRef = collection(db, "users");
  const q = query(studentsRef, where("role", "==", "student"), where("assignedInstructor", "==", user.uid));
  const querySnapshot = await getDocs(q);

  let studentCards = "";
  let totalProgress = 0;
  let totalStudents = 0;
  let activityFeed = [];

  for (const doc of querySnapshot.docs) {
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
      activityFeed.push(...student.activityLog.map(a => ({
        name: student.displayName || "Student",
        message: a,
        timestamp: student.lastActive
      })));
    }
  }

  const avgProgress = totalStudents ? Math.round(totalProgress / totalStudents) : 0;
  activityFeed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const recentActivity = activityFeed.slice(0, 5).map(entry => `
    <li><strong>${entry.name}</strong>: ${entry.message} (${entry.timestamp || "recently"})</li>
  `).join("");

  app.innerHTML = `
    <div class="dashboard fade-in">
      <h2 class="fade-in">👋 Welcome, <span class="name">${name}</span> <span class="role-badge">Instructor</span></h2>
      <div class="ai-tip-box fade-in">💡 ${aiTip}</div>

      <div class="dashboard-summary fade-in">
        <div class="card">
          <h3>📋 Checklist Overview</h3>
          <p>Average Student Progress: <strong>${avgProgress}%</strong></p>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${avgProgress}%;"></div>
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
}

async function renderAdminDashboard() {
  const user = auth.currentUser;
  if (!user) return;

  const name = user.displayName || "Admin";
  const aiTip = await getAITipOfTheDay();
  const now = new Date();
  document.body.classList.toggle("dark-mode", now.getHours() >= 18);

  const usersRef = collection(db, "users");
  const querySnapshot = await getDocs(usersRef);

  let userCards = "", unverifiedCount = 0;

  querySnapshot.forEach(doc => {
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

  app.innerHTML = `
    <div class="dashboard fade-in">
      <h2 class="fade-in">👋 Welcome, <span class="name">${name}</span> <span class="role-badge admin">Admin</span></h2>
      <div class="ai-tip-box fade-in">💡 ${aiTip}</div>

      <div class="dashboard-summary fade-in">
        <div class="card">
          <h3>👥 All Users (${querySnapshot.size})</h3>
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
}

function renderAddStudent() {
  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Add Student</h3>
        <input type="text" id="studentName" placeholder="Student Name" />
        <input type="email" id="studentEmail" placeholder="Email" />
        <button onclick="submitNewStudent()">Add</button>
        <button onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  showModal(html);
}

async function submitNewStudent() {
  const name = document.getElementById("studentName").value;
  const email = document.getElementById("studentEmail").value;
  const instructorId = auth.currentUser.uid;

  if (!email) return alert("Email is required.");

  await addDoc(collection(db, "users"), {
    displayName: name,
    email,
    role: "student",
    assignedInstructor: instructorId,
    checklistProgress: 0,
    createdAt: new Date().toISOString()
  });

  closeModal();
  renderInstructorDashboard();
}

async function sendMessageToStudents() {
  const msg = prompt("Enter message for all your students:");
  if (!msg) return;

  const instructorId = auth.currentUser.uid;
  const q = query(collection(db, "users"), where("role", "==", "student"), where("assignedInstructor", "==", instructorId));
  const snap = await getDocs(q);

  for (const doc of snap.docs) {
    const studentId = doc.id;
    await addDoc(collection(db, "users", studentId, "messages"), {
      sender: auth.currentUser.displayName || "Instructor",
      message: msg,
      timestamp: new Date().toISOString()
    });
  }

  alert("Message sent to all students.");
}

async function viewELDTProgress() {
  const instructorId = auth.currentUser.uid;
  const q = query(collection(db, "users"), where("role", "==", "student"), where("assignedInstructor", "==", instructorId));
  const snap = await getDocs(q);

  let html = "<h3>ELDT Progress</h3><ul>";
  for (const doc of snap.docs) {
    const student = doc.data();
    const progress = student.checklistProgress || 0;
    html += `<li>${student.displayName || "Student"}: ${progress}%</li>`;
  }
  html += "</ul><button onclick='closeModal()'>Close</button>";

  showModal(`<div class="modal-content">${html}</div>`);
}

async function editUser(userId) {
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return alert("User not found.");

  const user = docSnap.data();
  const currentRole = user.role || "student";
  const verified = user.verified ? "checked" : "";

  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Edit User</h3>
        <label>Role:
          <select id="roleSelect">
            <option value="student" ${currentRole === "student" ? "selected" : ""}>Student</option>
            <option value="instructor" ${currentRole === "instructor" ? "selected" : ""}>Instructor</option>
            <option value="admin" ${currentRole === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </label>
        <label><input type="checkbox" id="verifyCheck" ${verified}> Verified</label>
        <button onclick="saveUserEdits('${userId}')">Save</button>
        <button onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  showModal(html);
}

async function saveUserEdits(userId) {
  const role = document.getElementById("roleSelect").value;
  const verified = document.getElementById("verifyCheck").checked;

  await updateDoc(doc(db, "users", userId), { role, verified });
  closeModal();
  renderAdminDashboard();
}

function editChecklist() {
  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Edit Global Checklist</h3>
        <p>This will open a dedicated editor page for checklists.</p>
        <button onclick="window.location.href='checklist-editor.html'">Go to Editor</button>
        <button onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  showModal(html);
}

async function manageTestBank() {
  const testsRef = collection(db, "tests");
  const snapshot = await getDocs(testsRef);
  let testList = "";

  snapshot.forEach(doc => {
    const test = doc.data();
    testList += `<li>${test.title || "Untitled"} <button onclick="editTest('${doc.id}')">Edit</button></li>`;
  });

  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Test Bank</h3>
        <ul>${testList}</ul>
        <button onclick="addTest()">+ Add New Test</button>
        <button onclick="closeModal()">Close</button>
      </div>
    </div>
  `;
  showModal(html);
}

function editTest(testId) {
  alert("Test Editor for test ID: " + testId); // You can replace this with a form-based editor
}

async function viewSystemLogs() {
  const logsRef = collection(db, "logs");
  const q = query(logsRef, orderBy("timestamp", "desc"), limit(10));
  const snapshot = await getDocs(q);

  let logList = "";
  snapshot.forEach(doc => {
    const log = doc.data();
    logList += `<li>${log.message} <small>${log.timestamp}</small></li>`;
  });

  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>System Activity Logs</h3>
        <ul>${logList}</ul>
        <button onclick="closeModal()">Close</button>
      </div>
    </div>
  `;
  showModal(html);
}

function addNewUser() {
  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Add New User</h3>
        <input type="text" id="newUserName" placeholder="Full Name" />
        <input type="email" id="newUserEmail" placeholder="Email" />
        <select id="newUserRole">
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
        </select>
        <button onclick="createUser()">Create</button>
        <button onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  showModal(html);
}

async function createUser() {
  const name = document.getElementById("newUserName").value;
  const email = document.getElementById("newUserEmail").value;
  const role = document.getElementById("newUserRole").value;

  if (!email) return alert("Email required.");
  await addDoc(collection(db, "users"), {
    displayName: name,
    email,
    role,
    verified: false,
    createdAt: new Date().toISOString()
  });

  closeModal();
  renderAdminDashboard();
}

function addTest() {
  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Add New Test</h3>
        <input type="text" id="newTestTitle" placeholder="Test Title" />
        <button onclick="createTest()">Create</button>
        <button onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  showModal(html);
}

async function createTest() {
  const title = document.getElementById("newTestTitle").value;
  if (!title) return alert("Title required.");
  await addDoc(collection(db, "tests"), { title, questions: [], createdAt: new Date().toISOString() });
  closeModal();
  renderAdminDashboard();
}

function sendAdminBroadcast() {
  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Broadcast Message</h3>
        <textarea id="broadcastMessage" placeholder="Message to all users"></textarea>
        <button onclick="sendBroadcast()">Send</button>
        <button onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  showModal(html);
}

async function sendBroadcast() {
  const msg = document.getElementById("broadcastMessage").value;
  if (!msg) return alert("Message required.");

  await addDoc(collection(db, "notifications"), {
    message: msg,
    timestamp: new Date().toISOString(),
    target: "all"
  });

  closeModal();
  alert("Message sent to all users.");
}

function renderWalkthrough(container) {
  container.innerHTML = `
    <div class="card">
      <h2>🧭 ELDT Walkthrough</h2>
      <ul>
        <li>✅ Identify vehicle type</li>
        <li>🛠️ Inspect lights, tires, fluids</li>
        <li>📄 Match FMCSA standards</li>
      </ul>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
}

function renderPracticeTests(container) {
  container.innerHTML = `
    <div class="card">
      <h2>📝 Practice Tests</h2>
      <ul>
        <li><button data-nav="quiz-general">📘 General Knowledge</button></li>
        <li><button data-nav="quiz-air">💨 Air Brakes</button></li>
        <li><button data-nav="quiz-combo">🚛 Combination Vehicles</button></li>
      </ul>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
}

function renderAICoach(container) {
  container.innerHTML = `
    <div class="card">
      <h2>🎧 AI Coach</h2>
      <p>Ask questions and get CDL prep help.</p>
      <em>Coming soon</em>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
}

function renderWelcome() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="welcome-screen slide-in-up fade-in">
      <img src="logo-icon.png" alt="CDL Icon" class="header-icon scale-in" />
      <h1>Welcome to CDL Trainer</h1>
      <p class="subtitle">Your personalized training coach for CDL success</p>
      <div class="button-group">
        <button data-nav="login" class="primary-btn">🚀 Get Started</button>
        <button data-nav="license" class="secondary-btn">🔍 Explore License Paths</button>
      </div>
    </div>
  `;
  setupNavigation();
}

function renderLogin(container) {
  container.innerHTML = `
    <div class="card login-card slide-in-up fade-in">
      <h2>🔐 Login</h2>
      <form id="login-form">
        <label for="email">Email:</label><br/>
        <input type="email" id="email" placeholder="Enter email" required autofocus /><br/>

        <label for="password">Password:</label><br/>
        <div class="password-wrapper">
          <input type="password" id="password" placeholder="Enter password" required />
          <button type="button" id="toggle-password" aria-label="Show/Hide Password">👁️</button>
        </div>

        <div class="login-options">
          <label><input type="checkbox" id="remember-me" /> Remember Me</label>
          <a href="#" id="reset-password">Forgot Password?</a>
        </div>

        <button type="submit" id="login-submit">🔓 Sign In</button>

        <p class="or-divider">OR</p>
        <div class="alt-login-buttons">
          <button type="button" id="google-login">🔵 Sign in with Google</button>
          <button type="button" id="apple-login"> Apple Login (Coming Soon)</button>
          <button type="button" id="sms-login">📱 SMS Login (Coming Soon)</button>
        </div>

        <p id="login-error" class="error-text" style="display:none;"></p>
      </form>

      <div class="test-account-hint">
        <strong>Test Account:</strong><br/>
        Email: <code>student1@sample.com</code><br/>
        Password: <code>cdltrainer</code>
      </div>

      <div class="login-extras">
        <select id="language-select">
          <option value="en" selected>🇺🇸 English</option>
          <option value="es">🇪🇸 Español</option>
          <option value="fr">🇫🇷 Français</option>
          <option value="de">🇩🇪 Deutsch</option>
        </select>

        <label><input type="checkbox" id="dark-mode-toggle" /> 🌙 Dark Mode</label>
      </div>

      <footer class="login-footer">
        <small>Version 1.0 • Built by CDL Buddy</small>
      </footer>
    </div>
  `;

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginForm = document.getElementById("login-form");
  const errorMsg = document.getElementById("login-error");
  const togglePassword = document.getElementById("toggle-password");

  // Password toggle
  togglePassword.addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    togglePassword.textContent = type === "password" ? "🙈" : "👁️";
  });

  // Dark mode toggle
  document.getElementById("dark-mode-toggle").addEventListener("change", (e) => {
    document.body.classList.toggle("dark-mode", e.target.checked);
  });

  // Language UI switch (placeholder)
  document.getElementById("language-select").addEventListener("change", (e) => {
    alert(`Language switched to ${e.target.options[e.target.selectedIndex].text} (UI translation coming soon)`);
  });

  // Submit handler
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      errorMsg.textContent = "Please enter both email and password.";
      errorMsg.style.display = "block";
      return;
    }

    errorMsg.style.display = "none";
    document.getElementById("login-submit").disabled = true;

    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");

      // Try login
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        try {
          const { addDoc, collection } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
          const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");

          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await addDoc(collection(db, "users"), {
            email,
            name: "CDL User",
            role: "student",
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
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

  // Reset password
  document.getElementById("reset-password").addEventListener("click", async (e) => {
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
  document.getElementById("google-login").addEventListener("click", async () => {
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      alert("Google Sign-In failed: " + err.message);
    }
  });

  // Coming soon placeholders
  document.getElementById("apple-login").addEventListener("click", () => {
    alert(" Apple Login coming soon.");
  });
  document.getElementById("sms-login").addEventListener("click", () => {
    alert("📱 SMS Login coming soon.");
  });
}

// ==== Checklists ====
async function renderChecklists(container) {
  if (currentUserEmail?.includes("instructor@") || currentUserEmail?.includes("admin@")) {
    return await renderInstructorChecklists(container);
  }

  container.innerHTML = `
    <div class="card">
      <h2>✅ ELDT Checklist</h2>
      <form id="eldt-form"></form>
      <button id="save-eldt-btn">💾 Save Progress</button>
      <button data-nav="home">⬅️ Home</button>
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
  snapshot.forEach(doc => savedData = doc.data().progress || {});

  Object.entries(checklist).forEach(([section, items]) => {
    const fieldset = document.createElement("fieldset");
    fieldset.innerHTML = `<legend>${section}</legend>`;
    items.forEach(item => {
      const id = `${section}::${item}`;
      const checked = savedData?.[section]?.[item] || false;
      fieldset.innerHTML += `
        <label><input type="checkbox" name="${id}" ${checked ? "checked" : ""}/> ${item}</label><br/>
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
    await addDoc(collection(db, "eldtProgress"), {
      studentId: currentUserEmail,
      timestamp: new Date(),
      progress
    });
    alert("✅ Checklist saved!");
    renderPage("checklists");
  });

  if (Object.keys(savedData).length) {
    const summary = document.createElement("div");
    summary.innerHTML = `<h3>📋 Saved Progress Summary</h3>`;
    for (const [section, items] of Object.entries(savedData)) {
      summary.innerHTML += `<strong>${section}</strong><ul>`;
      for (const [item, completed] of Object.entries(items)) {
        summary.innerHTML += `<li>${completed ? "✅" : "❌"} ${item}</li>`;
      }
      summary.innerHTML += `</ul>`;
    }
    container.querySelector(".card").appendChild(summary);
  }
}

// ==== Instructor Checklist View ====
async function renderInstructorChecklists(container) {
  container.innerHTML = `
    <div class="card">
      <h2>📊 Instructor Checklist Overview</h2>
      <div id="instructor-checklist-results">Loading...</div>
      <button data-nav="home">⬅️ Home</button>
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

  Object.entries(grouped).forEach(([email, sections]) => {
    const card = document.createElement("div");
    card.className = "card";
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
  if (!currentUserEmail) return alert("Please log in to save results.");
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
    <div class="card">
      <h2>📊 Test Results</h2>
      <div id="results-display">Loading...</div>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();

  const display = document.getElementById("results-display");
  const snapshot = await getDocs(query(collection(db, "testResults"), where("studentId", "==", currentUserEmail)));
  display.innerHTML = snapshot.empty ? "<p>No test results found.</p>" : "";

  snapshot.forEach(doc => {
    const data = doc.data();
    display.innerHTML += `
      <div class="result-card">
        <h4>${data.testName}</h4>
        <p>Score: ${data.score}/${data.total}</p>
        <p>Date: ${new Date(data.timestamp.toDate()).toLocaleDateString()}</p>
      </div>
    `;
  });
}