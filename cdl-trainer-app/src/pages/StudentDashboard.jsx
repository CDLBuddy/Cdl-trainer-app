import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../utils/firebase"; // Update to your path
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
} from "../utils/ui-helpers"; // Update as needed

function getCurrentUserEmail() {
  return (
    window.currentUserEmail ||
    localStorage.getItem("currentUserEmail") ||
    (auth.currentUser && auth.currentUser.email) ||
    null
  );
}

const StudentDashboard = () => {
  const navigate = useNavigate();

  // ----- STATE -----
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({});
  const [checklistPct, setChecklistPct] = useState(0);
  const [lastTestStr, setLastTestStr] = useState("No tests taken yet.");
  const [streak, setStreak] = useState(0);
  const [aiTip, setAiTip] = useState("");
  const [error, setError] = useState("");

  // ----- DATA FETCH -----
  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      try {
        const email = getCurrentUserEmail();
        if (!email) {
          navigate("/login");
          return;
        }

        // --- Fetch user profile ---
        const usersRef = collection(db, "users");
        const userSnap = await getDocs(query(usersRef, where("email", "==", email)));
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

        // --- Fetch last test score ---
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
        } else {
          setLastTestStr("No tests taken yet.");
        }

        // --- Study streak ---
        try {
          const today = new Date().toDateString();
          let log = JSON.parse(localStorage.getItem("studyLog") || "[]");
          if (!log.includes(today)) {
            log.push(today);
            localStorage.setItem("studyLog", JSON.stringify(log));
          }
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 6);
          setStreak(log.filter((d) => new Date(d) >= cutoff).length);
        } catch {
          setStreak(0);
        }

        setAiTip(getRandomAITip());

        // --- Show latest update ---
        setTimeout(showLatestUpdate, 300);

        setLoading(false);
      } catch (err) {
        setError("Failed to load dashboard. Please try again.");
        setLoading(false);
      }
    }

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line
  }, []);

  // ----- RENDER -----
  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error" style={{ textAlign: "center", marginTop: 40 }}>
        <p style={{ color: "#e35656" }}>{error}</p>
        <button className="btn" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      {/* Latest Updates Area */}
      <div id="latest-update-card" className="dashboard-card update-area"></div>

      {/* Checklist Progress */}
      <div className="dashboard-card">
        <h3>✅ Checklist Progress</h3>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${checklistPct}%` }}></div>
        </div>
        <div className="progress-percent">
          <strong id="checklist-pct">{checklistPct}</strong>% complete
        </div>
        <div className="checklist-alert warning">
          <span>{getNextChecklistAlert(userData)}</span>
        </div>
      </div>

      {/* Walkthrough Card */}
      <div className="dashboard-card">
        <h3>🧭 Walkthrough</h3>
        <p>Practice the CDL inspection walkthrough and memorize critical phrases.</p>
        <button className="btn" onClick={() => navigate("/student-walkthrough")}>
          Open Walkthrough
        </button>
      </div>

      {/* Study Streak Card */}
      <div className="glass-card metric">
        <h3>🔥 Study Streak</h3>
        <p>
          <span className="big-num" id="streak-days">{streak}</span>
          {" "}day{streak !== 1 ? "s" : ""} active this week
        </p>
      </div>

      {/* AI Tip Card */}
      <div className="dashboard-card ai-tip-card">
        <div
          className="ai-tip-title"
          style={{ fontWeight: 600, fontSize: "1.12em", color: "var(--accent)", marginBottom: "0.5em" }}
        >
          🤖 AI Tip of the Day
        </div>
        <div className="ai-tip-content" style={{ marginBottom: "0.8em", fontSize: "1.03em" }}>
          {aiTip}
        </div>
        <button className="btn ai-tip" onClick={() => navigate("/student-coach")} aria-label="Open AI Coach">
          <span style={{ fontSize: "1.1em" }}>💬</span> Ask AI Coach
        </button>
      </div>

      {/* Last Test Score */}
      <div className="dashboard-card last-test-card">
        <h3>🧪 Last Test Score</h3>
        <p>{lastTestStr}</p>
        <button className="btn" onClick={() => navigate("/student-practice-tests")}>
          Take a Test
        </button>
      </div>
    </div>
  );
};

export default StudentDashboard;
