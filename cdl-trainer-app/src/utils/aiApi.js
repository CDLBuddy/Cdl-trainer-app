// src/utils/aiApi.js
// Thin client for your AI Coach backend (Vercel serverless, Firebase Fn, etc.)

const ENDPOINT = import.meta.env.VITE_AI_COACH_ENDPOINT || '/api/ai-coach' // override in .env

/**
 * askCDLAI(question, history, meta)
 * @param {string} question
 * @param {Array<{role:'user'|'assistant', content:string}>} history
 * @param {{role?:string, schoolId?:string, email?:string, context?:string}} meta
 */
export async function askCDLAI(question, history = [], meta = {}) {
  const payload = {
    question,
    history: history.slice(-20),
    meta,
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`AI Coach error ${res.status}: ${text || res.statusText}`)
  }

  const data = await res.json().catch(() => ({}))
  // Expect { reply: string }
  return data.reply || 'Sorry, I couldnt generate a response right now.'
}
