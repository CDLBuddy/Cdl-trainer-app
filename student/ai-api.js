// student/ai-api.js

/**
 * Mock AI Coach API for CDL Trainer.
 * Replace with your real API call when integrating production AI.
 *
 * @param {string} question - The student's question.
 * @param {Array} [conversation=[]] - Conversation history, if any.
 * @param {Object} [meta={}] - User/session context: { role, schoolId, email, context }
 * @returns {Promise<string>} - AI Coach's reply as HTML-formatted string.
 */
export async function askCDLAI(question, conversation = [], meta = {}) {
  // Simulate network latency for realism
  await new Promise((res) => setTimeout(res, 900));

  // Simple keyword patterns (replace/expand for production)
  if (/\b(checklist|progress)\b/i.test(question)) {
    return 'Your checklist is almost done! Just a few more steps to go.';
  }
  if (/\b(profile|photo)\b/i.test(question)) {
    return 'To complete your profile, be sure to upload a permit photo and fill out all required fields.';
  }
  if (/\b(walkthrough|memorize)\b/i.test(question)) {
    return 'Try repeating each section of the walkthrough out loud, or ask me for a memory drill!';
  }
  if (/\b(endorsement|hazmat)\b/i.test(question)) {
    return 'An endorsement lets you drive special types of vehicles or carry certain cargo. Hazmat requires a special written test and TSA clearance.';
  }

  // Fallback random AI-style friendly response
  const fallbacks = [
    "That's a great question! I'm here to help you on your CDL journey.",
    "Not sure yet, but keep asking—I'm learning more every day!",
    "Let's find the answer together. Try asking me something about practice tests or endorsements.",
    `I'm your AI Coach. You can ask about walk-throughs, tests, or anything CDL!`,
  ];
  const friendly = fallbacks[Math.floor(Math.random() * fallbacks.length)];

  // Add meta/context note for dev demo/testing only (remove in prod if not needed)
  const contextNote = `<br><br><i>(role=${meta.role || 'student'}, schoolId=${meta.schoolId || 'n/a'}, user=${meta.email || 'anon'})</i>`;

  return `${friendly} <br><br><span style="font-size:0.93em;color:#aaa;">${contextNote}</span>`;
}
