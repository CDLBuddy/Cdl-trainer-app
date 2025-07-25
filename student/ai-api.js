// student/ai-api.js

/**
 * Placeholder/mock for AI Coach API.
 * Replace this logic with your real API call when ready.
 * Accepts: question (string), conversation (array), meta (object: role, schoolId, email, context)
 */
export async function askCDLAI(question, conversation = [], meta = {}) {
  // Simulate network delay
  await new Promise(res => setTimeout(res, 900));

  // Demo/test logic:
  if (/checklist|progress/i.test(question)) {
    return "Your checklist is almost done! Just a few more steps to go.";
  }
  if (/profile|photo/i.test(question)) {
    return "To complete your profile, be sure to upload a permit photo and fill out all required fields.";
  }
  if (/walkthrough|memorize/i.test(question)) {
    return "Try repeating each section of the walkthrough out loud, or ask me for a memory drill!";
  }
  if (/endorsement|hazmat/i.test(question)) {
    return "An endorsement lets you drive special types of vehicles or carry certain cargo. Hazmat requires a special written test and TSA clearance.";
  }

  // Default mock AI reply:
  return `This is a placeholder AI Coach response for: "${question}"
  <br><br><i>(Your conversation and school context is: role=${meta.role}, schoolId=${meta.schoolId || "n/a"})</i>`;
}