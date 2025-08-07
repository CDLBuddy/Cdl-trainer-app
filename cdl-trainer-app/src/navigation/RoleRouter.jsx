// src/navigation/RoleRouter.jsx

import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";

// Barrel imports for each role
import * as StudentPages from "../student";
import * as InstructorPages from "../instructor";
import * as AdminPages from "../admin";
import * as SuperadminPages from "../superadmin";

// Auth helpers (update paths as needed)
import { getUserRole, isLoggedIn } from "../utils/auth"; // you should have these, else use your previous logic

// Generic Not Found/Fallback
function NotFoundRedirect() {
  const role = getUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    switch (role) {
      case "superadmin":
        navigate("/superadmin-dashboard", { replace: true });
        break;
      case "admin":
        navigate("/admin-dashboard", { replace: true });
        break;
      case "instructor":
        navigate("/instructor-dashboard", { replace: true });
        break;
      case "student":
      default:
        navigate("/student-dashboard", { replace: true });
    }
  }, [role, navigate]);

  return null;
}

export default function RoleRouter() {
  const role = getUserRole();

  // You can use role context/provider if you want
  // Or get it here from localStorage/window/etc.

  return (
    <Routes>
      {/* --- STUDENT ROUTES --- */}
      <Route
        path="/student-dashboard"
        element={
          <RequireRole role="student">
            <StudentPages.StudentDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/student-profile"
        element={
          <RequireRole role="student">
            <StudentPages.Profile />
          </RequireRole>
        }
      />
      <Route
        path="/student-checklists"
        element={
          <RequireRole role="student">
            <StudentPages.Checklists />
          </RequireRole>
        }
      />
      <Route
        path="/student-practice-tests"
        element={
          <RequireRole role="student">
            <StudentPages.PracticeTests />
          </RequireRole>
        }
      />
      <Route
        path="/student-test-engine/:testName"
        element={
          <RequireRole role="student">
            <StudentPages.TestEngineWrapper />
          </RequireRole>
        }
      />
      <Route
        path="/student-test-review/:testName"
        element={
          <RequireRole role="student">
            <StudentPages.TestReviewWrapper />
          </RequireRole>
        }
      />
      <Route
        path="/student-test-results"
        element={
          <RequireRole role="student">
            <StudentPages.TestResults />
          </RequireRole>
        }
      />
      <Route
        path="/student-walkthrough"
        element={
          <RequireRole role="student">
            <StudentPages.Walkthrough />
          </RequireRole>
        }
      />
      <Route
        path="/student-flashcards"
        element={
          <RequireRole role="student">
            <StudentPages.Flashcards />
          </RequireRole>
        }
      />

      {/* --- INSTRUCTOR ROUTES --- */}
      <Route
        path="/instructor-dashboard"
        element={
          <RequireRole role="instructor">
            <InstructorPages.InstructorDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/instructor-profile"
        element={
          <RequireRole role="instructor">
            <InstructorPages.InstructorProfile />
          </RequireRole>
        }
      />
      <Route
        path="/instructor-student-profile"
        element={
          <RequireRole role="instructor">
            <InstructorPages.InstructorStudentProfile />
          </RequireRole>
        }
      />
      <Route
        path="/instructor-checklist-review"
        element={
          <RequireRole role="instructor">
            <InstructorPages.InstructorChecklistReview />
          </RequireRole>
        }
      />

      {/* --- ADMIN ROUTES --- */}
      <Route
        path="/admin-dashboard"
        element={
          <RequireRole role="admin">
            <AdminPages.AdminDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/admin-profile"
        element={
          <RequireRole role="admin">
            <AdminPages.AdminProfile />
          </RequireRole>
        }
      />
      <Route
        path="/admin-users"
        element={
          <RequireRole role="admin">
            <AdminPages.AdminUsers />
          </RequireRole>
        }
      />
      <Route
        path="/admin-companies"
        element={
          <RequireRole role="admin">
            <AdminPages.AdminCompanies />
          </RequireRole>
        }
      />
      <Route
        path="/admin-reports"
        element={
          <RequireRole role="admin">
            <AdminPages.AdminReports />
          </RequireRole>
        }
      />

      {/* --- SUPERADMIN ROUTES --- */}
      <Route
        path="/superadmin-dashboard"
        element={
          <RequireRole role="superadmin">
            <SuperadminPages.SuperAdminDashboard />
          </RequireRole>
        }
      />
      {/* Add more superadmin routes as needed */}

      {/* --- Not Found: fallback to role dashboard --- */}
      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
  );
}

/** RequireRole: Only renders children if user has required role */
function RequireRole({ role, children }) {
  const userRole = getUserRole();
  const roles = Array.isArray(role) ? role : [role];
  if (!userRole || !roles.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/**
 * Example barrel index file for student (src/student/index.js):
 * export { default as StudentDashboard } from './StudentDashboard';
 * export { default as Profile } from './Profile';
 * export { default as Checklists } from './Checklists';
 * export { default as PracticeTests } from './PracticeTests';
 * export { default as TestEngineWrapper } from './TestEngineWrapper';
 * export { default as TestReviewWrapper } from './TestReviewWrapper';
 * export { default as TestResults } from './TestResults';
 * export { default as Walkthrough } from './Walkthrough';
 * export { default as Flashcards } from './Flashcards';
 */
