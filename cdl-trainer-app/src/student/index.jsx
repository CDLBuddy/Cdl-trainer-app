// ===== STUDENT BARREL (pure) =====
// Re-export student pages & role-scoped utilities.
// No JSX, no lazy, no route objects—keep this a clean barrel.

export { default as StudentDashboard }  from "./StudentDashboard.jsx";
export { default as Profile }           from "./Profile.jsx";
export { default as Checklists }        from "./Checklists.jsx";
export { default as PracticeTests }     from "./PracticeTests.jsx";
export { default as TestEngineWrapper } from "./TestEngineWrapper.jsx";
export { default as TestReviewWrapper } from "./TestReviewWrapper.jsx";
export { default as TestResults }       from "./TestResults.jsx";
export { default as Walkthrough }       from "./Walkthrough.jsx";
export { default as Flashcards }        from "./Flashcards.jsx";

// Optional: student-scoped components/hooks/helpers (uncomment if present)
// export * from "./components";          // e.g., ./components/StudyTip.jsx
// export * from "../hooks/useStudentData.js";
// export * from "../utils/student-helpers.js";