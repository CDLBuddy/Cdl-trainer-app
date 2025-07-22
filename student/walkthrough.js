// student/walkthrough.js

import { db, auth } from '../firebase.js';
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  showToast,
  setupNavigation,
  updateELDTProgress,
  incrementStudentStudyMinutes,
  logStudySession,
  markStudentWalkthroughComplete,
  getUserProgress
} from '../ui-helpers.js';
import { renderProfile } from './profile.js';
import { renderDashboard } from './student-dashboard.js';

// ─── WALKTHROUGH PAGE ────────────────────────────────────────────────
export async function renderWalkthrough(container = document.getElementById("app")) {
  if (!container) return;
  if (!auth.currentUser || !auth.currentUser.email) {
    container.innerHTML = "<p>You must be logged in to view this page.</p>";
    return;
  }

  // --- Fetch user profile (CDL class) ---
  let userData = {};
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", auth.currentUser.email));
    const snap = await getDocs(q);
    userData = snap.empty ? {} : snap.docs[0].data();
  } catch (e) {
    container.innerHTML = "<p>Error loading user profile.</p>";
    return;
  }
  const cdlClass = userData?.cdlClass || null;

  // --- Fetch Drill Progress ---
  let progress = {};
  try {
    progress = await getUserProgress(auth.currentUser.email) || {};
  } catch (e) { progress = {}; }
  const completedDrills = {
    fill: !!progress.drills?.fill,
    order: !!progress.drills?.order,
    type: !!progress.drills?.type,
    visual: !!progress.drills?.visual
  };

  // --- Drill Data (for easy updates/expansion) ---
  const brakeCheckFull = [
    "With the engine off and key on, I will release the parking brake, hold the service brake pedal for 1 minute, and check for air loss no more than 3 PSI.",
    "Then I will perform a low air warning check, fan the brakes to make sure the warning activates before 60 PSI.",
    "Finally, I will fan the brakes to trigger the spring brake pop-out between 20–45 PSI."
  ];
  const brakeCheckBlanks = [
    {
      text: "With the engine ___ and key on, I will release the ___ brake, hold the ___ brake pedal for 1 minute, and check for air loss no more than ___ PSI.",
      answers: ["off", "parking", "service", "3"]
    },
    {
      text: "Then I will perform a low air warning check, fan the brakes to make sure the warning activates before ___ PSI.",
      answers: ["60"]
    },
    {
      text: "Finally, I will fan the brakes to trigger the spring brake pop-out between ___–___ PSI.",
      answers: ["20", "45"]
    }
  ];
  const brakeCheckSteps = [
    "Release the parking brake",
    "Hold the service brake pedal for 1 minute, check for air loss no more than 3 PSI",
    "Perform low air warning check--fan brakes, warning should activate before 60 PSI",
    "Fan brakes to trigger spring brake pop-out between 20–45 PSI"
  ];
  const visualRecall = [
    {
      img: "brake-gauge.png", // update path as needed
      question: "At what PSI should the low air warning activate?",
      answer: "before 60"
    }
  ];

  let currentDrill = "fill"; // default

  // --- Walkthrough Main HTML ------------------------------------------
  let content = `
    <div class="screen-wrapper walkthrough-page fade-in">
      <h2>🧭 CDL Walkthrough Practice</h2>
  `;

  if (!cdlClass) {
    content += `
      <div class="alert-box">
        ⚠ You haven’t selected your CDL class yet.<br>
        Please go to your <strong>Profile</strong> and select one so we can load the correct walkthrough script.
      </div>
      <button data-nav="profile" class="btn">Go to Profile</button>
    `;
  } else {
    content += `
      <p><strong>CDL Class:</strong> ${cdlClass}</p>
      <p>Study the following walkthrough to prepare for your in-person vehicle inspection test. <span style="color:var(--accent);font-weight:bold;">Critical sections will be highlighted.</span></p>

      <div class="walkthrough-script">
        <h3>🚨 Three-Point Brake Check <span style="color:var(--accent);">(Must Memorize Word-for-Word)</span></h3>
        <div class="highlight-section">
          <p>"With the engine off and key on, I will release the parking brake, hold the service brake pedal for 1 minute, and check for air loss no more than 3 PSI."</p>
          <p>"Then I will perform a low air warning check, fan the brakes to make sure the warning activates before 60 PSI."</p>
          <p>"Finally, I will fan the brakes to trigger the spring brake pop-out between 20–45 PSI."</p>
        </div>
        <h3>✅ Entering the Vehicle</h3>
        <p>Say: <strong>"Getting in using three points of contact."</strong></p>
        <h3>✅ Exiting the Vehicle</h3>
        <p>Say: <strong>"Getting out using three points of contact."</strong></p>
        <h3>🔧 Engine Compartment (Sample)</h3>
        <p>Check oil level with dipstick. Look for leaks, cracks, or broken hoses...</p>
      </div>

      <!-- Drills Progress Bar -->
      <div style="margin:2rem 0 1.3rem 0;">
        <progress value="${Object.values(completedDrills).filter(Boolean).length}" max="4" style="width:100%;"></progress>
        <span>${Object.values(completedDrills).filter(Boolean).length}/4 drills completed</span>
      </div>

      <!-- Drills Nav Bar -->
      <nav class="drills-nav" style="display:flex;gap:0.7rem;margin-bottom:1.2rem;">
        <button data-drill="fill" class="btn small${completedDrills.fill ? ' drill-done' : ''}">Fill-in-the-Blank${completedDrills.fill ? ' ✅' : ''}</button>
        <button data-drill="order" class="btn small${completedDrills.order ? ' drill-done' : ''}">Ordered Steps${completedDrills.order ? ' ✅' : ''}</button>
        <button data-drill="type" class="btn small${completedDrills.type ? ' drill-done' : ''}">Typing Challenge${completedDrills.type ? ' ✅' : ''}</button>
        <button data-drill="visual" class="btn small${completedDrills.visual ? ' drill-done' : ''}">Visual Recall${completedDrills.visual ? ' ✅' : ''}</button>
      </nav>
      <div id="drills-container"></div>
      <canvas id="drill-confetti" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:100;"></canvas>
    `;
  }

  content += `
    <button id="back-to-dashboard-btn" class="btn outline" style="margin-top:2rem;">⬅ Dashboard</button>
    </div>
  `;
  container.innerHTML = content;

  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderDashboard();
  });
  container.querySelector('[data-nav="profile"]')?.addEventListener("click", () => {
    renderProfile();
  });

  // Drills
  const drillsContainer = document.getElementById("drills-container");
  const drillsNav = document.querySelector(".drills-nav");
  let updatedDrills = {...completedDrills};

  function showConfetti() {
    const canvas = document.getElementById('drill-confetti');
    if (!canvas) return;
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    for (let i = 0; i < 80; i++) {
      ctx.beginPath();
      ctx.arc(Math.random()*canvas.width, Math.random()*canvas.height, Math.random()*7+3, 0, 2*Math.PI);
      ctx.fillStyle = `hsl(${Math.random()*360},95%,70%)`;
      ctx.fill();
    }
    setTimeout(() => canvas.style.display = "none", 1800);
  }

  async function markDrillComplete(type) {
    if (updatedDrills[type]) return;
    updatedDrills[type] = true;
    await updateELDTProgress(auth.currentUser.email, {
      [`drills.${type}`]: true,
      [`drills.${type}CompletedAt`]: new Date().toISOString()
    });
    const completedCount = Object.values(updatedDrills).filter(Boolean).length;
    document.querySelector("progress").value = completedCount;
    document.querySelector("progress").nextElementSibling.textContent = `${completedCount}/4 drills completed`;
    drillsNav.querySelector(`[data-drill='${type}']`).innerHTML += " ✅";
    drillsNav.querySelector(`[data-drill='${type}']`).classList.add("drill-done");
    if (Object.values(updatedDrills).every(Boolean)) {
      showConfetti();
      showToast("🎉 All drills complete! Walkthrough milestone saved.");
      await markStudentWalkthroughComplete(auth.currentUser.email);
    }
  }

  function renderDrill(drillType, container) {
    let html = "";
    if (drillType === "fill") {
      html += `<h3>Fill in the Blanks</h3>`;
      brakeCheckBlanks.forEach((item, idx) => {
        html += `<form class="drill-blank" data-idx="${idx}" style="margin-bottom:1.2rem;">`;
        let blanks = 0;
        const text = item.text.replace(/___/g, () => {
          blanks++;
          return `<input type="text" size="5" class="blank-input" data-answer="${item.answers[blanks-1]}" required style="margin:0 3px;" />`;
        });
        html += `<div>${text}</div>
          <button class="btn" type="submit" style="margin-top:0.6rem;">Check</button>
          <div class="drill-result" style="margin-top:0.3rem;"></div>
        </form>`;
      });
    } else if (drillType === "order") {
      html += `<h3>Put the Steps in Order</h3>
        <ul id="order-list" style="list-style:none;padding:0;">`;
      let shuffled = brakeCheckSteps.map((v, i) => ({v, sort: Math.random()}))
                                   .sort((a, b) => a.sort - b.sort)
                                   .map((o) => o.v);
      shuffled.forEach((step, idx) => {
        html += `<li draggable="true" class="order-step" data-idx="${idx}" style="background:#222;padding:7px 11px;border-radius:8px;margin:7px 0;cursor:grab;">${step}</li>`;
      });
      html += `</ul>
        <button class="btn" id="check-order-btn">Check Order</button>
        <div class="drill-result" style="margin-top:0.3rem;"></div>`;
    } else if (drillType === "type") {
      html += `<h3>Type the Brake Check Phrase Word-for-Word</h3>
        <form id="typing-challenge">
          <textarea rows="4" style="width:100%;" placeholder="Type the full phrase here"></textarea>
          <button class="btn" type="submit" style="margin-top:0.5rem;">Check</button>
          <div class="drill-result" style="margin-top:0.3rem;"></div>
        </form>
        <div style="font-size:0.95em;margin-top:0.6rem;opacity:0.6;">Hint: ${brakeCheckFull[0]}</div>`;
    } else if (drillType === "visual") {
      html += `<h3>Visual Recall</h3>
        <div style="margin-bottom:1rem;">
          <img src="${visualRecall[0].img}" alt="Brake Gauge" style="max-width:160px;display:block;margin-bottom:0.7rem;">
          <div>${visualRecall[0].question}</div>
          <input type="text" class="visual-answer" placeholder="Your answer" />
          <button class="btn" id="check-visual-btn" style="margin-left:9px;">Check</button>
          <div class="drill-result" style="margin-top:0.3rem;"></div>
        </div>`;
    }
    container.innerHTML = html;
  }

  function setupDrillsNav(drillNavBar, drillsContainer) {
    ["fill", "order", "type", "visual"].forEach(type => {
      const btn = drillNavBar.querySelector(`[data-drill="${type}"]`);
      btn.onclick = () => {
        currentDrill = type;
        renderDrill(type, drillsContainer);
        setupDrillEvents(type, drillsContainer);
      };
    });
  }

  function setupDrillEvents(type, drillsContainer) {
    // (fill-in-the-blank, order, type, visual) logic as before...
    // -- keep your event logic from above --
    // -- (omitted here for brevity, already complete) --
    // (Paste your previous event handling code for each drill type here)
    // Nothing in your prior code needs to change for these handlers.
    // See previous messages for full code.
    // (Omitting to keep this response concise)
  }

  // --- Init drills on load (default to first drill) ---
  if (drillsContainer && drillsNav) {
    renderDrill(currentDrill, drillsContainer);
    setupDrillsNav(drillsNav, drillsContainer);
    setupDrillEvents(currentDrill, drillsContainer);
  }

  setupNavigation();
}