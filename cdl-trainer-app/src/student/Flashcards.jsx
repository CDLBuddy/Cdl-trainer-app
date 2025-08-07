import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "../utils/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  incrementStudentStudyMinutes,
  logStudySession,
  showToast,
} from "../utils/ui-helpers";

const defaultFlashcards = [
  {
    q: "What is the minimum tread depth for front tires?",
    a: "4/32 of an inch.",
  },
  { q: "What do you check for on rims?", a: "Bent, damaged, or rust trails." },
  {
    q: "When must you use 3 points of contact?",
    a: "When entering and exiting the vehicle.",
  },
  {
    q: "What triggers the spring brake pop-out?",
    a: "Low air pressure (between 20-45 PSI).",
  },
];

function StudentFlashcards() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("student");
  const [flashcards, setFlashcards] = useState([...defaultFlashcards]);
  const [current, setCurrent] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [knownCards, setKnownCards] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [email, setEmail] = useState("");
  const [flipped, setFlipped] = useState(false);
  const flashcardRef = useRef(null);

  // Util for shuffle
  function shuffleArray(arr) {
    return arr
      .map((card) => ({ ...card, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((c) => ({ q: c.q, a: c.a }));
  }

  useEffect(() => {
    // Robust get current user email
    const userEmail =
      (auth.currentUser && auth.currentUser.email) ||
      window.currentUserEmail ||
      localStorage.getItem("currentUserEmail");
    if (!userEmail) {
      showToast("You must be logged in to view this page.", 2300, "error");
      navigate("/login");
      return;
    }
    setEmail(userEmail);

    let userRole = localStorage.getItem("userRole") || "student";
    (async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", userEmail));
        const snap = await getDocs(q);
        if (!snap.empty) userRole = snap.docs[0].data().role || userRole;
      } catch {}
      setUserRole(userRole);
      if (userRole !== "student") {
        showToast("Flashcards are only available for students.", 2200, "error");
        navigate("/student-dashboard");
        return;
      }

      // Restore settings
      setShuffle(localStorage.getItem("fcShuffle") === "1");
      setKnownCards(
        JSON.parse(localStorage.getItem("fcKnown_" + userEmail) || "[]")
      );
      const savedIdx = parseInt(
        localStorage.getItem("fcCurrent_" + userEmail) || "0",
        10
      );
      let cards = [...defaultFlashcards];
      if (localStorage.getItem("fcShuffle") === "1") cards = shuffleArray(cards);
      setFlashcards(cards);
      setCurrent(
        !isNaN(savedIdx) && savedIdx >= 0 && savedIdx < cards.length
          ? savedIdx
          : 0
      );
      setStartedAt(Date.now());
      setCompleted(false);
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, []);

  // --- Handlers ---
  const handleFlip = () => setFlipped((f) => !f);
  const handleNext = () => {
    if (current < flashcards.length - 1) {
      setCurrent(current + 1);
      setFlipped(false);
    }
  };
  const handlePrev = () => {
    if (current > 0) {
      setCurrent(current - 1);
      setFlipped(false);
    }
  };

  const handleKnown = () => {
    if (!knownCards.includes(current)) {
      const updated = [...knownCards, current];
      setKnownCards(updated);
      localStorage.setItem("fcKnown_" + email, JSON.stringify(updated));
      showToast("Marked as known!");
    }
  };

  const handleShuffleToggle = (e) => {
    const checked = e.target.checked;
    setShuffle(checked);
    localStorage.setItem("fcShuffle", checked ? "1" : "0");
    const newDeck = checked
      ? shuffleArray(defaultFlashcards)
      : [...defaultFlashcards];
    setFlashcards(newDeck);
    setCurrent(0);
    setFlipped(false);
  };

  const handleEndSession = () => setCompleted(true);

  // Save progress in localStorage
  useEffect(() => {
    if (email) {
      localStorage.setItem("fcCurrent_" + email, current);
    }
  }, [current, email]);

  // Keyboard navigation on card
  useEffect(() => {
    const card = flashcardRef.current;
    if (!card) return;
    const onKey = (e) => {
      if (e.key === "Enter") handleFlip();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    card.addEventListener("keydown", onKey);
    return () => card.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [current, flashcardRef.current]);

  // Touch navigation
  useEffect(() => {
    const card = flashcardRef.current;
    if (!card) return;
    let touchStartX = null;
    const onTouchStart = (e) => {
      touchStartX = e.changedTouches[0].clientX;
    };
    const onTouchEnd = (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        if (dx > 0 && current > 0) handlePrev();
        else if (dx < 0 && current < flashcards.length - 1) handleNext();
      } else {
        handleFlip();
      }
      touchStartX = null;
    };
    card.addEventListener("touchstart", onTouchStart);
    card.addEventListener("touchend", onTouchEnd);
    return () => {
      card.removeEventListener("touchstart", onTouchStart);
      card.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line
  }, [current, flashcardRef.current]);

  // --- End session logic and logging ---
  useEffect(() => {
    if (!completed) return;
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    (async () => {
      await incrementStudentStudyMinutes(email, minutes);
      await logStudySession(email, minutes, "Flashcards");
      showToast("✅ Flashcard session logged!");
    })();
    // eslint-disable-next-line
  }, [completed]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading flashcards…</p>
      </div>
    );
  }

  if (completed) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    return (
      <div className="screen-wrapper fade-in" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h2>🎉 Flashcard Session Complete!</h2>
        <p>You reviewed <b>{flashcards.length}</b> cards.</p>
        <p><b>{minutes}</b> study minute{minutes === 1 ? "" : "s"} logged!</p>
        <button
          className="btn primary"
          style={{ marginTop: 18 }}
          onClick={() => {
            setKnownCards([]);
            localStorage.setItem("fcKnown_" + email, JSON.stringify([]));
            setCurrent(0);
            setStartedAt(Date.now());
            setCompleted(false);
          }}
        >
          🔄 Restart
        </button>
        <button
          className="btn outline"
          style={{ marginTop: 18 }}
          onClick={() => {
            const missed = defaultFlashcards.filter(
              (c, i) => !knownCards.includes(i)
            );
            setFlashcards(missed);
            setKnownCards([]);
            setCurrent(0);
            setCompleted(false);
            setStartedAt(Date.now());
          }}
        >
          Review Missed
        </button>
        <button
          className="btn outline"
          style={{ margin: "26px 0 0 0" }}
          onClick={() => navigate("/student-dashboard")}
        >
          ⬅ Back to Dashboard
        </button>
      </div>
    );
  }

  const knownPct = Math.round(
    (knownCards.length / flashcards.length) * 100
  );

  return (
    <div className="screen-wrapper fade-in" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>🃏 Student Flashcards</h2>
      <div style={{ marginBottom: "1rem" }}>
        <progress
          value={current + 1}
          max={flashcards.length}
          style={{ width: "100%" }}
        />
        <div style={{ textAlign: "center" }}>
          Card {current + 1} of {flashcards.length}
        </div>
        <div style={{ textAlign: "center", fontSize: "0.96em", opacity: 0.7 }}>
          <label>
            <input
              type="checkbox"
              checked={shuffle}
              onChange={handleShuffleToggle}
              style={{ marginRight: 4 }}
            />
            Shuffle cards
          </label>
          <span style={{ marginLeft: 18 }}>
            Known: {knownCards.length}/{flashcards.length} ({knownPct}%)
          </span>
        </div>
      </div>
      <div
        className={`flashcard-card${flipped ? " flipped" : ""}`}
        id="flashcard"
        tabIndex={0}
        aria-label="Flashcard: Press Enter or tap to flip"
        role="button"
        ref={flashcardRef}
        style={{
          outline: "none",
          cursor: "pointer",
          marginBottom: 12,
        }}
        onClick={handleFlip}
      >
        <div className="flashcard-card-inner">
          <div className="flashcard-front">Q: {flashcards[current].q}</div>
          <div className="flashcard-back">A: {flashcards[current].a}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: 10 }}>
        <button
          className="btn outline"
          onClick={handlePrev}
          disabled={current === 0}
          aria-label="Previous card"
        >
          &#8592; Prev
        </button>
        <button className="btn" onClick={handleFlip} aria-label="Flip card">
          🔄 Flip
        </button>
        <button
          className="btn outline"
          onClick={handleNext}
          disabled={current === flashcards.length - 1}
          aria-label="Next card"
        >
          Next &#8594;
        </button>
      </div>
      <div style={{ textAlign: "center", margin: "13px 0" }}>
        <button
          className="btn small"
          style={{ margin: "0 9px 0 0" }}
          onClick={handleKnown}
          aria-label="Mark as known"
        >
          ✅ I know this
        </button>
      </div>
      <button className="btn wide outline" style={{ margin: "24px 0 0 0" }} onClick={handleEndSession}>
        ✅ End Session
      </button>
      <button
        className="btn wide outline"
        style={{ margin: "9px 0 0 0" }}
        onClick={() => navigate("/student-dashboard")}
      >
        ⬅ Back to Dashboard
      </button>
    </div>
  );
}

export default StudentFlashcards;
