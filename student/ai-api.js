// student/ai-api.js

/**
 * Placeholder for the CDL AI Coach API.
 * This stub returns a test response so your app does not break if the real AI backend is not implemented yet.
 * Replace this with your real API integration (e.g. fetch, OpenAI call) later!
 * 
 * @param {string} question - The user's question.
 * @param {Array} history - (Optional) Recent chat history.
 * @returns {Promise<string>} Simulated AI response.
 */
export async function askCDLAI(question, history = []) {
  // Log for debugging
  if (window.APP_DEBUG?.featureFlags) {
    console.log("🧠 [ai-api.js] AI Coach asked:", question, history);
  }
  // Simulate a slight delay for realism
  await new Promise(res => setTimeout(res, 700));
  // Return placeholder reply
  return `🤖 [AI Coach Placeholder] You asked: "${question}"${
    history && history.length
      ? `<br><small>Chat history: ${history.length} exchanges</small>`
      : ""
  }`;
}