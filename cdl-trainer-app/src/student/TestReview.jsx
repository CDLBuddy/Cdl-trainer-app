import React, { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  incrementStudentStudyMinutes,
  logStudySession,
  markStudentTestPassed,
  getUserProgress,
  showToast,
} from "../utils/ui-helpers";
import { useNavigate, useParams } from "react-router-dom";

// DRY: get email from everywhere
function getCurrentUserEmail() {
  return (
    window.currentUserEmail ||
    localStorage.getItem("currentUserEmail") ||
    (window.auth?.currentUser && window.auth.currentUser.email) ||
    null
  );
}

const TestReview = () => {
  const { testName } = useParams(); // expects your route to be /student-test-review/:testName
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      const currentUserEmail = getCurrentUserEmail();
      if (!currentUserEmail) {
        setError("You must be logged in to view this page.");
        setLoading(false);
        return;
      }
      try {
        const snap = await getDocs(
          query(
            collection(db, "testResults"),
            where("studentId", "==", currentUserEmail)
          )
        );
        const results = snap.docs
          .map((doc) => doc.data())
          .filter((d) => d.testName === testName)
          .sort(
            (a, b) =>
              (b.timestamp?.toDate?.() || new Date(b.timestamp)) -
              (a.timestamp?.toDate?.() || new Date(a.timestamp))
          );
        if (results.length === 0) {
          setError("No results found for this test.");
          setLoading(false);
          return;
        }
        const latest = results[0];
        const pct = Math.round((latest.correct / latest.total) * 100);

        // Milestone: Mark test as passed if pct >= 80
        if (pct >= 80) {
          try {
            const progress = await getUserProgress(currentUserEmail);
            if (!progress?.practiceTestPassed) {
              await markStudentTestPassed(currentUserEmail);
              showToast("🎉 Practice Test milestone complete! Progress updated.");
            }
          } catch (e) {
            // Not fatal if progress can't be checked/updated
            console.warn("Could not update practice test milestone:", e);
          }
        }

        // Always log study minutes and session
        const minutes = latest?.durationMinutes || 5;
        try {
          await incrementStudentStudyMinutes(currentUserEmail, minutes);
          await logStudySession(
            currentUserEmail,
            minutes,
            `Practice Test: ${testName}`
          );
        } catch (e) {
          // Logging isn't fatal
          console.warn("Could not log study session:", e);
        }

        setReview({
          correct: latest.correct,
          total: latest.total,
          pct,
        });
        setLoading(false);
      } catch (e) {
        setError("Failed to load review data.");
        setLoading(false);
      }
    }
    fetchData();
    // eslint-disable-next-line
  }, [testName]);

  if (loading) {
    return (
      <div className="screen-wrapper fade-in" style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
        <h2>🧾 {testName} Review</h2>
        <p>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen-wrapper fade-in" style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
        <h2>🧾 {testName} Review</h2>
        <p>{error}</p>
        <div style={{ marginTop: 20 }}>
          <button
            className="btn outline"
            onClick={() => navigate("/student-practice-tests")}
          >
            ⬅ Back to Practice Tests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-wrapper fade-in" style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <h2>🧾 {testName} Review</h2>
      <p>
        You scored <strong>{review.correct}/{review.total}</strong> ({review.pct}%)
      </p>
      <p>
        <em>Question-level review coming soon!</em>
      </p>
      <div style={{ marginTop: 20 }}>
        <button
          className="btn outline"
          onClick={() => navigate("/student-practice-tests")}
        >
          ⬅ Back to Practice Tests
        </button>
      </div>
    </div>
  );
};

export default TestReview;
