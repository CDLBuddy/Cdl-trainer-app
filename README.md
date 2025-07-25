# CDL Trainer

**Interactive AI-Powered Web App for CDL Training and ELDT Compliance**

—

## Overview

CDL Trainer is a next-generation, multi-school platform for CDL students, instructors, and admins, designed to boost pass rates and streamline Entry-Level Driver Training (ELDT) compliance.  
Built with a modern modular ES module architecture and premium glassmorphism UI.

**Key Features:**
- 🔒 Secure, multi-role login (student, instructor, admin)
- 🎨 Brand-customizable for any CDL school (logos, colors, subheadline)
- 📝 Automated checklists & real-time progress tracking
- 🧪 Practice tests & results dashboard
- 🤖 AI Coach chat and daily CDL study tips
- ✅ Walkthrough script drill (vehicle inspection)
- 🚦 Flashcards & study streak tracker
- 📈 Analytics for instructors/admins
- 🗺️ State & FMCSA compliance reminders
- 📷 Profile, permit, and vehicle data upload
- ✨ Fully responsive, animated glass UI

—

## Tech Stack

- **Frontend:** Vanilla JS (modular ES modules), HTML5, CSS3 (Glassmorphism theme)
- **Backend:** Firebase (Auth, Firestore, Storage)
- **AI/Chat:** OpenAI API (optional, for Coach)
- **Deployment:** Vercel, GitHub Pages, Netlify (works anywhere with Firebase config)

—

## Quick Start (Local Dev)

1. **Clone the repo:**
    ```sh
    git clone https://github.com/your-org/cdl-trainer.git
    cd cdl-trainer
    ```

2. **Install and configure:**
    - Copy your Firebase config to `firebase.js`
    - (Optional) Update `school-branding.js` with your school’s info

3. **Serve locally (with any static server):**
    ```sh
    npx serve .
    ```
    or open `index.html` directly if your browser supports ES modules.

4. **Deploy:**
    - Push to GitHub + connect to Vercel/Netlify (recommended for CI/CD)
    - Or host on your own server

—

## Project Structure
public
├── index.html
├── style.css
├── app.js
├── ui-helpers.js
├── firebase.js
├── navigation.js
├── school-branding.js
├── dashboard/
│     ├── student-dashboard.js
│     ├── instructor-dashboard.js
│     └── admin-dashboard.js
├── checklists.js
├── walkthrough.js
├── flashcards.js

—

## Contributing

Pull requests, bug reports, and feature ideas are welcome!  
For ELDT/CDL school rebranding or licensing, [contact support](mailto:info@cdltrainer.com).

—

## License

© 2024 CDL Trainer. All rights reserved.  
For commercial, educational, or multi-school licensing, see [LICENSE.md](LICENSE.md).

—

**Build the future of CDL training!**