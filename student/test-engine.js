// student/test-engine.js

import { db } from '../firebase.js';
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { setupNavigation, showToast } from '../ui-helpers.js';

export async function renderTestEngine(
  container = document.getElementById('app'),
  testName,
  currentUserEmail
) {
  if (!container || !testName || !currentUserEmail) {
    showToast('Missing required parameters for test engine.');
    return;
  }

  // --- 1. Question Banks (expandable, per-school future) --------------
  const questionBanks = {
    'General Knowledge': [
      {
        q: 'What is the maximum allowed blood alcohol concentration for CDL drivers?',
        choices: ['0.02%', '0.04%', '0.08%', '0.10%'],
        answer: 1,
      },
      {
        q: 'When approaching a railroad crossing without gates, you should:',
        choices: [
          'Stop, look, and listen',
          'Slow down, look, and prepare to stop',
          'Maintain speed if no train in sight',
          'Honk your horn continuously',
        ],
        answer: 1,
      },
    ],
    'Air Brakes': [
      {
        q: 'Before driving with air brakes, you must wait until the air pressure reaches at least:',
        choices: ['60 psi', '80 psi', '100 psi', '120 psi'],
        answer: 2,
      },
      {
        q: 'The air compressor governor controls:',
        choices: [
          'When the compressor stops pumping air',
          'How fast the compressor runs',
          'The warning buzzer pressure',
          'Brake chamber pressure',
        ],
        answer: 0,
      },
    ],
    'Combination Vehicles': [
      {
        q: 'The fifth-wheel locking jaws must completely surround the shank of the kingpin. This is called:',
        choices: [
          'Coupling lock',
          'Safety latch',
          'Locking engagement',
          'Full lock',
        ],
        answer: 3,
      },
      {
        q: 'When uncoupling a trailer you must:',
        choices: [
          'Raise the landing gear',
          'Disengage the locking handle',
          'Chock the trailer wheels',
          'All of the above',
        ],
        answer: 2,
      },
    ],
  };

  // --- 2. Question/Session State --------------------------------------
  let questions = questionBanks[testName] ? [...questionBanks[testName]] : [];
  let currentIdx = 0;
  let correctCount = 0;
  let userAnswers = [];

  // Shuffle questions (per session)
  function shuffleArray(arr) {
    return arr
      .map((q) => ({ ...q, _rand: Math.random() }))
      .sort((a, b) => a._rand - b._rand)
      .map(({ _rand, ...q }) => q);
  }
  questions = shuffleArray(questions);

  // --- 3. Render a single question -------------------------------------
  function showQuestion() {
    const { q, choices } = questions[currentIdx];
    container.innerHTML = `
      <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
        <h2>🧪 ${testName} (${currentIdx + 1}/${questions.length})</h2>
        <p style="margin:16px 0;"><strong>${q}</strong></p>
        <ul style="list-style:none; padding:0;">
          ${choices
            .map(
              (c, i) => `<li style="margin:8px 0;">
              <button class="choice-btn btn outline wide" data-choice="${i}" style="width:100%; padding:10px;" aria-label="${c}">
                ${c}
              </button>
            </li>`
            )
            .join('')}
        </ul>
      </div>
    `;

    // Keyboard/Accessibility: allow 1-4 keys
    window.onkeydown = (e) => {
      if (e.key >= '1' && e.key <= String(choices.length)) {
        const idx = parseInt(e.key, 10) - 1;
        chooseAnswer(idx);
      }
    };

    // Choice button click handler
    container.querySelectorAll('.choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chosen = parseInt(btn.dataset.choice, 10);
        chooseAnswer(chosen);
      });
    });
  }

  function chooseAnswer(chosen) {
    userAnswers[currentIdx] = chosen;
    if (chosen === questions[currentIdx].answer) correctCount++;
    currentIdx++;
    window.onkeydown = null;
    if (currentIdx < questions.length) {
      showQuestion();
    } else {
      showResults();
    }
  }

  // --- 4. Render Results, Review Answers --------------------------------
  async function showResults() {
    const total = questions.length;
    const pct = total ? Math.round((correctCount / total) * 100) : 0;

    // Save result to Firestore
    try {
      await addDoc(collection(db, 'testResults'), {
        studentId: currentUserEmail,
        testName,
        correct: correctCount,
        total,
        answers: userAnswers,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error('❌ Failed to save test result:', e);
      showToast('Error saving test result');
    }

    // Build review HTML
    let reviewHtml = '';
    questions.forEach((q, i) => {
      const correct = userAnswers[i] === q.answer;
      reviewHtml += `
        <div class="review-q" style="margin-bottom:1em;">
          <div style="font-weight:600;">Q${i + 1}: ${q.q}</div>
          <ul style="list-style:none; padding:0; margin:0.3em 0;">
            ${q.choices
              .map((c, idx) => {
                let style = '';
                if (idx === q.answer)
                  style = 'background:#caffcb; font-weight:700;';
                if (idx === userAnswers[i] && !correct)
                  style = 'background:#ffdbdb;';
                return `<li style="margin:3px 0;${style}">${c}${idx === userAnswers[i] ? (correct ? ' ✅' : ' ❌') : ''}</li>`;
              })
              .join('')}
          </ul>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto; text-align:center;">
        <h2>📊 ${testName} Results</h2>
        <p style="font-size:1.2em; margin:16px 0;">
          You scored <strong>${correctCount}/${total}</strong> (${pct}%)
        </p>
        <div style="text-align:left; margin:1.7em 0 2.2em 0;">${reviewHtml}</div>
        <button class="btn outline wide" data-nav="dashboard" style="margin-top:16px;">
          🏠 Back to Dashboard
        </button>
        <button class="btn wide" data-nav="practiceTests" style="margin-top:12px;">
          🔄 Try Again
        </button>
      </div>
    `;
    setupNavigation();

    // Dynamic imports to prevent circular dependency
    container
      .querySelector('[data-nav="dashboard"]')
      ?.addEventListener('click', () => {
        import('./student-dashboard.js').then((mod) =>
          mod.renderDashboard(container)
        );
      });
    container
      .querySelector('[data-nav="practiceTests"]')
      ?.addEventListener('click', () => {
        import('./practice-tests.js').then((mod) =>
          mod.renderPracticeTests(container)
        );
      });
  }

  // --- 5. Start quiz or show empty-state message -----------------------
  if (questions.length === 0) {
    container.innerHTML = `<div class="screen-wrapper fade-in"><p>No questions found for "${testName}".</p></div>`;
    setupNavigation();
  } else {
    showQuestion();
  }
}