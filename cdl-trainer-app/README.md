# 🚛 CDL Trainer App

**CDL Trainer** is a role-based web application built with **React + Vite** and **Firebase** to help CDL schools deliver and manage **Entry-Level Driver Training (ELDT)**. It provides dashboards for **Students, Instructors, Admins, and Superadmins**, supports **custom school branding**, and includes a **practice test engine**, **walkthroughs**, **checklists**, and an **AI Coach**.

---

## ✨ Features

- Role-based access control (Student, Instructor, Admin, Superadmin)
- Custom school branding (logo, colors, sub-headline)
- Walkthroughs (default CDL sets; schools can supply custom versions)
- Practice tests with review/results
- AI Coach (context-aware modal; keyboard shortcut)
- Checklists & instructor verification
- Admin tools (users/companies, exports, reports)
- Superadmin tools (permissions, schools, system controls)
- Firebase Auth + Firestore + Storage
- Offline-friendly Firestore persistence
- Responsive UI, mobile-first

---

## 🧱 Tech Stack

- Frontend: React 18, React Router 6, Vite
- Styling: CSS Modules + global utility styles
- State/Context: React Context + custom hooks
- Backend: Firebase (Auth, Firestore, Storage)
- Tooling: ESLint, Prettier

---

## 📁 Project Structure (post-migration)

cdl-trainer-app/
├─ index.html
├─ vite.config.js
├─ package.json
├─ .gitignore
├─ .env.local ← local secrets (gitignored)
├─ public/ ← static assets
└─ src/
├─ main.jsx ← app bootstrap
├─ App.jsx ← routes + session provider
├─ navigation/ ← role nav & route helpers
├─ components/ ← shared UI (Shell, NavBar, Toast, AICoachModal, etc.)
├─ pages/ ← Login, Signup, Welcome, NotFound
├─ styles/ ← global CSS (index.css, theme.css, Utilities.css)
├─ utils/ ← firebase.js, RequireRole.jsx, auth helpers, ui-helpers.js
├─ student/ ← StudentRouter, Dashboard, Flashcards, TestResults, etc.
├─ instructor/ ← InstructorRouter, Dashboard, Profile, ChecklistReview\*, etc.
├─ admin/ ← AdminRouter, Dashboard, Reports, Export controls
├─ superadmin/ ← SuperadminRouter, Permissions, Dashboard
└─ walkthrough-data/ ← default walkthrough definitions (index.js, class A/B, passenger bus)

---

## 🛠️ Getting Started

1. Clone & install

   git clone https://github.com/<your-org>/<your-repo>.git
   cd cdl-trainer-app
   npm install

2. Create `.env.local` in the project root

   VITE_FIREBASE_API_KEY=your-key
   VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXX
   VITE_USE_FIREBASE_EMULATORS=false

   # Optional:

   VITE_FIRESTORE_MULTI_TAB=false

   Note: `.env.local` is ignored by Git. A safe template lives in `.env.example`.

3. Run the dev server

   npm run dev

   # open http://localhost:5173

4. Build for production

   npm run build

   # outputs to dist/

---

## 🔐 Security & Secrets

- Never commit real keys; keep them in `.env.local` and in your hosting provider’s env settings (e.g., Vercel).
- Restrict Firebase **Authentication authorized domains** to your app domains.
- Enforce Firestore **security rules** with role checks.
- Bridge-mode toasts warn in dev if the React provider isn’t mounted (helps catch missing wiring).

---

## 🔒 Roles & Protected Routes

- Use `RequireRole` to guard screens:

  <RequireRole role={["instructor","admin"]}>
  <ChecklistReview />
  </RequireRole>

- Role resolution order: **custom claims → users/<uid> → users by email**, with a short `sessionStorage` cache to reduce reads.

---

## 🔔 Toasts (Bridge Mode)

- Legacy `showToast(message, duration, type)` is kept for compatibility.
- Internally it routes to the React `ToastProvider` via `registerToastHandler()`, with a DOM fallback + dev warning.
- ESLint warns on new raw `showToast(` usage to encourage gradual migration to `useToast()`.

---

## 🧪 Development Notes

- Default walkthroughs live under `src/walkthrough-data/`. Schools can provide custom sets; your app can select by **schoolId**.
- Branding is cached and can notify the Shell via `subscribeBrandingUpdated`.
- Key utilities:
  - `utils/firebase.js` — singleton app, `auth`, `db`, `storage`
  - `utils/ui-helpers.js` — bridge toasts, tips, progress helpers
  - `utils/RequireRole.jsx` — auth/role gate

---

## 🧭 Deployment (Vercel example)

1. Push code to GitHub.
2. Create a Vercel project and connect the repo.
3. Add **Environment Variables** in Vercel matching your `.env.local` keys.
4. Deploy (Vercel builds with `npm run build` and serves `dist/`).

---

## 🧩 Troubleshooting

- Blank page in prod → verify env vars set in hosting provider; rebuild.
- Auth works locally but not prod → add prod domain to Firebase **Authorized domains**.
- Toasts not showing → ensure `ToastProvider` is mounted and `registerToastHandler` is called in App/Shell.
- Role shows “Access Denied” → confirm Firestore `users/<uid>.role` or custom claims are set.

---

## 🤝 Contributing

- Use feature branches and PRs.
- Follow ESLint/Prettier formatting.
- Test routes for **all roles** before merging.
- Avoid importing secrets; rely on `import.meta.env`.

---

## 📖 Help for School Owners (in-app copy)

**CDL Trainer** helps your school manage and deliver CDL training in one place.

- Brand your portal: add your logo and colors.
- Manage people: add students and instructors; assign roles.
- Deliver training: use built-in walkthroughs or upload custom ones.
- Track progress: monitor checklists, test results, and completion.
- Export reports: generate records for audits and compliance.

How to use:

1. Log in with the email provided by your school admin.
2. You’ll land on your role’s dashboard (Student/Instructor/Admin).
3. Follow the on-screen steps (walkthroughs, tests, or reviews).

Need help? Email **support@cdltrainerapp.com**.

---

## 📝 License

MIT © CDL Trainer App
