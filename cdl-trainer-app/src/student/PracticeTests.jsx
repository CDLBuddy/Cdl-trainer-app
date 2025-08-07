import React, { useEffect, useState } from "react";
import { db, auth } from "../utils/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { showToast } from "../utils/ui-helpers";

// These should eventually be pulled from Firestore, but for now:
const TESTS = ["General Knowledge", "Air Brakes", "Combination Vehicles"];

function getCurrentUserEmail() {
  return (
    (auth.currentUser && auth.currentUser.email) ||
    window.currentUserEmail ||
    localStorage.getItem("currentUserEmail") ||
    null
  );
}

const PracticeTests = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("student");
  const [testScores, setTestScores] = useState({});
  const [passedCount, setPassedCount] = useState(0);

  useEffect(() => {
    async function fetchTestData() {
      const currentUserEmail = getCurrentUserEmail();
      if (!currentUserEmail) {
        showToast("You must be logged in to view this page.", 2300, "error");
        navigate("/login");
        return;
      }

      let userRole = localStorage.getItem("userRole") || "student";
      let userData = {};
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", currentUserEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          userData = snap.docs[0].data();
          userRole = userData.role || userRole;
        }
      } catch (e) {}
      setUserRole(userRole);
      if (userRole !== "student") {
        showToast("This page is only available for students.", 2300, "error");
        navigate("/");
        return;
      }

      // Load test results
      const scores = {};
      try {
        const snap = await getDocs(
          query(
            collection(db, "testResults"),
            where("studentId", "==", currentUserEmail)
          )
        );
        TESTS.forEach((test) => {
          const testDocs = snap.docs
            .map((doc) => doc.data())
            .filter((d) => d.testName === test);
          if (testDocs.length > 0) {
            const latest = testDocs.sort(
              (a, b) =>
                (b.timestamp?.toDate?.() || new Date(b.timestamp)) -
                (a.timestamp?.toDate?.() || new Date(a.timestamp))
            )[0];
            const pct = Math.round((latest.correct / latest.total) * 100);
            scores[test] = {
              pct,
              passed: pct >= 80,
              lastResult: latest,
            };
          }
        });
      } catch (e) {
        console.error("❌ Error loading test results:", e);
      }
      setTestScores(scores);
      setPassedCount(Object.values(scores).filter((s) => s.passed).length);
      setLoading(false);
    }
    fetchTestData();
    // eslint-disable-next-line
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading practice tests…</p>
      </div>
    );
  }

  // Replace with your custom test engine/review renderers:
  function startTest(test) {
    showToast(`Starting "${test}" test…`);
    navigate(`/student-test-engine/${encodeURIComponent(test)}`);
  }

  function reviewTest(test) {
    showToast(`Loading your last "${test}" result…`);
    navigate(`/student-test-review/${encodeURIComponent(test)}`);
  }

  const pctComplete = Math.round((100 * passedCount) / TESTS.length);

  return (
    <div className="screen-wrapper fade-in" style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <h2 className="dash-head" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        🧪 Student Practice Tests
        <span style={{ marginLeft: "auto", fontSize: "1em" }}>
          <span className="progress-label" title="Tests Passed">
            {passedCount}/{TESTS.length} Passed
          </span>
        </span>
      </h2>
      <div className="progress-track" style={{ marginBottom: "1.3rem" }}>
        <div className="progress-fill" style={{ width: `${pctComplete}%` }} />
      </div>
      <p style={{ marginBottom: "1.4rem" }}>
        Select a practice test to begin or review:
      </p>
      <div className="test-list">
        {TESTS.map((name) => {
          const data = testScores[name];
          const mainBtn = data ? (
            <button className="btn wide retake-btn" onClick={() => startTest(name)}>
              🔁 Retake
            </button>
          ) : (
            <button className="btn wide start-btn" onClick={() => startTest(name)}>
              🚦 Start
            </button>
          );
          const reviewBtn = data ? (
            <button className="btn wide outline review-btn" onClick={() => reviewTest(name)}>
              🧾 Review
            </button>
          ) : null;
          const scoreBadge = data ? (
            data.passed ? (
              <span className="badge badge-success">✅ {data.pct}%</span>
            ) : (
              <span className="badge badge-fail">❌ {data.pct}%</span>
            )
          ) : (
            <span className="badge badge-neutral">⏳ Not attempted</span>
          );
          return (
            <div className="glass-card" key={name} style={{ marginBottom: "1.2rem", padding: 18 }}>
              <h3 style={{ marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: 10 }}>
                {name} {scoreBadge}
              </h3>
              <div className="btn-grid">
                {mainBtn}
                {reviewBtn}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <button
          className="btn outline wide"
          aria-label="Back to Dashboard"
          onClick={() => navigate("/student-dashboard")}
        >
          ⬅ Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default PracticeTests;
