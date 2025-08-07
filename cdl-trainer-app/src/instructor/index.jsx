// src/instructor/index.jsx

// ===============================
// Instructor Barrel Exports (React SPA)
// ===============================

// --- Page/View Components ---
export { default as InstructorDashboard } from "../pages/InstructorDashboard";
export { default as InstructorProfile } from "../pages/InstructorProfile";
export { default as InstructorStudentProfile } from "../pages/InstructorStudentProfile";
export { default as InstructorChecklistReview } from "../pages/InstructorChecklistReview";
export { default as InstructorChecklists } from "../pages/InstructorChecklists";
// Add more as needed, e.g. InstructorFlashcards, InstructorWalkthrough, etc.

// --- Modal/Widget Components ---
export { default as ChecklistReviewModal } from "../components/ChecklistReviewModal";
// Add more as needed

// --- Instructor-specific hooks and helpers ---
export * from "../hooks/useInstructorData";
export * from "../utils/instructor-helpers";
export { useInstructorNav } from "../hooks/useInstructorNav";

// --- (Optional) Context providers, navigation helpers, etc. ---
// export { InstructorProvider } from "../context/InstructorContext";
// export { useInstructorStore } from "../store/instructorStore";

// === (Expand with new pages/utilities as needed) ===
