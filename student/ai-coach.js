// student/ai-coach.js

import { getUserInitials, showToast, setupNavigation } from '../ui-helpers.js';
import { auth } from '../firebase.js';
import { askCDLAI } from './ai-api.js'; // Now points to student/ai-api.js

/**
 * Renders the AI Coach modal for CDL Buddy students.
 * Supports conversation history, context suggestions, FMCSA compliance, and responsive UI.
 * Now includes schoolId/role context, improved accessibility, and robust event cleanup.
 */
export function renderAICoach(container = document.getElementById('app')) {
  // Remove any existing modal overlays
  document.querySelectorAll('.ai-coach-modal').forEach((el) => el.remove());

  const context = (window.location.hash || 'dashboard').replace('#', '');
  const name = localStorage.getItem('fullName') || 'Driver';
  const isFirstTime = !localStorage.getItem('aiCoachWelcomed');

  // Multi-tenant: get school/role for context
  const schoolId = localStorage.getItem('schoolId') || '';
  const userRole = localStorage.getItem('userRole') || 'student';
  const email =
    localStorage.getItem('currentUserEmail') || auth.currentUser?.email || '';

  // Prompts tailored by app section/context
  const starterPrompts = {
    dashboard: [
      'What should I work on next?',
      'How do I finish my checklist?',
      'Explain ELDT in simple terms.',
      'Give me a CDL study tip.',
    ],
    profile: [
      'How do I complete my profile?',
      'How do I upload my permit?',
      'What is a DOT medical card?',
      'What are endorsements?',
    ],
    checklists: [
      'What does this checklist step mean?',
      'How do I know if my checklist is done?',
      'Why is this checklist important?',
    ],
    walkthrough: [
      'Help me memorize the walkthrough.',
      'How do I do the three-point brake check?',
      'Show me a memory drill for air brakes.',
    ],
    practiceTests: [
      'How do I prepare for the general knowledge test?',
      'Give me a practice question.',
      'Tips for passing air brakes.',
    ],
  };
  const suggestions = starterPrompts[context] || starterPrompts.dashboard;

  // Build modal
  const modal = document.createElement('div');
  modal.className = 'ai-coach-modal modal-overlay fade-in';
  modal.setAttribute('tabindex', '0');
  modal.innerHTML = `
    <div class="modal-glass-bg"></div>
    <div class="modal-card ai-coach-card glass" role="dialog" aria-modal="true" aria-label="AI CDL Coach">
      <div class="ai-coach-modal-header">
        <div class="coach-avatar" style="display:flex; align-items:center; justify-content:center; margin-bottom: 12px; animation: floatMascot 2.6s ease-in-out infinite;">
          <!-- Retro Monitor Coach SVG (your mascot here) -->
          <svg id="ai-coach-mascot" viewBox="0 0 88 88" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- SVG omitted for brevity -->
          </svg>
        </div>
        <span class="ai-coach-title" style="font-size: 1.25rem; font-weight: 700; color: var(--accent, #b6f0f7); margin-bottom: 4px;">AI Coach</span>
        <button class="modal-close" aria-label="Close" style="margin-left:auto;">&times;</button>
      </div>
      <div class="ai-coach-modal-body" aria-live="polite">
        <div class="ai-coach-intro">
          👋 Hi${name ? `, ${name}` : ''}! I’m your AI CDL Coach.<br>
          <span class="ai-coach-intro-small">
            ${
              isFirstTime
                ? `<b>Let’s get started! I can answer your CDL questions, help with profile steps, explain checklists, and guide you through the walkthrough. Try a suggestion below, or ask anything related to your CDL training.</b>`
                : `Ask me anything about your CDL process!`
            }
          </span>
        </div>
        <div class="ai-coach-suggestions">
          ${suggestions.map((txt) => `<button type="button" class="ai-suggestion">${txt}</button>`).join('')}
        </div>
        <div id="ai-chat-history" class="ai-chat-history"></div>
      </div>
      <form class="ai-coach-input-row" id="ai-coach-form" autocomplete="off">
        <input type="text" class="ai-coach-input" id="ai-coach-input"
          placeholder="Type your CDL question..." autocomplete="off" autofocus aria-label="Ask AI Coach"/>
        <button type="submit" class="btn ai-coach-send">Send</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  modal.focus();

  // Conversation state from session
  const chatHistoryEl = modal.querySelector('#ai-chat-history');
  let conversation = JSON.parse(
    sessionStorage.getItem('aiCoachHistory') || '[]'
  );
  if (!conversation.length) {
    conversation.push({
      role: 'assistant',
      content: `
        👋 Hi${name ? `, ${name}` : ''}! I’m your AI CDL Coach.
        <br>
        ${isFirstTime ? `<b>Let’s get started! I can answer your CDL questions, help with profile steps, explain checklists, and guide you through the walkthrough. Try a suggestion below, or ask anything related to your CDL training.</b>` : `Ask me anything about your CDL process!`}
      `,
    });
    localStorage.setItem('aiCoachWelcomed', 'yes');
  }

  // Renders message history in modal
  function renderHistory() {
    chatHistoryEl.innerHTML = conversation
      .map(
        (msg) => `
        <div class="ai-msg ai-msg--${msg.role}">
          ${
            msg.role === 'user'
              ? `<div class="ai-user-avatar">${getUserInitials()}</div>`
              : `<div class="ai-coach-avatar-mini">
                  <svg viewBox="0 0 32 32" width="28" height="28">
                    <rect x="2" y="5" width="28" height="18" rx="5" fill="#3f1784" stroke="#b6f0f7" stroke-width="2" />
                    <rect x="5" y="8" width="22" height="12" rx="3" fill="#4e91ad" fill-opacity="0.93" stroke="#c4dbe8" stroke-width="1"/>
                    <ellipse cx="11" cy="14" rx="1.3" ry="1.5" fill="#fff" />
                    <ellipse cx="21" cy="14" rx="1.3" ry="1.5" fill="#fff" />
                    <path d="M13,18 Q16,21 19,18" stroke="#fff" stroke-width="0.9" fill="none" stroke-linecap="round"/>
                  </svg>
                </div>`
          }
          <div class="ai-msg-bubble">${msg.content}
            ${msg.role === 'assistant' && msg.fmcsatag ? `<div class="ai-source-tag">${msg.fmcsatag}</div>` : ''}
          </div>
        </div>
      `
      )
      .join('');
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
  }
  renderHistory();

  // Suggestion quick-fill
  modal.querySelectorAll('.ai-suggestion').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = modal.querySelector('#ai-coach-input');
      input.value = btn.textContent;
      input.focus();
    });
  });

  // Main form: send question to AI
  modal.querySelector('#ai-coach-form').onsubmit = async (e) => {
    e.preventDefault();
    const input = modal.querySelector('#ai-coach-input');
    const question = input.value.trim();
    if (!question) return;
    conversation.push({ role: 'user', content: question });
    renderHistory();
    input.value = '';
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

    // Typing Dots
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'ai-msg ai-msg--assistant';
    loadingBubble.innerHTML = `<div class="ai-msg-bubble"><span class="typing-dots"><span>.</span><span>.</span><span>.</span></span></div>`;
    chatHistoryEl.appendChild(loadingBubble);
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

    // CALL AI with full user context
    let reply = '';
    try {
      reply = await askCDLAI(
        question,
        conversation.slice(-10),
        { role: userRole, schoolId, email, context } // send all useful context
      );
    } catch (err) {
      reply = "Sorry, I couldn't reach the AI right now.";
      // Optionally, log error here for admin analytics/debug
      console.error('AI Coach API error:', err);
    }

    let fmcsatag = 'Based on FMCSA regulations, updated 2024';
    if (
      reply.match(
        /ask your instructor|official FMCSA manual|not allowed|outside of CDL/i
      )
    )
      fmcsatag = '';

    if (/i (don'?t|cannot|can't) know|i am not sure|as an ai/i.test(reply)) {
      reply += `<br><span class="ai-handoff">[View the <a href="https://www.fmcsa.dot.gov/regulations/title49/section/393.1" target="_blank" rel="noopener">official FMCSA manual</a> or ask your instructor for help]</span>`;
    }

    // Remove loading dots before showing reply
    const loadingMsg = chatHistoryEl
      .querySelector('.typing-dots')
      ?.closest('.ai-msg');
    if (loadingMsg) loadingMsg.remove();

    conversation.push({ role: 'assistant', content: reply, fmcsatag });
    sessionStorage.setItem('aiCoachHistory', JSON.stringify(conversation));
    renderHistory();

    // Easter Egg every 10th user question
    if (conversation.filter((m) => m.role === 'user').length % 10 === 0) {
      setTimeout(() => {
        const funFacts = [
          '🚛 Did you know? The average 18-wheeler travels over 100,000 miles per year!',
          '💡 Tip: Reviewing checklists before every drive helps you pass real-world inspections.',
          '🎉 Keep going! Every question you ask gets you closer to that CDL.',
          '🛣️ CDL Fact: Federal law requires drivers to pass a skills test for each class of vehicle.',
          "👀 Coach’s wisdom: Don't forget your three-point brake check--it's a must-pass step!",
        ];
        const fun = funFacts[Math.floor(Math.random() * funFacts.length)];
        conversation.push({ role: 'assistant', content: fun });
        sessionStorage.setItem('aiCoachHistory', JSON.stringify(conversation));
        renderHistory();
      }, 700);
    }
  };

  // Modal close (and robust cleanup)
  function closeModal() {
    modal.remove();
    document.body.style.overflow = '';
    // Return focus to FAB/button if desired (optional)
    if (container && container.querySelector('#ai-coach-fab')) {
      container.querySelector('#ai-coach-fab').focus();
    }
    // Remove ESC event listener for good
    window.removeEventListener('keydown', escClose);
  }

  modal.querySelector('.modal-close')?.addEventListener('click', closeModal);

  // ESC key closes modal
  function escClose(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }
  window.addEventListener('keydown', escClose);

  // Navigation setup for modals/buttons
  setupNavigation();
}
