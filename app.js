// ─────────────────────────────────────────────────────────────────────────────
// app.js
// ─────────────────────────────────────────────────────────────────────────────

// 1️⃣ Imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  doc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import {
  setupNavigation,
  showToast,
  getRoleBadge,
  getAITipOfTheDay,
  openStudentHelpForm
} from './ui-helpers.js';

// 2️⃣ Firebase config & init
const firebaseConfig = {
  apiKey:            "AIzaSyCHGQzw-QXk-tuT2Zf8EcbQRz7E0Zms-7A",
  authDomain:        "cdltrainerapp.firebaseapp.com",
  projectId:         "cdltrainerapp",
  storageBucket:     "cdltrainerapp.appspot.com",
  messagingSenderId: "977549527480",
  appId:             "1:977549527480:web:e959926bb02a4cef65674d",
  measurementId:     "G-MJ22BD2J1J"
};
initializeApp(firebaseConfig);
const auth = getAuth();
const db   = getFirestore();

// ─────────────────────────────────────────────────────────────────────────────
// Page renders
// ─────────────────────────────────────────────────────────────────────────────

export function renderLogin() {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="login-card fade-in">
      <h2>🚀 Login or Signup</h2>
      <form id="login-form">
        <input id="email" type="email" placeholder="Email" required />
        <div class="password-wrapper">
          <input id="password" type="password" placeholder="Password" required />
          <button type="button" id="toggle-password" class="toggle-password">👁️</button>
        </div>
        <div id="error-msg" class="error-message" style="display:none;"></div>
        <button id="login-submit" type="submit">Login / Signup</button>
      </form>
      <div class="alt-login-buttons">
        <button id="google-login" class="btn-google">Continue with Google</button>
        <button id="apple-login" class="btn-apple"> Apple Login</button>
        <button id="sms-login" class="btn-sms">📱 SMS Login</button>
        <p><a href="#" id="reset-password">Forgot password?</a></p>
      </div>
    </div>
  `;
  setupNavigation();

  const loginForm     = document.getElementById("login-form");
  const emailInput    = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const toggleBtn     = document.getElementById("toggle-password");
  const errorMsg      = document.getElementById("error-msg");
  const submitBtn     = document.getElementById("login-submit");
  const googleBtn     = document.getElementById("google-login");
  const appleBtn      = document.getElementById("apple-login");
  const smsBtn        = document.getElementById("sms-login");
  const resetLink     = document.getElementById("reset-password");

  // Toggle password visibility
  toggleBtn.addEventListener("click", () => {
    const hidden = passwordInput.type === "password";
    passwordInput.type = hidden ? "text" : "password";
    toggleBtn.textContent = hidden ? "🙈" : "👁️";
  });

  // Email/password login & signup
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const pwd   = passwordInput.value;
    errorMsg.style.display = "none";
    if (!email || !pwd) {
      errorMsg.textContent = "Please enter both email and password.";
      errorMsg.style.display = "block";
      return;
    }
    submitBtn.disabled = true;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pwd);
      showToast(`🎉 Signed in as ${email}`);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, pwd);
          await addDoc(collection(db, "users"), {
            uid:       cred.user.uid,
            email,
            name:      "CDL User",
            role:      "student",
            verified:  false,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          });
          showToast("🎉 Account created and signed in!");
        } catch (suErr) {
          errorMsg.textContent = suErr.message;
          errorMsg.style.display = "block";
        }
      } else {
        errorMsg.textContent = err.message;
        errorMsg.style.display = "block";
      }
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Password reset
  resetLink.addEventListener("click", async e => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return showToast("Enter your email first.");
    try {
      await sendPasswordResetEmail(auth, email);
      showToast("📬 Reset link sent!");
    } catch (err) {
      showToast("Error: " + err.message);
    }
  });

  // Google Sign-In
  googleBtn.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      showToast("Google Sign-In failed: " + err.message);
    }
  });

  // Other placeholders
  appleBtn.addEventListener("click", () => showToast("🚧 Apple Login coming soon."));
  smsBtn.addEventListener("click",   () => showToast("🚧 SMS Login coming soon."));
}

export async function renderDashboard() {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  appEl.innerHTML = `<div class="dashboard-card">Loading your dashboard…</div>`;
  const container = document.querySelector(".dashboard-card");

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");
    const uid       = user.uid;
    const email     = user.email || "";
    const name      = email.split("@")[0];
    const roleBadge = getRoleBadge(email);
    const aiTip     = await getAITipOfTheDay();
    document.body.classList.toggle("dark-mode", new Date().getHours() >= 18);

    // ELDT progress (scan+filter by UID)
    let total = 0, done = 0;
    const eldtSnap = await getDocs(collection(db, "eldtProgress"));
    eldtSnap.forEach(doc => {
      if (!doc.id.startsWith(`${uid}-section-`)) return;
      const prog = doc.data().progress || {};
      Object.values(prog).flatMap(Object.values).forEach(v => {
        total++; if (v) done++;
      });
    });
    const checklistPct     = total ? Math.round(done/total * 100) : 0;
    const showChecklistBtn = checklistPct < 100;

    // Test results by UID
    let testData = null;
    const testSnap = await getDocs(
      query(collection(db, "testResults"), where("studentId","==",uid))
    );
    testSnap.forEach(d => {
      const data = d.data();
      if (!testData || data.timestamp.toDate() > testData.timestamp.toDate()) {
        testData = data;
      }
    });
    const showTestBtn = !testData;

    // Profile selections by UID
    let license = "Not selected";
    const licSnap = await getDocs(
      query(collection(db, "licenseSelection"), where("studentId","==",uid))
    );
    licSnap.forEach(d => license = d.data().licenseType || license);

    let experience = "Unknown";
    const expSnap = await getDocs(
      query(collection(db, "experienceResponses"), where("studentId","==",uid))
    );
    expSnap.forEach(d => experience = d.data().experience || experience);

    // Study streak
    const today  = new Date().toDateString();
    let log     = JSON.parse(localStorage.getItem("studyLog")||"[]");
    if (!log.includes(today)) {
      log.push(today);
      localStorage.setItem("studyLog", JSON.stringify(log));
    }
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-6);
    const streak = log.filter(d=>new Date(d)>=cutoff).length;

    // Render
    container.innerHTML = `
      <h1>Welcome back, ${name}!</h1>
      ${roleBadge}
      <div class="ai-tip-box">💡 ${aiTip}</div>
      <div class="dashboard-summary">
        <div class="dashboard-card">
          <h3>📋 Checklist</h3>
          <div class="progress-track"><div class="progress-fill" style="width:${checklistPct}%"></div></div>
          <p>${checklistPct}% complete</p>
          ${showChecklistBtn?`<span class="notify-bubble">!</span>`:""}
          <button data-nav="checklists">View Checklist</button>
        </div>
        <div class="dashboard-card">
          <h3>🧪 Latest Test</h3>
          ${testData?`<p><strong>${testData.testName}</strong></p>
          <p>${testData.correct}/${testData.total} correct</p>
          <p><small>${new Date(testData.timestamp.toDate()).toLocaleDateString()}</small></p>`
          :`<p>No tests taken.</p>`}
          ${showTestBtn?`<span class="notify-bubble">!</span>`:""}
          <button data-nav="results">View Results</button>
        </div>
        <div class="dashboard-card">
          <h3>🧾 Profile</h3>
          <p>Email: ${email}</p><p>License: ${license}</p><p>Experience: ${experience}</p>
          ${license==="Not selected"?`<span class="notify-bubble">!</span>`:""}
          <button data-nav="license">Update Info</button>
        </div>
        <div class="dashboard-card">
          <h3>🔥 Study Streak</h3><p>${streak} day${streak!==1?"s":""} active</p>
          <button onclick="openStudentHelpForm()">Ask AI Coach</button>
        </div>
      </div>
      <div class="dashboard-actions">
        ${showChecklistBtn?`<button data-nav="checklists">Resume Checklist</button>`:""}
        ${showTestBtn?`<button data-nav="tests">Start Test</button>`:""}
        <button data-nav="coach">🎧 AI Coach</button>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="dashboard-card error"><strong>Error:</strong> ${err.message}</div>`;
  }
  setupNavigation();
}

export async function renderChecklists() {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="dashboard-card fade-in">
      <h2>📋 Your ELDT Checklist</h2>
      <ul class="checklist-list">
        ${[1,2,3].map(n=>`
          <li>Section ${n} <button class="btn-small" data-nav="checklist-section-${n}">Go</button></li>
        `).join("")}
      </ul>
      <button data-nav="" class="btn-block">← Back to Dashboard</button>
    </div>`;
  setupNavigation();
}

export async function renderTestStart() {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="dashboard-card fade-in">
      <h2>📝 Start a Practice Test</h2>
      <select id="test-topic">
        <option value="general">General Knowledge</option>
        <option value="air-brakes">Air Brakes</option>
        <option value="combination">Combination Vehicles</option>
      </select>
      <button id="begin-test" class="btn-block">Start Test</button>
      <button data-nav="" class="btn-block btn-secondary">← Back</button>
    </div>`;
  document.getElementById('begin-test').onclick = () => renderTest(document.getElementById('test-topic').value);
  setupNavigation();
}

export async function renderTestResults() {
  document.getElementById('app').innerHTML = `
    <div class="dashboard-card fade-in">
      <h2>📊 Past Test Results</h2>
      <p>No results found.</p>
      <button data-nav="" class="btn-block">← Back</button>
    </div>`;
  setupNavigation();
}

export async function renderLicenseSelector() {
  document.getElementById('app').innerHTML = `
    <div class="dashboard-card fade-in">
      <h2>🧾 Update Profile</h2>
      <form id="license-form">
        <select id="license-type" required>
          <option value="">-- Choose --</option>
          <option value="class-a">Class A</option>
          <option value="class-b">Class B</option>
          <option value="class-c">Class C</option>
        </select>
        <input id="experience-level" type="number" min="0" placeholder="Years" required/>
        <button type="submit" class="btn-block">Save</button>
      </form>
      <button data-nav="" class="btn-block btn-secondary">← Back</button>
    </div>`;
  document.getElementById('license-form').addEventListener('submit', async e=>{
    e.preventDefault();
    const uid = auth.currentUser.uid;
    await setDoc(doc(db,"licenseSelection",uid),{
      studentId: uid,
      licenseType: document.getElementById('license-type').value,
      experience: document.getElementById('experience-level').value,
      updatedAt: new Date().toISOString()
    },{merge:true});
    showToast("Saved!");
    window.location.hash = "";
  });
  setupNavigation();
}

export async function renderChecklistSection(sectionId) {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="dashboard-card fade-in">
      <h2>Section ${sectionId}</h2>
      <div id="items-container">Loading…</div>
      <button data-nav="checklists" class="btn-block">← Back</button>
    </div>`;
  setupNavigation();
  try {
    const uid = auth.currentUser.uid;
    const ref = doc(db,"eldtProgress",`${uid}-section-${sectionId}`);
    const snap= await getDoc(ref);
    const data= snap.exists()?snap.data().progress:{};
    const defaults = {
      1:{"Check mirrors":false,"Test lights":false,"Inspect tires":false},
      2:{"Connect glad hands":false,"Check leaks":false,"Test brakes":false},
      3:{"Adjust seat":false,"Back straight":false,"Back corner":false}
    }[sectionId]||{};
    const progress = {...defaults,...data};
    const container = document.getElementById('items-container');
    container.innerHTML = Object.entries(progress).map(
      ([item,done])=>`<label><input type="checkbox" data-item="${item}" ${done?"checked":""}/> ${item}</label>`
    ).join("");
    container.querySelectorAll('input[type=checkbox]').forEach(cb=>{
      cb.onchange=async e=>{
        progress[e.target.dataset.item]=e.target.checked;
        await setDoc(ref,{
          studentId: uid,
          progress
        },{merge:true});
      };
    });
  } catch(err) {
    container.textContent = "Error: "+err.message;
  }
}

export async function renderTest(topic){
  document.getElementById('app').innerHTML = `
    <div class="dashboard-card fade-in">
      <h2>${topic} Test</h2>
      <p>Loading…</p>
      <button data-nav="tests" class="btn-block">← Back</button>
    </div>`;
  setupNavigation();
}

// ─────────────────────────────────────────────────────────────────────────────
// Router & Auth
// ─────────────────────────────────────────────────────────────────────────────
const routes = {
  "": renderDashboard,
  "checklists": renderChecklists,
  "checklist-section-1":()=>renderChecklistSection(1),
  "checklist-section-2":()=>renderChecklistSection(2),
  "checklist-section-3":()=>renderChecklistSection(3),
  "tests": renderTestStart,
  "test-general": ()=>renderTest('general'),
  "test-air-brakes":()=>renderTest('air-brakes'),
  "test-combination":()=>renderTest('combination'),
  "results": renderTestResults,
  "license": renderLicenseSelector,
  "coach": openStudentHelpForm
};

function handleRoute() {
  const key = location.hash.replace(/^#\/?/, "");
  (routes[key]||routes[""])();
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded',()=>{
  onAuthStateChanged(auth,user=>{
    if(user) handleRoute();
    else renderLogin();
  });
});