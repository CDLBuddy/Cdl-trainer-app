import React, { useEffect, useRef, useState } from "react";
import { db, auth } from "../utils/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  showToast,
  updateELDTProgress,
  markStudentWalkthroughComplete,
  getUserProgress,
  setupNavigation,
} from "../utils/ui-helpers";
import { getWalkthroughByClass, getWalkthroughLabel } from "../walkthrough-data";
import { useNavigate } from "react-router-dom";

// Util: get user email robustly
function getCurrentUserEmail() {
  return (
    window.currentUserEmail ||
    localStorage.getItem("currentUserEmail") ||
    (auth?.currentUser && auth.currentUser.email) ||
    ""
  );
}

// Util: deep clone
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Drill rendering helpers
const CRITICAL_KEYWORDS = ["engine", "parking", "service", "3", "60", "20", "45"];

const Walkthrough = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({});
  const [progress, setProgress] = useState({});
  const [walkthroughData, setWalkthroughData] = useState(null);
  const [currentDrill, setCurrentDrill] = useState("fill");
  const [completedDrills, setCompletedDrills] = useState({
    fill: false, order: false, type: false, visual: false,
  });
  const [school, setSchool] = useState("");
  const navigate = useNavigate();
  const drillsContainerRef = useRef(null);
  const confettiRef = useRef(null);

  // Load all user/session/walkthrough info on mount
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const email = getCurrentUserEmail();
      if (!email) {
        setUserData(null);
        setLoading(false);
        return;
      }
      try {
        // Fetch user
        const userSnap = await getDocs(
          query(collection(db, "users"), where("email", "==", email))
        );
        const ud = userSnap.empty ? {} : userSnap.docs[0].data();
        setUserData(ud);

        // Progress
        let prog = {};
        try {
          prog = (await getUserProgress(email)) || {};
        } catch { prog = {}; }
        setProgress(prog);

        // Walkthrough script for this CDL class
        const cdlClass = ud?.cdlClass?.trim().toUpperCase() || "";
        setSchool(ud?.schoolName || ud?.schoolId || "N/A");
        const walkthrough = getWalkthroughByClass(cdlClass);
        setWalkthroughData(walkthrough);

        // Completed drills
        setCompletedDrills({
          fill: !!prog.drills?.fill,
          order: !!prog.drills?.order,
          type: !!prog.drills?.type,
          visual: !!prog.drills?.visual,
        });
      } catch {
        setUserData(null);
      }
      setLoading(false);
    }
    fetchAll();
    // Only on mount
    // eslint-disable-next-line
  }, []);

  // --- Confetti: simple canvas effect ---
  function showConfetti() {
    const canvas = confettiRef.current;
    if (!canvas) return;
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    for (let i = 0; i < 80; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 7 + 3,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = `hsl(${Math.random() * 360},95%,70%)`;
      ctx.fill();
    }
    setTimeout(() => (canvas.style.display = "none"), 1800);
  }

  // --- Mark drill complete and update backend/visual ---
  async function markDrillComplete(type) {
    if (completedDrills[type]) return;
    const email = getCurrentUserEmail();
    setCompletedDrills((prev) => ({ ...prev, [type]: true }));
    try {
      await updateELDTProgress(email, {
        [`drills.${type}`]: true,
        [`drills.${type}CompletedAt`]: new Date().toISOString(),
      });
      if (Object.values({ ...completedDrills, [type]: true }).every(Boolean)) {
        showConfetti();
        showToast("🎉 All drills complete! Walkthrough milestone saved.");
        await markStudentWalkthroughComplete(email);
      }
    } catch {
      showToast("❌ Error saving progress. Try again.", 3200, "error");
    }
  }

  // --- Drill types: data prep ---
  const criticalSection = walkthroughData?.find((s) => s.critical || s.passFail) || walkthroughData?.[0] || {};
  const brakeCheckLines = (criticalSection?.steps || []).map((step) => step.script || "").filter(Boolean);

  // --- Drill UIs ---
  function renderDrill() {
    if (!walkthroughData) return null;
    // Fill-in-the-Blank Drill
    if (currentDrill === "fill") {
      return (
        <div>
          <h3>Fill in the Blanks</h3>
          {brakeCheckLines.map((line, idx) => (
            <FillBlankDrill
              key={idx}
              line={line}
              keywords={CRITICAL_KEYWORDS}
              onComplete={() => markDrillComplete("fill")}
              alreadyComplete={completedDrills.fill}
            />
          ))}
        </div>
      );
    }
    // Ordered Steps Drill
    if (currentDrill === "order") {
      return (
        <OrderStepsDrill
          steps={brakeCheckLines}
          onComplete={() => markDrillComplete("order")}
          alreadyComplete={completedDrills.order}
        />
      );
    }
    // Typing Challenge Drill
    if (currentDrill === "type") {
      return (
        <TypePhraseDrill
          phrase={brakeCheckLines[0] || ""}
          onComplete={() => markDrillComplete("type")}
          alreadyComplete={completedDrills.type}
        />
      );
    }
    // Visual Recall Drill
    if (currentDrill === "visual") {
      return (
        <VisualRecallDrill
          question="At what PSI should the low air warning activate?"
          answer="before 60"
          imgSrc="/brake-gauge.png"
          onComplete={() => markDrillComplete("visual")}
          alreadyComplete={completedDrills.visual}
        />
      );
    }
    return null;
  }

  // --- Main UI ---
  if (loading) {
    return (
      <div className="screen-wrapper walkthrough-page fade-in">
        <h2>🧭 CDL Walkthrough Practice</h2>
        <p>Loading…</p>
      </div>
    );
  }
  if (!userData) {
    return (
      <div className="screen-wrapper walkthrough-page fade-in">
        <h2>🧭 CDL Walkthrough Practice</h2>
        <p>Error loading user profile. Please log in again.</p>
        <button className="btn" onClick={() => navigate("/student-profile")}>
          Go to Profile
        </button>
      </div>
    );
  }
  const cdlClass = userData.cdlClass || null;
  // 1. No CDL class selected
  if (!cdlClass) {
    return (
      <div className="screen-wrapper walkthrough-page fade-in">
        <h2>🧭 CDL Walkthrough Practice {school !== "N/A" && <span className="school-badge">{school}</span>}</h2>
        <div className="alert-box" role="alert">
          ⚠ You haven’t selected your CDL class yet.<br />
          Please go to your <strong>Profile</strong> and select one so we can load the correct walkthrough script.
        </div>
        <button className="btn" onClick={() => navigate("/student-profile")}>
          Go to Profile
        </button>
      </div>
    );
  }
  // 2. No walkthrough data for this class
  if (!walkthroughData) {
    return (
      <div className="screen-wrapper walkthrough-page fade-in">
        <h2>🧭 CDL Walkthrough Practice</h2>
        <div className="alert-box" role="alert">
          ⚠ Sorry, we do not have a walkthrough script for your selected class: <b>{getWalkthroughLabel(cdlClass)}</b>.<br />
          Please contact support or your instructor.
        </div>
        <button className="btn outline" onClick={() => navigate("/student-dashboard")}>
          ⬅ Dashboard
        </button>
      </div>
    );
  }
  // 3. Main walkthrough/drill view
  const numCompleted = Object.values(completedDrills).filter(Boolean).length;
  return (
    <div className="screen-wrapper walkthrough-page fade-in" tabIndex={0}>
      <h2>
        🧭 CDL Walkthrough Practice{" "}
        {school !== "N/A" && <span className="school-badge">{school}</span>}
      </h2>
      <p>
        <strong>CDL Class:</strong> {getWalkthroughLabel(cdlClass)}
      </p>
      <p>
        Study the walkthrough below to prepare for your in-person vehicle inspection test.{" "}
        <span style={{ color: "var(--accent)", fontWeight: "bold" }}>
          Critical/pass-fail sections are highlighted.
        </span>
      </p>
      <div className="walkthrough-script" aria-label="Walkthrough script">
        {walkthroughData.map((section, idx) => (
          <React.Fragment key={idx}>
            <h3>
              {section.critical || section.passFail ? "🚨" : "✅"} {section.section}
              {section.critical || section.passFail ? (
                <span style={{ color: "var(--accent)" }}> (Pass/Fail)</span>
              ) : null}
            </h3>
            <div className={section.critical || section.passFail ? "highlight-section" : ""}>
              {section.steps.map((step, i) => (
                <p key={i}>
                  {step.label && <strong>{step.label}:</strong>} {step.script}
                  {step.mustSay && (
                    <span className="must-say" style={{ color: "var(--accent)", fontWeight: "bold" }}>
                      {" "}
                      (Must Say)
                    </span>
                  )}
                  {step.passFail && (
                    <span className="pass-fail" style={{ color: "#ee3377", fontWeight: "bold" }}>
                      {" "}
                      (Pass/Fail)
                    </span>
                  )}
                </p>
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div style={{ margin: "2rem 0 1.3rem 0" }}>
        <progress
          value={numCompleted}
          max={4}
          style={{ width: "100%" }}
          aria-valuemax={4}
          aria-valuenow={numCompleted}
          aria-label="Walkthrough drill progress"
        ></progress>
        <span>
          {numCompleted}/4 drills completed
        </span>
      </div>
      <nav
        className="drills-nav"
        style={{ display: "flex", gap: "0.7rem", marginBottom: "1.2rem" }}
        aria-label="Drill navigation"
      >
        {["fill", "order", "type", "visual"].map((type) => (
          <button
            key={type}
            data-drill={type}
            className={`btn small${completedDrills[type] ? " drill-done" : ""}`}
            aria-pressed={currentDrill === type}
            onClick={() => setCurrentDrill(type)}
            disabled={completedDrills[type]}
          >
            {type === "fill" && "Fill-in-the-Blank"}
            {type === "order" && "Ordered Steps"}
            {type === "type" && "Typing Challenge"}
            {type === "visual" && "Visual Recall"}
            {completedDrills[type] ? " ✅" : ""}
          </button>
        ))}
      </nav>
      <div ref={drillsContainerRef}>{renderDrill()}</div>
      <canvas
        ref={confettiRef}
        style={{
          display: "none",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 100,
        }}
      />
      <button
        className="btn outline"
        style={{ marginTop: "2rem" }}
        onClick={() => navigate("/student-dashboard")}
      >
        ⬅ Dashboard
      </button>
    </div>
  );
};

// --- Individual Drill Components ---

function FillBlankDrill({ line, keywords, onComplete, alreadyComplete }) {
  const [inputs, setInputs] = useState({});
  const [result, setResult] = useState(null);

  // Build blanked version
  let blanks = [];
  let parts = [];
  let idx = 0;
  let reg = new RegExp(`\\b(${keywords.join("|")})\\b`, "gi");
  let lastIdx = 0;
  let match;
  while ((match = reg.exec(line))) {
    parts.push(line.slice(lastIdx, match.index));
    blanks.push(match[1]);
    parts.push(`___${blanks.length - 1}___`);
    lastIdx = reg.lastIndex;
  }
  parts.push(line.slice(lastIdx));

  function handleInput(i, val) {
    setInputs((prev) => ({ ...prev, [i]: val }));
  }

  function check(e) {
    e.preventDefault();
    let correct = blanks.every((b, i) => (inputs[i] || "").trim().toLowerCase() === b.toLowerCase());
    setResult(correct ? "✅ Correct!" : "❌ Try again!");
    if (correct && onComplete && !alreadyComplete) onComplete();
  }

  if (!blanks.length) return <div>{line}</div>;

  return (
    <form className="drill-blank" style={{ marginBottom: "1.2rem" }} onSubmit={check}>
      <div>
        {parts.map((part, i) =>
          part.startsWith("___") && part.endsWith("___") ? (
            <input
              key={i}
              type="text"
              size={5}
              className="blank-input"
              required
              aria-label="Blank"
              value={inputs[parseInt(part.replace(/___/g, ""), 10)] || ""}
              disabled={alreadyComplete}
              onChange={(e) => handleInput(parseInt(part.replace(/___/g, ""), 10), e.target.value)}
              style={{ margin: "0 3px" }}
            />
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </div>
      <button className="btn" type="submit" style={{ marginTop: "0.6rem" }} disabled={alreadyComplete}>
        Check
      </button>
      <div className="drill-result" style={{ marginTop: "0.3rem" }} aria-live="polite">
        {result}
      </div>
    </form>
  );
}

function OrderStepsDrill({ steps, onComplete, alreadyComplete }) {
  const [order, setOrder] = useState(() => shuffleArray(steps));
  const [result, setResult] = useState(null);

  function move(idx, dir) {
    if (alreadyComplete) return;
    let next = [...order];
    let j = idx + dir;
    if (j < 0 || j >= order.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next);
  }

  function checkOrder() {
    let correct = steps.every((step, i) => order[i] === step);
    setResult(correct ? "✅ Correct order!" : "❌ Try again! Drag the steps into the correct order.");
    if (correct && onComplete && !alreadyComplete) onComplete();
  }

  function dragStart(e, idx) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", idx);
  }
  function drop(e, idx) {
    let from = parseInt(e.dataTransfer.getData("text/plain"), 10);
    let next = [...order];
    let [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    setOrder(next);
    e.preventDefault();
  }

  return (
    <div>
      <h3>Put the Steps in Order</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {order.map((step, idx) => (
          <li
            key={idx}
            draggable={!alreadyComplete}
            onDragStart={(e) => dragStart(e, idx)}
            onDrop={(e) => drop(e, idx)}
            onDragOver={(e) => e.preventDefault()}
            className="order-step"
            style={{
              background: "#222",
              padding: "7px 11px",
              borderRadius: "8px",
              margin: "7px 0",
              cursor: alreadyComplete ? "default" : "grab",
              opacity: alreadyComplete ? 0.7 : 1,
            }}
            tabIndex={0}
            aria-label={`Step ${idx + 1}`}
          >
            <span>{step}</span>
            {!alreadyComplete && (
              <span style={{ marginLeft: 12 }}>
                <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0}>
                  ↑
                </button>
                <button type="button" onClick={() => move(idx, 1)} disabled={idx === order.length - 1}>
                  ↓
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <button className="btn" onClick={checkOrder} disabled={alreadyComplete}>
        Check Order
      </button>
      <div className="drill-result" style={{ marginTop: "0.3rem" }} aria-live="polite">
        {result}
      </div>
    </div>
  );
}

function TypePhraseDrill({ phrase, onComplete, alreadyComplete }) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState(null);

  function check(e) {
    e.preventDefault();
    const val = value.trim().replace(/\s+/g, " ").toLowerCase();
    const ans = phrase.trim().replace(/\s+/g, " ").toLowerCase();
    let ok = val === ans;
    setResult(ok ? "✅ Perfect! You memorized it." : "❌ Not quite right. Try again!");
    if (ok && onComplete && !alreadyComplete) onComplete();
  }
  return (
    <form onSubmit={check}>
      <h3>Type the Pass/Fail Phrase Word-for-Word</h3>
      <textarea
        rows={4}
        style={{ width: "100%" }}
        placeholder="Type the full phrase here"
        aria-label="Type phrase"
        value={value}
        disabled={alreadyComplete}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="btn" type="submit" style={{ marginTop: "0.5rem" }} disabled={alreadyComplete}>
        Check
      </button>
      <div className="drill-result" style={{ marginTop: "0.3rem" }} aria-live="polite">
        {result}
      </div>
      <div style={{ fontSize: "0.95em", marginTop: "0.6rem", opacity: 0.6 }}>Hint: {phrase}</div>
    </form>
  );
}

function VisualRecallDrill({ question, answer, imgSrc, onComplete, alreadyComplete }) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState(null);

  function check() {
    let ok = value.trim().toLowerCase().includes(answer.toLowerCase());
    setResult(ok ? "✅ Correct!" : "❌ Try again!");
    if (ok && onComplete && !alreadyComplete) onComplete();
  }
  return (
    <div>
      <h3>Visual Recall</h3>
      <div style={{ marginBottom: "1rem" }}>
        <img src={imgSrc} alt="Brake Gauge" style={{ maxWidth: "160px", display: "block", marginBottom: "0.7rem" }} />
        <div>{question}</div>
        <input
          type="text"
          className="visual-answer"
          placeholder="Your answer"
          aria-label="Visual answer"
          value={value}
          disabled={alreadyComplete}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn" style={{ marginLeft: "9px" }} onClick={check} disabled={alreadyComplete}>
          Check
        </button>
        <div className="drill-result" style={{ marginTop: "0.3rem" }} aria-live="polite">
          {result}
        </div>
      </div>
    </div>
  );
}

// Util: simple shuffle
function shuffleArray(arr) {
  let out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default Walkthrough;
