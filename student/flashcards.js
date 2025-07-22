// flashcards.js

import { db, auth } from './firebase.js';
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  showToast,
  setupNavigation,
  incrementStudentStudyMinutes,
  logStudySession
} from './ui-helpers.js';

import { renderDashboard } from './dashboard-student.js';

export { renderFlashcards };

async function renderFlashcards(container = document.getElementById("app")) {
  if (!container) return;

  if (!auth.currentUser || !auth.currentUser.email) {
    container.innerHTML = "<p>You must be logged in to view this page.</p>";
    return;
  }

  // Optional: Only allow students (if you wish to restrict)
  let userRole = localStorage.getItem("userRole") || "student";
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", auth.currentUser.email));
    const snap = await getDocs(q);
    if (!snap.empty) userRole = snap.docs[0].data().role || userRole;
  } catch (e) {}
  if (userRole !== "student") {
    container.innerHTML = "<p>Flashcards are only available for students.</p>";
    return;
  }

  // --- Flashcards Data ---
  const flashcards = [
    { q: "What is the minimum tread depth for front tires?", a: "4/32 of an inch." },
    { q: "What do you check for on rims?", a: "Bent, damaged, or rust trails." },
    { q: "When must you use 3 points of contact?", a: "When entering and exiting the vehicle." },
    { q: "What triggers the spring brake pop-out?", a: "Low air pressure (between 20–45 PSI)." }
  ];

  let current = 0;
  let startedAt = Date.now();
  let completed = false;

  async function renderCard() {
    if (completed) {
      // --- Session Complete UI ---
      const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      container.innerHTML = `
        <div class="screen-wrapper fade-in" style="max-width:420px;margin:0 auto;">
          <h2>🎉 Flashcard Session Complete!</h2>
          <p>You reviewed <b>${flashcards.length}</b> cards.</p>
          <p><b>${minutes}</b> study minute${minutes === 1 ? '' : 's'} logged!</p>
          <button id="restart-flashcards" class="btn primary" style="margin-top:18px;">🔄 Restart</button>
          <button id="back-to-dashboard-btn" class="btn outline" style="margin:26px 0 0 0;">⬅ Back to Dashboard</button>
        </div>
      `;
      await incrementStudentStudyMinutes(auth.currentUser.email, minutes);
      await logStudySession(auth.currentUser.email, minutes, "Flashcards");
      showToast("✅ Flashcard session logged!");

      document.getElementById("restart-flashcards")?.addEventListener("click", () => {
        current = 0;
        startedAt = Date.now();
        completed = false;
        renderCard();
      });
      document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
        renderDashboard();
      });

      setupNavigation();
      return;
    }

    // --- Main Flashcard UI ---
    container.innerHTML = `
      <div class="screen-wrapper fade-in" style="max-width:420px;margin:0 auto;">
        <h2>🃏 CDL Flashcards</h2>
        <div style="margin-bottom:1rem;">
          <progress value="${current + 1}" max="${flashcards.length}" style="width:100%;"></progress>
          <div style="text-align:center;">Card ${current + 1} of ${flashcards.length}</div>
        </div>
        <div class="flashcard-card" id="flashcard" tabindex="0" aria-label="Flashcard: Press Enter or tap to flip">
          <div class="flashcard-card-inner">
            <div class="flashcard-front">Q: ${flashcards[current].q}</div>
            <div class="flashcard-back">A: ${flashcards[current].a}</div>
          </div>
        </div>
        <div style="display:flex;gap:1rem;justify-content:center;margin-top:10px;">
          <button id="prev-flash" class="btn outline" ${current === 0 ? "disabled" : ""}>&#8592; Prev</button>
          <button id="flip-flash" class="btn">🔄 Flip</button>
          <button id="next-flash" class="btn outline" ${current === flashcards.length - 1 ? "disabled" : ""}>Next &#8594;</button>
        </div>
        <button class="btn wide outline" id="end-session-btn" style="margin:24px 0 0 0;">✅ End Session</button>
        <button class="btn wide outline" id="back-to-dashboard-btn" style="margin:9px 0 0 0;">⬅ Back to Dashboard</button>
      </div>
    `;

    // --- Flip Logic ---
    let flipped = false;
    const flashcard = document.getElementById("flashcard");
    flashcard.onclick = flipCard;
    document.getElementById("flip-flash")?.addEventListener("click", flipCard);

    function flipCard() {
      flipped = !flipped;
      flashcard.classList.toggle("flipped", flipped);
      if (flipped) flashcard.focus();
    }

    // --- Keyboard Navigation (Enter to flip, arrows to nav) ---
    flashcard.onkeydown = (e) => {
      if (e.key === "Enter") flipCard();
      if (e.key === "ArrowRight" && current < flashcards.length - 1) {
        current++; flipped = false; renderCard();
      }
      if (e.key === "ArrowLeft" && current > 0) {
        current--; flipped = false; renderCard();
      }
    };

    // --- Navigation ---
    document.getElementById("prev-flash")?.addEventListener("click", () => {
      if (current > 0) {
        current--; flipped = false; renderCard();
      }
    });
    document.getElementById("next-flash")?.addEventListener("click", () => {
      if (current < flashcards.length - 1) {
        current++; flipped = false; renderCard();
      }
    });
    document.getElementById("end-session-btn")?.addEventListener("click", () => {
      completed = true; renderCard();
    });
    document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
      renderDashboard();
    });

    setupNavigation();
  }

  await renderCard();
}
