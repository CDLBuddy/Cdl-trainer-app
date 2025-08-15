//src/components/AICoachModal.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react'

import { askCDLAI } from '@utils/aiApi.js' // e.g. "../utils/ai-api" -> rename file to aiApi.js for consistency
import { auth } from '@utils/firebase.js'

import { getUserInitials } from '@/components/ToastContext.js'

import styles from './AICoachModal.module.css'

// If your API util is named differently, update this import:

const MAX_HISTORY = 20

// super-light sanitizer (keeps bold/links/line-breaks we generate)
function sanitize(html) {
  if (!html) return ''
  return String(html)
    .replace(/<\s*script/gi, '&lt;script') // no scripts
    .replace(/on\w+="[^"]*"/gi, '') // no inline handlers
    .replace(/javascript:/gi, '') // strip js: urls
}

function usePerUserKey(base) {
  const email =
    localStorage.getItem('currentUserEmail') ||
    auth.currentUser?.email ||
    'anon'
  const schoolId = localStorage.getItem('schoolId') || 'default'
  return `${base}:${schoolId}:${email}`
}

function useAutosizeTextarea(ref, value) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
  }, [ref, value])
}

/**
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - context?: "dashboard" | "profile" | "checklists" | "walkthrough" | "practiceTests" | string
 */
function AICoachModal({ open, onClose, context = 'dashboard' }) {
  const [conversation, setConversation] = useState([])
  const [input, setInput] = useState('')
  const [aiPending, setAiPending] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(false)

  const chatRef = useRef(null)
  const inputRef = useRef(null)
  const sendBtnRef = useRef(null)
  const closeBtnRef = useRef(null)

  const name = localStorage.getItem('fullName') || 'Driver'
  const userRole = localStorage.getItem('userRole') || 'student'
  const schoolId = localStorage.getItem('schoolId') || ''
  const email =
    localStorage.getItem('currentUserEmail') || auth.currentUser?.email || ''

  const storageKey = usePerUserKey('aiCoachHistory')

  // Starter suggestions by context
  const starterPrompts = useMemo(
    () => ({
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
    }),
    []
  )

  const suggestions = starterPrompts[context] || starterPrompts.dashboard

  // Open: load history (per school+user), seed greeting
  useEffect(() => {
    if (!open) return

    let convo = []
    let firstTime = false
    try {
      convo = JSON.parse(sessionStorage.getItem(storageKey) || '[]')
      if (!convo.length) {
        firstTime = true
        convo = [
          {
            role: 'assistant',
            content:
              `👋 Hi${name ? `, ${name}` : ''}! I’m your AI CDL Coach.<br>` +
              `<b>I can answer CDL questions, help with profile steps, explain checklists, and guide you through the walkthrough.</b>`,
          },
        ]
      }
    } catch {
      firstTime = true
      convo = [
        {
          role: 'assistant',
          content: `👋 Hi${name ? `, ${name}` : ''}! I’m your AI CDL Coach.`,
        },
      ]
    }
    setConversation(convo)
    setIsFirstTime(firstTime)

    // focus input after a tick
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Persist history + keep scrolled
  useEffect(() => {
    if (!open) return
    sessionStorage.setItem(
      storageKey,
      JSON.stringify(conversation.slice(-MAX_HISTORY))
    )
    // scroll bottom
    const t = setTimeout(() => {
      if (chatRef.current)
        chatRef.current.scrollTop = chatRef.current.scrollHeight
    }, 50)
    return () => clearTimeout(t)
  }, [conversation, open, storageKey])

  // ESC to close
  useEffect(() => {
    if (!open) return
    const handler = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Simple focus trap (close, input, send)
  useEffect(() => {
    if (!open) return
    const focusables = [
      closeBtnRef.current,
      inputRef.current,
      sendBtnRef.current,
    ].filter(Boolean)
    let idx = 1 // start on input
    inputRef.current?.focus()

    const handler = e => {
      if (e.key !== 'Tab') return
      e.preventDefault()
      idx =
        (idx + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length
      focusables[idx]?.focus()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (chatRef.current)
        chatRef.current.scrollTop = chatRef.current.scrollHeight
    }, 60)
  }, [])

  // Autosize the input
  useAutosizeTextarea(inputRef, input)

  async function handleSend(e) {
    e?.preventDefault?.()
    if (!input.trim() || aiPending) return

    const question = input.trim()
    setInput('')
    setAiPending(true)

    // Push user question + loading bubble
    setConversation(c => [
      ...c,
      { role: 'user', content: question },
      {
        role: 'assistant',
        content: `<span class='typing-dots'><span>.</span><span>.</span><span>.</span></span>`,
      },
    ])
    scrollToBottom()

    let reply = ''
    try {
      reply = await askCDLAI(question, conversation.slice(-10), {
        role: userRole,
        schoolId,
        email,
        context,
      })
    } catch {
      reply = "Sorry, I couldn't reach the AI right now."
    }

    let fmcsatag = 'Based on FMCSA regulations, updated 2024'
    if (
      /ask your instructor|official FMCSA manual|outside of CDL/i.test(reply)
    ) {
      fmcsatag = ''
    }
    if (/i (don'?t|cannot|can't) know|i am not sure|as an ai/i.test(reply)) {
      reply += `<br><span class='ai-handoff'>[View the <a href="https://www.fmcsa.dot.gov/regulations/title49/section/393.1" target="_blank" rel="noopener">official FMCSA manual</a> or ask your instructor for help]</span>`
    }

    // Replace loader with real answer
    setConversation(c => {
      const trimmed = c.slice(0, -1)
      return [...trimmed, { role: 'assistant', content: reply, fmcsatag }]
    })

    setAiPending(false)
    scrollToBottom()
  }

  const handleSuggestion = txt => {
    setInput(txt)
    inputRef.current?.focus()
  }

  const handleReset = () => {
    if (!window.confirm('Clear all AI Coach messages?')) return
    setConversation([
      {
        role: 'assistant',
        content:
          `👋 Hi${name ? `, ${name}` : ''}! I’m your AI CDL Coach.<br>` +
          `<b>Let’s get started! I can answer your CDL questions, help with profile steps, explain checklists, and guide you through the walkthrough.</b>`,
      },
    ])
    sessionStorage.removeItem(storageKey)
    inputRef.current?.focus()
  }

  if (!open) return null

  return (
    <div
      className={`${styles.modalOverlay} fade-in`}
      role="dialog"
      aria-modal="true"
      aria-label="AI CDL Coach"
    >
      <div
        className={styles.backdrop}
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Close AI Coach"
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClose()
          }
        }}
      />
      <div className={`${styles.card} glass`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.mascot}>
            {/* tiny SVG buddy */}
            <svg viewBox="0 0 88 88" width="56" height="56" aria-hidden="true">
              <circle cx="44" cy="44" r="40" fill="#b6f0f7" />
              <ellipse cx="32" cy="38" rx="7" ry="10" fill="#fff" />
              <ellipse cx="56" cy="38" rx="7" ry="10" fill="#fff" />
              <ellipse cx="32" cy="40" rx="2.5" ry="3" fill="#333" />
              <ellipse cx="56" cy="40" rx="2.5" ry="3" fill="#333" />
              <ellipse cx="44" cy="60" rx="12" ry="7" fill="#fff" />
              <ellipse cx="44" cy="62" rx="8" ry="3" fill="#4e91ad" />
              <ellipse cx="44" cy="46" rx="19" ry="12" fill="#b6f0f7" />
            </svg>
          </div>
          <span className={styles.title}>AI Coach</span>
          <button
            ref={closeBtnRef}
            className={styles.close}
            onClick={onClose}
            aria-label="Close AI Coach"
            type="button"
          >
            ×
          </button>
        </div>

        {/* Intro & suggestions */}
        <div className={styles.intro}>
          👋 Hi{name ? `, ${name}` : ''}! I’m your AI CDL Coach.
          <div className={styles.introSmall}>
            {isFirstTime ? (
              <b>
                I can answer CDL questions, help with profile steps, explain
                checklists, and guide you through the walkthrough.
              </b>
            ) : (
              'Ask me anything about your CDL process!'
            )}
          </div>
        </div>

        <div className={styles.suggestions}>
          {suggestions.map((txt, idx) => (
            <button
              key={idx}
              className={styles.suggestion}
              onClick={() => handleSuggestion(txt)}
              type="button"
            >
              {txt}
            </button>
          ))}
        </div>

        {/* Chat history */}
        <div ref={chatRef} className={styles.history}>
          {conversation.map((msg, idx) => (
            <div
              key={idx}
              className={`${styles.msg} ${styles[`msg_${msg.role}`]}`}
            >
              {msg.role === 'user' ? (
                <div className={styles.userAvatar}>{getUserInitials(name)}</div>
              ) : (
                <div className={styles.coachAvatarMini} />
              )}
              <div
                className={styles.bubble}
                dangerouslySetInnerHTML={{
                  __html:
                    sanitize(msg.content) +
                    (msg.fmcsatag
                      ? `<div class="${styles.sourceTag}">${sanitize(msg.fmcsatag)}</div>`
                      : ''),
                }}
              />
            </div>
          ))}
        </div>

        {/* Input row */}
        <form className={styles.inputRow} onSubmit={handleSend}>
          <textarea
            ref={inputRef}
            className={styles.input}
            placeholder="Type your CDL question…"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={aiPending}
            rows={1}
          />
          <button
            ref={sendBtnRef}
            type="submit"
            className={styles.send}
            disabled={aiPending || !input.trim()}
          >
            Send
          </button>
          <button
            type="button"
            className={`${styles.reset} btn outline`}
            onClick={handleReset}
          >
            Reset
          </button>
        </form>
      </div>
    </div>
  )
}

export default memo(AICoachModal)
