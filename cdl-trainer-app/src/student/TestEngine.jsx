import React, { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
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
      choices: [
        "Coupling lock",
        "Safety latch",
        "Locking engagement",
        "Full lock",
      ],
      answer: 3,
    },
    {
      q: "When uncoupling a trailer you must:",
      choices: [
        "Raise the landing gear",
        "Disengage the locking handle",
        "Chock the trailer wheels",
        "All of the above",
      ],
      answer: 2,
    },
  ],
};

// Shuffle array
function shuffleArray(arr) {
  return arr
    .map((q) => ({ ...q, _rand: Math.random() }))
    .sort((a, b) => a._rand - b._rand)
    .map(({ _rand, ...q }) => q);
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

const TestEngine = ({ testName, passedUserEmail }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [stage, setStage] = useState("quiz"); // quiz | results | error
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!testName || !QUESTION_BANKS[testName]) {
      setStage("error");
      return;
    }
    setQuestions(shuffleArray(QUESTION_BANKS[testName]));
    setCurrentIdx(0);
    setCorrectCount(0);
    setUserAnswers([]);
    setStage("quiz");
    // eslint-disable-next-line
  }, [testName]);

  // Keyboard accessibility (1-4)
  useEffect(() => {
    if (stage !== "quiz") return;
    const handleKey = (e) => {
      if (
        e.key >= "1" &&
        e.key <= String(questions[currentIdx]?.choices?.length || "4")
      ) {
        handleChoice(parseInt(e.key, 10) - 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line
  }, [stage, questions, currentIdx]);

  if (stage === "error") {
    return (
      <div className="screen-wrapper fade-in">
        <h2>🧪 {testName}</h2>
        <p>No questions found for this test.</p>
        <button className="btn outline" onClick={() => navigate("/student-practice-tests")}>
          Back to Practice Tests
        </button>
      </div>
    );
  }

  // Handler for answering a question
  function handleChoice(idx) {
    setUserAnswers((prev) => {
      const next = [...prev];
      next[currentIdx] = idx;
      return next;
    });
    if (idx === questions[currentIdx].answer) {
      setCorrectCount((prev) => prev + 1);
    }
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setStage("results");
    }
  }

  // Result save to Firestore
  useEffect(() => {
    if (stage !== "results") return;
    const saveResults = async () => {
      setSaving(true);
      try {
        await addDoc(collection(db, "testResults"), {
          studentId: getCurrentUserEmail(passedUserEmail),
          testName,
          correct: correctCount,
          total: questions.length,
          answers: userAnswers,
          timestamp: serverTimestamp(),
        });
      } catch (e) {
        showToast("Error saving test result.", 4000, "error");
      } finally {
        setSaving(false);
      }
    };
    saveResults();
    // eslint-disable-next-line
  }, [stage]);

  // --- Results and Review Render ---
  if (stage === "results") {
    const total = questions.length;
    const pct = total ? Math.round((correctCount / total) * 100) : 0;

    return (
      <div className="screen-wrapper fade-in" style={{ padding: 20, maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <h2>📊 {testName} Results</h2>
        <p style={{ fontSize: "1.2em", margin: "16px 0" }}>
          You scored <strong>{correctCount}/{total}</strong> ({pct}%)
        </p>
        <div style={{ textAlign: "left", margin: "1.7em 0 2.2em 0" }}>
          {questions.map((q, i) => {
            const correct = userAnswers[i] === q.answer;
            return (
              <div className="review-q" style={{ marginBottom: "1em" }} key={i}>
                <div style={{ fontWeight: 600 }}>
                  Q{i + 1}: {q.q}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0.3em 0" }}>
                  {q.choices.map((c, idx) => {
                    let style = {};
                    if (idx === q.answer) style = { background: "#caffcb", fontWeight: 700 };
                    if (idx === userAnswers[i] && !correct) style = { background: "#ffdbdb" };
                    return (
                      <li key={idx} style={{ margin: "3px 0", ...style }}>
                        {c}
                        {idx === userAnswers[i]
                          ? correct
                            ? " ✅"
                            : " ❌"
                          : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        <button className="btn outline wide" style={{ marginTop: 16 }} onClick={() => navigate("/student-dashboard")}>
          🏠 Back to Dashboard
        </button>
        <button className="btn wide" style={{ marginTop: 12 }} onClick={() => navigate("/student-practice-tests")}>
          🔄 Try Again
        </button>
        {saving && <div style={{ marginTop: 16 }}>Saving your results…</div>}
      </div>
    );
  }

  // --- Question Render ---
  if (!questions.length) return null;
  const { q, choices } = questions[currentIdx];

  return (
    <div className="screen-wrapper fade-in" style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
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
              aria-label={c}
              onClick={() => handleChoice(i)}
            >
              {c}
            </button>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 20, fontSize: ".97em", color: "#666" }}>
        <span>Press 1-{choices.length} on your keyboard to select an answer</span>
      </div>
    </div>
  );
};

export default TestEngine;
