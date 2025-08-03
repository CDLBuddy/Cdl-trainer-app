// student/ai-api.js

/**
 * Placeholder/mock for AI Coach API.
 * Replace this logic with your real API call when ready.
 * Accepts: question (string), conversation (array), meta (object: role, schoolId, email, context)
 */
export async function askCDLAI(question, conversation = [], meta = {}) {
  // Simulate network delay
  await new Promise((res) => setTimeout(res, 900));

  // Demo/test logic:
  if (/checklist|progress/i.test(question)) {
    return 'Your checklist is almost done! Just a few more steps to go.';
  }
  if (/profile|photo/i.test(question)) {
    return 'To complete your profile, be sure to upload a permit photo and fill out all required fields.';
  }
  if (/walkthrough|memorize/i.test(question)) {
    return 'Try repeating each section of the walkthrough out loud, or ask me for a memory drill!';
  }
  if (/endorsement|hazmat/i.test(question)) {
    return 'An endorsement lets you drive special types of vehicles or carry certain cargo. Hazmat requires a special written test and TSA clearance.';
  }

  // Default mock AI reply: random friendly fallback
  const fallbacks = [
    "That's a great question! I'm here to help you on your CDL journey.",
    "Not sure yet, but keep asking—I'm learning more every day!",
    "Let's find the answer together. Try asking me something about practice tests or endorsements.",
    `I'm your AI Coach. You can ask about walk-throughs, tests, or anything CDL!`,
  ];
  const friendly = fallbacks[Math.floor(Math.random() * fallbacks.length)];

  // Compose context note (for demo/testing)
  const contextNote = `<br><br><i>(role=${meta.role || 'student'}, schoolId=${meta.schoolId || 'n/a'}, user=${meta.email || 'anon'})</i>`;

  return `${friendly} <br><br><span style="font-size:0.93em;color:#aaa;">${contextNote}</span>`;
}