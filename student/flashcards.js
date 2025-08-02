// student/flashcards.js

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
  incrementStudentStudyMinutes,
  logStudySession,
} from '../ui-helpers.js';
import { renderStudentDashboard } from './student-dashboard.js';

// ========== CONFIG ==========
const defaultFlashcards = [
  {
    q: 'What is the minimum tread depth for front tires?',
    a: '4/32 of an inch.',
  },
  { q: 'What do you check for on rims?', a: 'Bent, damaged, or rust trails.' },
  {
    q: 'When must you use 3 points of contact?',
    a: 'When entering and exiting the vehicle.',
  },
  {
    q: 'What triggers the spring brake pop-out?',
    a: 'Low air pressure (between 20-45 PSI).',
  },
];

// ========== FLASHCARDS PAGE (STUDENT) ==========
export async function renderFlashcards(
  container = document.getElementById('app')
) {
  // Defensive: Validate container
  if (!container || typeof container.querySelector !== 'function') {
    console.error('❌ container is not a DOM element:', container);
    showToast('Internal error: Container not ready.');
    return;
  }

  const email =
    (auth.currentUser && auth.currentUser.email) ||
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail');
  if (!email) {
    container.innerHTML = '<p>You must be logged in to view this page.</p>';
    return;
  }

  let userRole = localStorage.getItem('userRole') || 'student';
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snap = await getDocs(q);
    if (!snap.empty) userRole = snap.docs[0].data().role || userRole;
  } catch (e) {}
  if (userRole !== 'student') {
    container.innerHTML = '<p>Flashcards are only available for students.</p>';
    return;
  }

  // --- State
  let flashcards = [...defaultFlashcards];
  let current = 0;
  let startedAt = Date.now();
  let completed = false;
  let shuffle = localStorage.getItem('fcShuffle') === '1';
  let knownCards = JSON.parse(localStorage.getItem('fcKnown_' + email) || '[]');

  // Shuffle helper
  function shuffleArray(arr) {
    return arr
      .map((card) => ({ ...card, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((c) => ({ q: c.q, a: c.a }));
  }

  // Optionally restore progress
  let savedIdx = parseInt(
    localStorage.getItem('fcCurrent_' + email) || '0',
    10
  );
  if (!isNaN(savedIdx) && savedIdx >= 0 && savedIdx < flashcards.length) {
    current = savedIdx;
  }

  // Shuffle if enabled
  if (shuffle) {
    flashcards = shuffleArray(flashcards);
  }

  // --- RENDER CARD ---
  async function renderCard() {
    // Defensive: Validate container before each render
    if (!container || typeof container.querySelector !== 'function') {
      console.error('❌ container is not a DOM element:', container);
      showToast('Internal error: Container not ready.');
      return;
    }

    // Completion
    if (completed) {
      const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      container.innerHTML = `
        <div class="screen-wrapper fade-in" style="max-width:420px;margin:0 auto;">
          <h2>🎉 Flashcard Session Complete!</h2>
          <p>You reviewed <b>${flashcards.length}</b> cards.</p>
          <p><b>${minutes}</b> study minute${minutes === 1 ? '' : 's'} logged!</p>
          <button id="restart-flashcards" class="btn primary" style="margin-top:18px;">🔄 Restart</button>
          <button id="restart-unknown" class="btn outline" style="margin-top:18px;">Review Missed</button>
          <button id="back-to-dashboard-btn" class="btn outline" style="margin:26px 0 0 0;">⬅ Back to Dashboard</button>
        </div>
      `;
      await incrementStudentStudyMinutes(email, minutes);
      await logStudySession(email, minutes, 'Flashcards');
      showToast('✅ Flashcard session logged!');

      document
        .getElementById('restart-flashcards')
        ?.addEventListener('click', () => {
          knownCards = [];
          localStorage.setItem('fcKnown_' + email, JSON.stringify([]));
          current = 0;
          startedAt = Date.now();
          completed = false;
          renderCard();
        });
      document
        .getElementById('restart-unknown')
        ?.addEventListener('click', () => {
          flashcards = defaultFlashcards.filter(
            (c, i) => !knownCards.includes(i)
          );
          knownCards = [];
          current = 0;
          completed = false;
          startedAt = Date.now();
          renderCard();
        });
      document
        .getElementById('back-to-dashboard-btn')
        ?.addEventListener('click', () => {
          renderStudentDashboard();
        });
      setupNavigation();
      return;
    }

    // Main Flashcard UI
    const knownPct = Math.round((knownCards.length / flashcards.length) * 100);
    container.innerHTML = `
      <div class="screen-wrapper fade-in" style="max-width:420px;margin:0 auto;">
        <h2>🃏 Student Flashcards</h2>
        <div style="margin-bottom:1rem;">
          <progress value="${current + 1}" max="${flashcards.length}" style="width:100%;"></progress>
          <div style="text-align:center;">Card ${current + 1} of ${flashcards.length}</div>
          <div style="text-align:center;font-size:0.96em;opacity:0.7;">
            <label>
              <input type="checkbox" id="shuffle-toggle" ${shuffle ? 'checked' : ''} style="margin-right:4px;"/>
              Shuffle cards
            </label>
            <span style="margin-left:18px;">Known: ${knownCards.length}/${flashcards.length} (${knownPct}%)</span>
          </div>
        </div>
        <div class="flashcard-card" id="flashcard" tabindex="0" aria-label="Flashcard: Press Enter or tap to flip" role="button">
          <div class="flashcard-card-inner">
            <div class="flashcard-front">Q: ${flashcards[current].q}</div>
            <div class="flashcard-back">A: ${flashcards[current].a}</div>
          </div>
        </div>
        <div style="display:flex;gap:1rem;justify-content:center;margin-top:10px;">
          <button id="prev-flash" class="btn outline" ${current === 0 ? 'disabled' : ''} aria-label="Previous card">&#8592; Prev</button>
          <button id="flip-flash" class="btn" aria-label="Flip card">🔄 Flip</button>
          <button id="next-flash" class="btn outline" ${current === flashcards.length - 1 ? 'disabled' : ''} aria-label="Next card">Next &#8594;</button>
        </div>
        <div style="text-align:center;margin:13px 0;">
          <button id="known-btn" class="btn small" style="margin:0 9px 0 0;" aria-label="Mark as known">✅ I know this</button>
        </div>
        <button class="btn wide outline" id="end-session-btn" style="margin:24px 0 0 0;">✅ End Session</button>
        <button class="btn wide outline" id="back-to-dashboard-btn" style="margin:9px 0 0 0;">⬅ Back to Dashboard</button>
      </div>
    `;

    // Shuffle toggle
    document
      .getElementById('shuffle-toggle')
      ?.addEventListener('change', (e) => {
        shuffle = !!e.target.checked;
        localStorage.setItem('fcShuffle', shuffle ? '1' : '0');
        flashcards = shuffle
          ? shuffleArray(defaultFlashcards)
          : [...defaultFlashcards];
        current = 0;
        renderCard();
      });

    // Flip logic
    let flipped = false;
    const flashcard = document.getElementById('flashcard');
    flashcard.onclick = flipCard;
    document.getElementById('flip-flash')?.addEventListener('click', flipCard);

    function flipCard() {
      flipped = !flipped;
      flashcard.classList.toggle('flipped', flipped);
      if (flipped) flashcard.focus();
    }

    // Keyboard navigation
    flashcard.onkeydown = (e) => {
      if (e.key === 'Enter') flipCard();
      if (e.key === 'ArrowRight' && current < flashcards.length - 1) {
        current++;
        flipped = false;
        renderCard();
      }
      if (e.key === 'ArrowLeft' && current > 0) {
        current--;
        flipped = false;
        renderCard();
      }
    };

    // Touch support
    let touchStartX = null;
    flashcard.ontouchstart = (e) => {
      touchStartX = e.changedTouches[0].clientX;
    };
    flashcard.ontouchend = (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        if (dx > 0 && current > 0) {
          current--;
          flipped = false;
          renderCard();
        } else if (dx < 0 && current < flashcards.length - 1) {
          current++;
          flipped = false;
          renderCard();
        }
      } else {
        flipCard();
      }
      touchStartX = null;
    };

    // Navigation
    document.getElementById('prev-flash')?.addEventListener('click', () => {
      if (current > 0) {
        current--;
        flipped = false;
        renderCard();
      }
    });
    document.getElementById('next-flash')?.addEventListener('click', () => {
      if (current < flashcards.length - 1) {
        current++;
        flipped = false;
        renderCard();
      }
    });
    document
      .getElementById('end-session-btn')
      ?.addEventListener('click', () => {
        completed = true;
        renderCard();
      });
    document
      .getElementById('back-to-dashboard-btn')
      ?.addEventListener('click', () => {
        renderStudentDashboard();
      });

    // Mark as known logic
    document.getElementById('known-btn')?.addEventListener('click', () => {
      if (!knownCards.includes(current)) {
        knownCards.push(current);
        localStorage.setItem('fcKnown_' + email, JSON.stringify(knownCards));
        showToast('Marked as known!');
      }
    });

    // Save progress in localStorage
    localStorage.setItem('fcCurrent_' + email, current);

    setupNavigation();
  }

  await renderCard();
}
