// Shim so imports like `@student/StudentDashboard.jsx` (used by StudentRouter)
// continue to work even though the real file lives in /dashboard.
export { default } from './dashboard/StudentDashboard.jsx'