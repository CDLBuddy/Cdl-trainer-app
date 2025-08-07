import React, { useEffect, useRef, useState } from "react";
import { askCDLAI } from "../utils/ai-api"; // update path as needed!
import { getUserInitials, showToast } from "../utils/ui-helpers";
import { auth } from "../utils/firebase";

const MAX_HISTORY = 20;

function AICoachModal({ open, onClose, context = "dashboard" }) {
  const [conversation, setConversation] = useState([]);
  const [input, setInput] = useState("");
  const [aiPending, setAiPending] = useState(false);
  const chatRef = useRef();
  const [isFirstTime, setIsFirstTime] = useState(false);
  const name = localStorage.getItem("fullName") || "Driver";
  const userRole = localStorage.getItem("userRole") || "student";
  const schoolId = localStorage.getItem("schoolId") || "";
  const email =
    localStorage.getItem("currentUserEmail") || auth.currentUser?.email || "";

  // Suggestions by page context
  const starterPrompts = {
    dashboard: [
      "What should I work on next?",
      "How do I finish my checklist?",
      "Explain ELDT in simple terms.",
      "Give me a CDL study tip.",
    ],
    profile: [
      "How do I complete my profile?",
      "How do I upload my permit?",
      "What is a DOT medical card?",
      "What are endorsements?",
    ],
    checklists: [
      "What does this checklist step mean?",
      "How do I know if my checklist is done?",
      "Why is this checklist important?",
    ],
    walkthrough: [
      "Help me memorize the walkthrough.",
      "How do I do the three-point brake check?",
      "Show me a memory drill for air brakes.",
    ],
    practiceTests: [
      "How do I prepare for the general knowledge test?",
      "Give me a practice question.",
      "Tips for passing air brakes.",
    ],
  };

  const suggestions = starterPrompts[context] || starterPrompts.dashboard;

  // Load conversation on open
  useEffect(() => {
    if (open) {
      let convo = [];
      let first = false;
      try {
        convo = JSON.parse(sessionStorage.getItem("aiCoachHistory") || "[]");
        if (!convo.length) {
          first = true;
          convo = [
            {
              role: "assistant",
              content: `👋 Hi${name ? `, ${name}` : ""}! I’m your AI CDL Coach.<br>${
                first
                  ? `<b>Let’s get started! I can answer your CDL questions, help with profile steps, explain checklists, and guide you through the walkthrough. Try a suggestion below, or ask anything related to your CDL training.</b>`
                  : `Ask me anything about your CDL process!`
              }`,
            },
          ];
        }
      } catch {
        first = true;
        convo = [
          {
            role: "assistant",
            content: `👋 Hi${name ? `, ${name}` : ""}! I’m your AI CDL Coach.`,
          },
        ];
      }
      setIsFirstTime(first);
      setConversation(convo);
      setTimeout(() => {
        chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
      }, 80);
    }
  }, [open, name]);

  // Save conversation whenever it changes
  useEffect(() => {
    if (open) {
      sessionStorage.setItem(
        "aiCoachHistory",
        JSON.stringify(conversation.slice(-MAX_HISTORY))
      );
      setTimeout(() => {
        chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
      }, 80);
    }
  }, [conversation, open]);

  // Focus input on open
  const inputRef = useRef();
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Close modal with Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Send message
  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || aiPending) return;
    const question = input.trim();
    setConversation((c) => [
      ...c,
      { role: "user", content: question },
    ]);
    setInput("");
    setAiPending(true);

    // Show loading bubble
    setConversation((c) => [
      ...c,
      { role: "assistant", content: `<span class='typing-dots'><span>.</span><span>.</span><span>.</span></span>` },
    ]);

    // Actually call AI API
    let reply = "";
    try {
      reply = await askCDLAI(question, conversation.slice(-10), {
        role: userRole,
        schoolId,
        email,
        context,
      });
    } catch {
      reply = "Sorry, I couldn't reach the AI right now.";
    }

    let fmcsatag = "Based on FMCSA regulations, updated 2024";
    if (
      reply.match(
        /ask your instructor|official FMCSA manual|not allowed|outside of CDL/i
      )
    )
      fmcsatag = "";

    if (/i (don'?t|cannot|can't) know|i am not sure|as an ai/i.test(reply)) {
      reply += `<br><span class='ai-handoff'>[View the <a href="https://www.fmcsa.dot.gov/regulations/title49/section/393.1" target="_blank" rel="noopener">official FMCSA manual</a> or ask your instructor for help]</span>`;
    }

    // Remove loading bubble
    setConversation((c) => {
      const trimmed = c.slice(0, -1); // remove last (loading) bubble
      return [
        ...trimmed,
        { role: "assistant", content: reply, fmcsatag },
      ];
    });

    setAiPending(false);
  }

  function handleSuggestion(txt) {
    setInput(txt);
    inputRef.current?.focus();
  }

  function handleReset() {
    if (!window.confirm("Clear all AI Coach messages?")) return;
    setConversation([
      {
        role: "assistant",
        content: `👋 Hi${name ? `, ${name}` : ""}! I’m your AI CDL Coach.<br>${
          isFirstTime
            ? `<b>Let’s get started! I can answer your CDL questions, help with profile steps, explain checklists, and guide you through the walkthrough. Try a suggestion below, or ask anything related to your CDL training.</b>`
            : `Ask me anything about your CDL process!`
        }`,
      },
    ]);
    sessionStorage.removeItem("aiCoachHistory");
  }

  // --- MODAL LAYOUT ---
  if (!open) return null;

  return (
    <div className="ai-coach-modal modal-overlay fade-in" tabIndex={0} style={{ zIndex: 99999 }}>
      <div className="modal-glass-bg" />
      <div className="modal-card ai-coach-card glass" role="dialog" aria-modal="true" aria-label="AI CDL Coach">
        <div className="ai-coach-modal-header" style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12, animation: "floatMascot 2.6s ease-in-out infinite" }}>
            {/* Mascot SVG or your logo here */}
            <svg id="ai-coach-mascot" viewBox="0 0 88 88" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* SVG ... */}
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
          <span className="ai-coach-title" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent, #b6f0f7)" }}>AI Coach</span>
          <button className="modal-close" aria-label="Close" style={{ marginLeft: "auto", fontSize: 26 }} onClick={onClose}>&times;</button>
        </div>
        <div className="ai-coach-modal-body" aria-live="polite">
          <div className="ai-coach-intro">
            👋 Hi{(name ? `, ${name}` : "")}! I’m your AI CDL Coach.<br />
            <span className="ai-coach-intro-small">
              {isFirstTime
                ? (
                  <b>Let’s get started! I can answer your CDL questions, help with profile steps, explain checklists, and guide you through the walkthrough. Try a suggestion below, or ask anything related to your CDL training.</b>
                )
                : "Ask me anything about your CDL process!"}
            </span>
          </div>
          <div className="ai-coach-suggestions">
            {suggestions.map((txt, idx) => (
              <button key={idx} type="button" className="ai-suggestion" onClick={() => handleSuggestion(txt)}>{txt}</button>
            ))}
          </div>
          <div ref={chatRef} id="ai-chat-history" className="ai-chat-history" style={{ maxHeight: 280, overflowY: "auto" }}>
            {conversation.map((msg, idx) => (
              <div key={idx} className={`ai-msg ai-msg--${msg.role}`}>
                {msg.role === "user" ? (
                  <div className="ai-user-avatar">{getUserInitials(name)}</div>
                ) : (
                  <div className="ai-coach-avatar-mini">{/* Coach SVG icon here if you want */}</div>
                )}
                <div
                  className="ai-msg-bubble"
                  dangerouslySetInnerHTML={{ __html: msg.content + (msg.fmcsatag ? `<div class="ai-source-tag">${msg.fmcsatag}</div>` : "") }}
                />
              </div>
            ))}
          </div>
        </div>
        <form className="ai-coach-input-row" id="ai-coach-form" autoComplete="off" style={{ display: "flex", marginTop: 10 }} onSubmit={handleSend}>
          <input
            ref={inputRef}
            type="text"
            className="ai-coach-input"
            id="ai-coach-input"
            placeholder="Type your CDL question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            aria-label="Ask AI Coach"
            disabled={aiPending}
            style={{ flex: 1, marginRight: 8 }}
          />
          <button type="submit" className="btn ai-coach-send" disabled={aiPending || !input.trim()}>Send</button>
          <button type="button" className="btn outline ai-coach-reset" style={{ marginLeft: 12 }} onClick={handleReset} aria-label="Reset Conversation">
            Reset Chat
          </button>
        </form>
      </div>
    </div>
  );
}

export default AICoachModal;
