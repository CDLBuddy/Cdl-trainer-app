// src/instructor/InstructorRouter.jsx
import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Lazy-load instructor pages
const InstructorDashboard = lazy(() => import('./InstructorDashboard.jsx'))
const InstructorProfile = lazy(() => import('./InstructorProfile.jsx'))
const StudentProfileForInstructor = lazy(
  () => import('./StudentProfileForInstructor.jsx')
)
const ChecklistReviewForInstructor = lazy(
  () => import('./ChecklistReviewForInstructor.jsx')
)
// const InstructorChecklists      = lazy(() => import("./InstructorChecklists.jsx")); // add when file exists

function Loading() {
  return (
    <div style={{ textAlign: 'center', marginTop: '4em' }}>
      <div className="spinner" />
      <p>Loading instructor page…</p>
    </div>
  )
}

export default function InstructorRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* /instructor */}
        <Route index element={<InstructorDashboard />} />
        <Route path="dashboard" element={<InstructorDashboard />} />
        <Route path="profile" element={<InstructorProfile />} />
        <Route
          path="student-profile/:studentId"
          element={<StudentProfileForInstructor />}
        />
        <Route
          path="checklist-review"
          element={<ChecklistReviewForInstructor />}
        />
        {/* <Route path="checklists" element={<InstructorChecklists />} /> */}

        {/* Fallback inside instructor namespace */}
        <Route
          path="*"
          element={<Navigate to="/instructor/dashboard" replace />}
        />
      </Routes>
    </Suspense>
  )
}
