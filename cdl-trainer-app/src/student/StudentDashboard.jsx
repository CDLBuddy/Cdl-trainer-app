import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../utils/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  showLatestUpdate,
  getRandomAITip,
  getNextChecklistAlert,
} from "../utils/ui-helpers";

function getCurrentUserEmail() {
  return (
    window.currentUserEmail ||
    localStorage.getItem("currentUserEmail") ||
    (auth.currentUser && auth.currentUser.email) ||
    null
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userData, setUserData] = useState({});
  const [checklistPct, setChecklistPct] = useState(0);
  const [lastTestStr, setLastTestStr] = useState("No tests taken yet.");
  const [streak, setStreak] = useState(0);
  const [aiTip, setAiTip] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      try {
        const email = getCurrentUserEmail();
        if (!email) {
          navigate("/login");
          return;
        }

        // Fetch user profile
        const userSnap = await getDocs(
          query(collection(db, "users"), where("email", "==", email))
        );
        let profile = {};
        let userRole = "student";
        if (!userSnap.empty) {
          profile = userSnap.docs[0].data();
          userRole = profile.role || "student";
          localStorage.setItem("userRole", userRole);
        }
        if (userRole !== "student") {
          navigate("/login");
          return;
        }
        if (!isMounted) return;
        setUserData(profile);
        setChecklistPct(profile.profileProgress || 0);

        // Fetch last test score
        const testsSnap = await getDocs(
          query(collection(db, "testResults"), where("studentId", "==", email))
        );
        let latest = null;
        testsSnap.forEach((d) => {
          const t = d.data();
          const tTime = t.timestamp?.toDate?.() || new Date(t.timestamp) || new Date(0);
          const lTime = latest?.timestamp?.toDate?.() || new Date(latest?.timestamp) || new Date(0);
          if (!latest || tTime > lTime) latest = t;
        });
        if (latest) {
          const pct = Math.round((latest.correct / latest.total) * 100);
          const dateStr = latest.timestamp?.toDate
            ? latest.timestamp.toDate().toLocaleDateString()
            : new Date(latest.timestamp).toLocaleDateString();
          setLastTestStr(`${latest.testName} – ${pct}% on ${dateStr}`);
        }

        // Study streak
        const today = new Date().toDateString();
        let log = JSON.parse(localStorage.getItem("studyLog") || "[]");
        if (!log.includes(today)) {
          log.push(today);
          localStorage.setItem("studyLog", JSON.stringify(log));
        }
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 6);
        setStreak(log.filter((d) => new Date(d) >= cutoff).length);

        // AI tip
        setAiTip(getRandomAITip());

        // Latest update animation
        setTimeout(showLatestUpdate, 300);

        setLoading(false);
      } catch (err) {
        setError("Failed to load dashboard. Please try again.");
        setLoading(false);
      }
    }

    fetchDashboardData();
    return () => { isMounted = false; };
    // eslint-disable-next-line
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading Student Dashboard…</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dashboard-error">
        <p className="error-text">{error}</p>
        <button className="btn" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="student-page container">
      {/* Header */}
      <h2 className="dash-head">
        🎓 Student Dashboard{" "}
        <span className="role-badge student">Student</span>
      </h2>

      {/* Stats bar */}
      <div className="stats-bar">
        <span>✅ Checklist: <b>{checklistPct}%</b></span>
        <span>🔥 Streak: <b>{streak} days</b></span>
        <span>🧪 Last Test: <b>{lastTestStr}</b></span>
      </div>

      {/* Checklist Progress */}
      <div className="dashboard-card">
        <h3>Checklist Progress</h3>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${checklistPct}%` }}></div>
        </div>
        <div className="progress-percent">{checklistPct}% complete</div>
        <div className="checklist-alert warning">
          {getNextChecklistAlert(userData)}
        </div>
      </div>

      {/* AI Tip */}
      <div className="dashboard-card ai-tip">
        <strong>💡 AI Tip of the Day</strong>
        <p>{aiTip}</p>
        <button className="btn" onClick={() => navigate("/student-coach")}>
          💬 Ask AI Coach
        </button>
      </div>

      {/* Feature Grid */}
      <div className="dash-layout">
        <StudentCard
          title="📝 Practice Tests"
          desc="Take CDL practice exams and track your scores."
          btn="Start Tests"
          nav="/student-practice-tests"
        />
        <StudentCard
          title="🧭 Walkthrough"
          desc="Practice your CDL inspection and brake check script."
          btn="Open Walkthrough"
          nav="/student-walkthrough"
        />
        <StudentCard
          title="📋 Checklists"
          desc="Track your training progress and required steps."
          btn="View Checklist"
          nav="/student-checklists"
        />
        <StudentCard
          title="📚 Flashcards"
          desc="Review CDL terms and concepts."
          btn="Open Flashcards"
          nav="/student-flashcards"
        />
        <StudentCard
          title="📊 Test Results"
          desc="View past test attempts and scores."
          btn="View Results"
          nav="/student-results"
        />
      </div>
    </div>
  );
}

function StudentCard({ title, desc, btn, nav }) {
  const navigate = useNavigate();
  return (
    <div className="dashboard-card feature-card">
      <h3>{title}</h3>
      <p>{desc}</p>
      <button className="btn wide" onClick={() => navigate(nav)}>
        {btn}
      </button>
    </div>
  );
}