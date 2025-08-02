// student/walkthrough.js

import { db, auth } from '../firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {
  showToast,
  setupNavigation,
  updateELDTProgress,
  markStudentWalkthroughComplete,
  getUserProgress,
} from '../ui-helpers.js';
import { renderProfile } from './profile.js';
import { renderStudentDashboard } from './student-dashboard.js';
import {
  getWalkthroughByClass,
  getWalkthroughLabel,
} from '../walkthrough-data/index.js';
import { getCdlClassLabel } from './profile.js';

// Main Walkthrough Renderer
export async function renderWalkthrough(
  container = document.getElementById('app')
) {
  // Defensive: ensure container is a DOM element
  if (!container || typeof container.querySelector !== 'function') {
    container = document.getElementById('app');
    if (!container || typeof container.querySelector !== 'function') {
      showToast('Internal error: Container not ready.');
      return;
    }
  }

  // === User/session validation ===
  const currentUserEmail =
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    (auth.currentUser && auth.currentUser.email) ||
    '';
  const userRole = localStorage.getItem('userRole') || 'student';
  const schoolId = localStorage.getItem('schoolId') || '';

  if (!currentUserEmail) {
    container.innerHTML = '<p>You must be logged in to view this page.</p>';
    setupNavigation();
    return;
  }

  // === Fetch user profile (CDL class, school) ===
  let userData = {};
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', currentUserEmail));
    const snap = await getDocs(q);
    userData = snap.empty ? {} : snap.docs[0].data();
  } catch (e) {
    container.innerHTML = '<p>Error loading user profile.</p>';
    setupNavigation();
    return;
  }
  const cdlClass = userData?.cdlClass || null;
  const school = userData?.schoolName || schoolId || 'N/A';

  // === Select walkthrough script ===
  let walkthroughKey = '';
  if (cdlClass) walkthroughKey = cdlClass.trim().toUpperCase();
  const walkthroughData = getWalkthroughByClass(walkthroughKey);

  // === Fetch Drill Progress ===
  let progress = {};
  try {
    progress = (await getUserProgress(currentUserEmail)) || {};
  } catch (e) {
    progress = {};
  }
  const completedDrills = {
    fill: !!progress.drills?.fill,
    order: !!progress.drills?.order,
    type: !!progress.drills?.type,
    visual: !!progress.drills?.visual,
  };
  let currentDrill = 'fill';

  // === Build Main Walkthrough Content ===
  let content = `<div class="screen-wrapper walkthrough-page fade-in" tabindex="0">
    <h2>🧭 CDL Walkthrough Practice ${school !== 'N/A' ? `<span class="school-badge">${school}</span>` : ''}</h2>
  `;

  // No CDL class chosen
  if (!cdlClass) {
    content += `
      <div class="alert-box" role="alert">
        ⚠ You haven’t selected your CDL class yet.<br>
        Please go to your <strong>Profile</strong> and select one so we can load the correct walkthrough script.
      </div>
      <button data-nav="profile" class="btn">Go to Profile</button>
    `;
  }
  // No walkthrough data for this class
  else if (!walkthroughData) {
    content += `
      <div class="alert-box" role="alert">
        ⚠ Sorry, we do not have a walkthrough script for your selected class: <b>${getWalkthroughLabel(cdlClass)}</b>.<br>
        Please contact support or your instructor.
      </div>
    `;
  }
  // Walkthrough and drills
  else {
    content += `
      <p><strong>CDL Class:</strong> ${getWalkthroughLabel(cdlClass)}</p>
      <p>Study the walkthrough below to prepare for your in-person vehicle inspection test. <span style="color:var(--accent);font-weight:bold;">Critical/pass-fail sections are highlighted.</span></p>
      <div class="walkthrough-script" aria-label="Walkthrough script">
        ${walkthroughData
          .map(
            (section) => `
          <h3>
            ${section.critical || section.passFail ? '🚨' : '✅'} 
            ${section.section}
            ${section.critical || section.passFail ? ' <span style="color:var(--accent);">(Pass/Fail)</span>' : ''}
          </h3>
          <div class="${section.critical || section.passFail ? 'highlight-section' : ''}">
            ${section.steps
              .map(
                (step) =>
                  `<p>
                ${step.label ? `<strong>${step.label}:</strong> ` : ''}
                ${step.script || ''}
                ${step.mustSay ? ' <span class="must-say" style="color:var(--accent);font-weight:bold;">(Must Say)</span>' : ''}
                ${step.passFail ? ' <span class="pass-fail" style="color:#ee3377;font-weight:bold;">(Pass/Fail)</span>' : ''}
              </p>`
              )
              .join('')}
          </div>
        `
          )
          .join('')}
      </div>
      <div style="margin:2rem 0 1.3rem 0;">
        <progress value="${Object.values(completedDrills).filter(Boolean).length}" max="4" style="width:100%;" aria-valuemax="4" aria-valuenow="${Object.values(completedDrills).filter(Boolean).length}" aria-label="Walkthrough drill progress"></progress>
        <span>${Object.values(completedDrills).filter(Boolean).length}/4 drills completed</span>
      </div>
      <nav class="drills-nav" style="display:flex;gap:0.7rem;margin-bottom:1.2rem;" aria-label="Drill navigation">
        <button data-drill="fill" class="btn small${completedDrills.fill ? ' drill-done' : ''}" aria-pressed="${currentDrill === 'fill'}">Fill-in-the-Blank${completedDrills.fill ? ' ✅' : ''}</button>
        <button data-drill="order" class="btn small${completedDrills.order ? ' drill-done' : ''}" aria-pressed="${currentDrill === 'order'}">Ordered Steps${completedDrills.order ? ' ✅' : ''}</button>
        <button data-drill="type" class="btn small${completedDrills.type ? ' drill-done' : ''}" aria-pressed="${currentDrill === 'type'}">Typing Challenge${completedDrills.type ? ' ✅' : ''}</button>
        <button data-drill="visual" class="btn small${completedDrills.visual ? ' drill-done' : ''}" aria-pressed="${currentDrill === 'visual'}">Visual Recall${completedDrills.visual ? ' ✅' : ''}</button>
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

  // === Event Handlers ===
  document
    .getElementById('back-to-dashboard-btn')
    ?.addEventListener('click', () => {
      renderStudentDashboard();
    });
  container
    .querySelector('[data-nav="profile"]')
    ?.addEventListener('click', () => {
      renderProfile();
    });

  // === Confetti animation ===
  function showConfetti() {
    const canvas = document.getElementById('drill-confetti');
    if (!canvas) return;
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    for (let i = 0; i < 80; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 7 + 3,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = `hsl(${Math.random() * 360},95%,70%)`;
      ctx.fill();
    }
    setTimeout(() => (canvas.style.display = 'none'), 1800);
  }

  // === Mark Drill Complete and Save Progress ===
  async function markDrillComplete(type) {
    if (completedDrills[type]) return;
    completedDrills[type] = true;
    try {
      await updateELDTProgress(currentUserEmail, {
        [`drills.${type}`]: true,
        [`drills.${type}CompletedAt`]: new Date().toISOString(),
      });
      const completedCount =
        Object.values(completedDrills).filter(Boolean).length;
      document.querySelector('progress').value = completedCount;
      document.querySelector('progress').nextElementSibling.textContent =
        `${completedCount}/4 drills completed`;
      document
        .querySelector(`[data-drill='${type}']`)
        .classList.add('drill-done');
      document.querySelector(`[data-drill='${type}']`).innerHTML =
        document
          .querySelector(`[data-drill='${type}']`)
          .innerHTML.replace('✅', '') + ' ✅';
      if (Object.values(completedDrills).every(Boolean)) {
        showConfetti();
        showToast('🎉 All drills complete! Walkthrough milestone saved.');
        await markStudentWalkthroughComplete(currentUserEmail);
      }
    } catch (err) {
      showToast('❌ Error saving progress. Try again.', 3200, 'error');
    }
  }

  // === Drill Renderers & Events ===
  function renderDrill(drillType, drillsContainer) {
    if (!walkthroughData) return;

    // Pick the pass/fail (must-memorize) section for drills
    const criticalSection =
      walkthroughData.find((s) => s.critical || s.passFail) ||
      walkthroughData[0];

    // Drill Data Extraction
    const brakeCheckLines = (criticalSection?.steps || [])
      .map((step) => step.script || '')
      .filter(Boolean);

    function getFillBlanks() {
      // Simple: replace keywords with ___ and store answers.
      return brakeCheckLines.map((line) => {
        if (!line) return { text: '', answers: [] };
        let blanks = [];
        let text = line.replace(
          /\b(engine|parking|service|3|60|20|45)\b/gi,
          (match) => {
            blanks.push(match);
            return '___';
          }
        );
        return { text, answers: blanks };
      });
    }
    const brakeCheckBlanks = getFillBlanks();

    const brakeCheckSteps = brakeCheckLines;
    const visualRecall = [
      {
        img: 'brake-gauge.png',
        question: 'At what PSI should the low air warning activate?',
        answer: 'before 60',
      },
    ];

    let html = '';
    if (drillType === 'fill') {
      html += `<h3>Fill in the Blanks</h3>`;
      brakeCheckBlanks.forEach((item, idx) => {
        let blanks = 0;
        const text = item.text.replace(/___/g, () => {
          blanks++;
          return `<input type="text" size="5" class="blank-input" data-answer="${item.answers[blanks - 1]}" required style="margin:0 3px;" aria-label="Blank" />`;
        });
        html += `<form class="drill-blank" data-idx="${idx}" style="margin-bottom:1.2rem;">
                  <div>${text}</div>
                  <button class="btn" type="submit" style="margin-top:0.6rem;">Check</button>
                  <div class="drill-result" style="margin-top:0.3rem;" aria-live="polite"></div>
                </form>`;
      });
    } else if (drillType === 'order') {
      html += `<h3>Put the Steps in Order</h3>
        <ul id="order-list" style="list-style:none;padding:0;">`;
      let shuffled = brakeCheckSteps
        .map((v, i) => ({ v, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map((o) => o.v);
      shuffled.forEach((step, idx) => {
        html += `<li draggable="true" class="order-step" data-idx="${idx}" style="background:#222;padding:7px 11px;border-radius:8px;margin:7px 0;cursor:grab;" tabindex="0" aria-label="Step">${step}</li>`;
      });
      html += `</ul>
        <button class="btn" id="check-order-btn">Check Order</button>
        <div class="drill-result" style="margin-top:0.3rem;" aria-live="polite"></div>`;
    } else if (drillType === 'type') {
      html += `<h3>Type the Pass/Fail Phrase Word-for-Word</h3>
        <form id="typing-challenge">
          <textarea rows="4" style="width:100%;" placeholder="Type the full phrase here" aria-label="Type phrase"></textarea>
          <button class="btn" type="submit" style="margin-top:0.5rem;">Check</button>
          <div class="drill-result" style="margin-top:0.3rem;" aria-live="polite"></div>
        </form>
        <div style="font-size:0.95em;margin-top:0.6rem;opacity:0.6;">Hint: ${brakeCheckLines[0]}</div>`;
    } else if (drillType === 'visual') {
      html += `<h3>Visual Recall</h3>
        <div style="margin-bottom:1rem;">
          <img src="${visualRecall[0].img}" alt="Brake Gauge" style="max-width:160px;display:block;margin-bottom:0.7rem;">
          <div>${visualRecall[0].question}</div>
          <input type="text" class="visual-answer" placeholder="Your answer" aria-label="Visual answer" />
          <button class="btn" id="check-visual-btn" style="margin-left:9px;">Check</button>
          <div class="drill-result" style="margin-top:0.3rem;" aria-live="polite"></div>
        </div>`;
    }
    drillsContainer.innerHTML = html;

    // Fill-in-the-Blank Handler
    drillsContainer
      .querySelectorAll('.drill-blank')
      .forEach((form, formIdx) => {
        form.onsubmit = (e) => {
          e.preventDefault();
          let correct = true;
          form.querySelectorAll('.blank-input').forEach((input, idx) => {
            const answer = (input.dataset.answer || '').toLowerCase().trim();
            if (input.value.toLowerCase().trim() !== answer) {
              correct = false;
              input.style.background = '#ffcccc';
            } else {
              input.style.background = '#caffcb';
            }
          });
          const res = form.querySelector('.drill-result');
          if (correct) {
            res.innerHTML = '✅ Correct!';
            markDrillComplete('fill');
          } else {
            res.innerHTML = '❌ Try again!';
          }
        };
      });

    // Ordered Steps Handler (Drag & Drop)
    if (drillType === 'order') {
      const list = drillsContainer.querySelector('#order-list');
      let draggingEl = null,
        dragIdx = null;
      list.querySelectorAll('.order-step').forEach((li, idx) => {
        li.draggable = true;
        li.ondragstart = (e) => {
          draggingEl = li;
          dragIdx = idx;
          li.style.opacity = 0.5;
        };
        li.ondragend = () => {
          draggingEl = null;
          dragIdx = null;
          li.style.opacity = 1;
        };
        li.ondragover = (e) => e.preventDefault();
        li.ondrop = (e) => {
          e.preventDefault();
          if (draggingEl && draggingEl !== li) {
            list.insertBefore(draggingEl, li.nextSibling);
          }
        };
      });
      drillsContainer.querySelector('#check-order-btn').onclick = () => {
        const order = Array.from(list.children).map((li) =>
          li.textContent.trim()
        );
        let correct = true;
        for (let i = 0; i < brakeCheckSteps.length; i++) {
          if (order[i] !== brakeCheckSteps[i]) correct = false;
        }
        const res = drillsContainer.querySelector('.drill-result');
        if (correct) {
          res.innerHTML = '✅ Correct order!';
          markDrillComplete('order');
        } else {
          res.innerHTML =
            '❌ Try again! Drag the steps into the correct order.';
        }
      };
    }

    // Typing Challenge Handler
    if (drillType === 'type') {
      drillsContainer.querySelector('#typing-challenge').onsubmit = (e) => {
        e.preventDefault();
        const val = drillsContainer
          .querySelector('textarea')
          .value.trim()
          .replace(/\s+/g, ' ')
          .toLowerCase();
        const ans = (brakeCheckLines[0] || '')
          .trim()
          .replace(/\s+/g, ' ')
          .toLowerCase();
        const res = drillsContainer.querySelector('.drill-result');
        if (val === ans) {
          res.innerHTML = '✅ Perfect! You memorized it.';
          markDrillComplete('type');
        } else {
          res.innerHTML = '❌ Not quite right. Try again!';
        }
      };
    }

    // Visual Recall Handler
    if (drillType === 'visual') {
      drillsContainer.querySelector('#check-visual-btn').onclick = () => {
        const input = drillsContainer
          .querySelector('.visual-answer')
          .value.trim()
          .toLowerCase();
        const ans = visualRecall[0].answer.trim().toLowerCase();
        const res = drillsContainer.querySelector('.drill-result');
        if (input.includes(ans)) {
          res.innerHTML = '✅ Correct!';
          markDrillComplete('visual');
        } else {
          res.innerHTML = '❌ Try again!';
        }
      };
    }
  }

  function setupDrillsNav(drillNavBar, drillsContainer) {
    ['fill', 'order', 'type', 'visual'].forEach((type) => {
      const btn = drillNavBar.querySelector(`[data-drill="${type}"]`);
      btn.onclick = () => {
        currentDrill = type;
        renderDrill(type, drillsContainer);
      };
    });
  }

  // --- Init drills on load (default to first drill) ---
  const drillsContainer = document.getElementById('drills-container');
  const drillsNav = document.querySelector('.drills-nav');
  if (walkthroughData && drillsContainer && drillsNav) {
    renderDrill(currentDrill, drillsContainer);
    setupDrillsNav(drillsNav, drillsContainer);
  }

  setupNavigation();
}
