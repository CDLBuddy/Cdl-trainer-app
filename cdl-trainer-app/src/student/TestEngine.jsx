// src/student/TestEngine.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { db } from "../utils/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { showToast } from "../utils/ui-helpers";

const QUESTION_BANKS = {
  "General Knowledge": [
    {
      q: "What is the maximum allowed blood alcohol concentration for CDL drivers?",
      choices: ["0.02%", "0.04%", "0.08%", "0.10%"],
      answer: 1,
    },
    {
      q: "When approaching a railroad crossing without gates, you should:",
      choices: [
        "Stop, look, and listen",
        "Slow down, look, and prepare to stop",
        "Maintain speed if no train in sight",
        "Honk your horn continuously",
      ],
      answer: 1,
    },
  ],
  "Air Brakes": [
    {
      q: "Before driving with air brakes, you must wait until the air pressure reaches at least:",
      choices: ["60 psi", "80 psi", "100 psi", "120 psi"],
      answer: 2,
    },
    {
      q: "The air compressor governor controls:",
      choices: [
        "When the compressor stops pumping air",
        "How fast the compressor runs",
        "The warning buzzer pressure",
        "Brake chamber pressure",
      ],
      answer: 0,
    },
  ],
  "Combination Vehicles": [
    {
      q: "The fifth-wheel locking jaws must completely surround the shank of the kingpin. This is called:",
      choices: ["Coupling lock", "Safety latch", "Locking engagement", "Full lock"],
      answer: 3,
    },
    {
      q: "When uncoupling a trailer you must:",
      choices: ["Raise the landing gear", "Disengage the locking handle", "Chock the trailer wheels", "All of the above"],
      answer: 2,
    },
  ],
};

// Shuffle without mutating original
function shuffleArray(arr) {
  return arr
    .map((q) => ({ ...q, _r: Math.random() }))
    .sort((a, b) => a._r - b._r)
    .map(({ _r, ...q }) => q);
}

function getCurrentUserEmail(passed) {
  return (
    passed ||
    window.currentUserEmail ||
    localStorage.getItem("currentUserEmail") ||
    (window.auth?.currentUser && window.auth.currentUser.email) ||
    null
  );
}

const CHOICE_KEYS = ["1", "2", "3", "4"];

export default function TestEngine({ testName, passedUserEmail }) {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [stage, setStage] = useState("quiz"); // "quiz" | "results" | "error"
  const [saving, setSaving] = useState(false);

  // Prevent duplicate save (StrictMode double-invoke friendly)
  const hasSavedRef = useRef(false);

  // Normalize/validate incoming test
  useEffect(() => {
    hasSavedRef.current = false; // reset per run
    if (!testName || !QUESTION_BANKS[testName]) {
      setStage("error");
      setQuestions([]);
      return;
    }
    const qs = shuffleArray(QUESTION_BANKS[testName]);
    setQuestions(qs);
    setCurrentIdx(0);
    setCorrectCount(0);
    setUserAnswers(Array(qs.length).fill(undefined));
    setStage("quiz");
  }, [testName]);

  // Stable answer handler
  const handleChoice = useCallback(
    (idx) => {
      if (stage !== "quiz") return;
      setUserAnswers((prev) => {
        // Guard: avoid answering after finalization
        if (!questions[currentIdx]) return prev;
        const next = [...prev];
        next[currentIdx] = idx;
        return next;
      });

      // Check correctness against current question
      if (questions[currentIdx] && idx === questions[currentIdx].answer) {
        setCorrectCount((prev) => prev + 1);
      }

      // Move next or finish
      setCurrentIdx((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= questions.length) {
          setStage("results");
          return prev; // keep index stable at last question
        }
        return nextIndex;
      });
    },
    [stage, questions, currentIdx]
  );

  // Keyboard shortcuts (1–4)
  useEffect(() => {
    if (stage !== "quiz") return;
    const onKey = (e) => {
      const i = CHOICE_KEYS.indexOf(e.key);
      const max = questions[currentIdx]?.choices?.length ?? 0;
      if (i !== -1 && i < max) {
        e.preventDefault();
        handleChoice(i);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, currentIdx, questions, handleChoice]);

  // Warn on unload mid-quiz
  useEffect(() => {
    if (stage !== "quiz") return;
    const beforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [stage]);

  // Save to Firestore on results (once)
  useEffect(() => {
    if (stage !== "results") return;
    if (hasSavedRef.current) return;

    const total = questions.length;
    const payload = {
      studentId: getCurrentUserEmail(passedUserEmail),
      testName,
      correct: correctCount,
      total,
      answers: userAnswers,
      timestamp: serverTimestamp(),
    };

    (async () => {
      setSaving(true);
      try {
        await addDoc(collection(db, "testResults"), payload);
        hasSavedRef.current = true;
      } catch (e) {
        showToast("Error saving test result.", 4000, "error");
      } finally {
        setSaving(false);
      }
    })();
  }, [stage, questions.length, correctCount, userAnswers, testName, passedUserEmail]);

  // ---------- Renders ----------
  if (stage === "error") {
    return (
      <div className="screen-wrapper fade-in" style={{ padding: 20, maxWidth: 640, margin: "0 auto" }}>
        <h2>🧪 {testName || "Unknown Test"}</h2>
        <p>No questions found for this test.</p>
        <button className="btn outline" onClick={() => navigate("/student/practice-tests")}>
          Back to Practice Tests
        </button>
      </div>
    );
  }

  if (stage === "results") {
    const total = questions.length;
    const pct = total ? Math.round((correctCount / total) * 100) : 0;

    return (
      <div className="screen-wrapper fade-in" style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
        <h2>📊 {testName} Results</h2>
        <p style={{ fontSize: "1.2em", margin: "16px 0" }}>
          You scored <strong>{correctCount}/{total}</strong> ({pct}%)
        </p>

        <div style={{ textAlign: "left", margin: "1.7em 0 2.2em 0" }}>
          {questions.map((q, i) => {
            const userPick = userAnswers[i];
            const correct = userPick === q.answer;
            return (
              <div className="review-q" style={{ marginBottom: "1em" }} key={i}>
                <div style={{ fontWeight: 600 }}>Q{i + 1}: {q.q}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0.3em 0" }}>
                  {q.choices.map((c, idx) => {
                    let style = {};
                    if (idx === q.answer) style = { background: "#caffcb", fontWeight: 700 };
                    if (idx === userPick && !correct) style = { background: "#ffdbdb" };
                    return (
                      <li key={idx} style={{ margin: "3px 0", padding: "2px 4px", borderRadius: 6 }}>
                        {c}
                        {idx === userPick ? (correct ? " ✅" : " ❌") : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="u-flex u-gap-8 u-wrap" style={{ marginTop: 12, justifyContent: "center" }}>
          <button className="btn outline wide" onClick={() => navigate("/student/dashboard")}>
            🏠 Back to Dashboard
          </button>
          <button className="btn wide" onClick={() => navigate("/student/practice-tests")}>
            🔄 Try Again
          </button>
        </div>

        {saving && <div style={{ marginTop: 16 }}>Saving your results…</div>}
      </div>
    );
  }

  // Quiz stage
  if (!questions.length) return null;
  const { q, choices } = questions[currentIdx];

  return (
    <div className="screen-wrapper fade-in" style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <h2>
        🧪 {testName} ({currentIdx + 1}/{questions.length})
      </h2>

      <p style={{ margin: "16px 0" }}>
        <strong>{q}</strong>
      </p>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {choices.map((c, i) => (
          <li key={i} style={{ margin: "8px 0" }}>
            <button
              className="choice-btn btn outline wide"
              style={{ width: "100%", padding: 10 }}
              aria-label={`Choice ${i + 1} of ${choices.length}: ${c}`}
              onClick={() => handleChoice(i)}
            >
              {c}
            </button>
          </li>
        ))}
      </ul>

      <div className="u-muted" style={{ marginTop: 20, fontSize: ".97em" }}>
        Press 1–{choices.length} on your keyboard to select an answer
      </div>
    </div>
  );
}