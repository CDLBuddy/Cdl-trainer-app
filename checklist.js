// checklists.js

import { db, auth } from './firebase.js';
import {
  showToast,
  setupNavigation
} from './ui-helpers.js';

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Modular renderers – Uncomment these imports only if you've modularized them!
import { renderProfile } from './profile.js';
import { renderWalkthrough } from './walkthrough.js';
import { renderPracticeTests } from './practice-tests.js';
import { renderDashboard } from './dashboard-student.js';

let currentUserEmail = window.currentUserEmail || null;

export async function renderChecklists(container = document.getElementById("app")) {
  if (!container) return;

  // User context
  const email = currentUserEmail || (auth.currentUser && auth.currentUser.email);
  if (!email) {
    container.innerHTML = "<p>You must be logged in to view this page.</p>";
    return;
  }

  // Fetch data
  let userData = {};
  let userRole = localStorage.getItem("userRole") || "student";
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || userRole || "student";
      localStorage.setItem("userRole", userRole);
    }
  } catch (e) {
    userData = {};
  }

  if (userRole !== "student") {
    container.innerHTML = "<p>This checklist is only available for students.</p>";
    return;
  }

  // Extract progress fields
  const {
    cdlClass = "", cdlPermit = "", permitPhotoUrl = "",
    vehicleQualified = "", truckPlateUrl = "", trailerPlateUrl = "",
    experience = "", lastTestScore = 0, walkthroughProgress = 0,
    walkthroughComplete = false,
  } = userData;

  // Main checklist logic (grouped)
  const checklistSections = [
    {
      header: "Personal Info",
      items: [
        {
          label: "Profile Complete",
          done: !!(cdlClass && cdlPermit && experience),
          link: "profile",
          notify: !(cdlClass && cdlPermit && experience),
          details: "Complete all required fields in your student profile.",
        },
      ]
    },
    {
      header: "Permit & Docs",
      items: [
        {
          label: "Permit Uploaded",
          done: cdlPermit === "yes" && !!permitPhotoUrl,
          link: "profile",
          notify: cdlPermit === "yes" && !permitPhotoUrl,
          details: "Upload a clear photo of your CDL permit.",
        },
        {
          label: "Vehicle Data Plates Uploaded",
          done: vehicleQualified === "yes" && !!truckPlateUrl && !!trailerPlateUrl,
          link: "profile",
          notify: vehicleQualified === "yes" && (!truckPlateUrl || !trailerPlateUrl),
          details: "Upload photos of both your truck and trailer data plates.",
          substeps: [
            { label: "Truck Plate", done: !!truckPlateUrl },
            { label: "Trailer Plate", done: !!trailerPlateUrl }
          ]
        },
      ]
    },
    {
      header: "Testing & Study",
      items: [
        {
          label: "Practice Test Passed",
          done: lastTestScore >= 80,
          link: "practiceTests",
          notify: lastTestScore < 80,
          details: "Score at least 80% on any practice test to unlock the next step.",
        },
        {
          label: "Walkthrough Progress",
          done: walkthroughProgress >= 1,
          link: "walkthrough",
          notify: walkthroughProgress < 1,
          details: "Start and complete your CDL vehicle inspection walkthrough.",
        },
      ]
    },
    {
      header: "Final Certification",
      items: [
        {
          label: "Complete in-person walkthrough and driving portion",
          done: !!walkthroughComplete,
          link: "",
          notify: !walkthroughComplete,
          details: "This final step must be marked complete by your instructor.",
          readonly: true
        }
      ]
    }
  ];

  // Flat checklist for progress calc
  const flatChecklist = checklistSections.flatMap(sec => sec.items);
  const complete = flatChecklist.filter(x => x.done).length;
  const percent = Math.round((complete / flatChecklist.length) * 100);

  // Confetti on 100%
  if (percent === 100) {
    setTimeout(() => {
      if (window.confetti) window.confetti();
      const badge = document.createElement("div");
      badge.className = "completion-badge";
      badge.innerHTML = "🎉 All steps complete! Ready for certification.";
      document.body.appendChild(badge);
      setTimeout(() => badge.remove(), 3200);
    }, 600);
  }

  // Render Checklist Page
  container.innerHTML = `
    <div class="screen-wrapper fade-in checklist-page" style="max-width:480px;margin:0 auto;">
      <h2 style="display:flex;align-items:center;gap:9px;">📋 Student Checklist</h2>
      <div class="progress-track" style="margin-bottom:18px;">
        <div class="progress-fill" style="width:${percent}%;transition:width 0.6s cubic-bezier(.45,1.4,.5,1.02);"></div>
        <span class="progress-label">${percent}% Complete</span>
      </div>
      ${checklistSections.map(section => `
        <div class="checklist-section">
          <h3 class="checklist-section-header">${section.header}</h3>
          <ul class="checklist-list">
            ${section.items.map((item, idx) => `
              <li class="checklist-item ${item.done ? "done" : ""} ${item.readonly ? "readonly" : ""}">
                ${item.notify && !item.done && !item.readonly
                  ? `<span class="notify-bubble" aria-label="Incomplete Step" title="This step needs attention">!</span>`
                  : ""
                }
                <div class="checklist-item-main">
                  <span class="checklist-label" style="${item.done ? 'text-decoration:line-through;color:#9fdcb7;' : ''}">
                    ${item.label}
                  </span>
                  ${item.done 
                    ? `<span class="badge badge-success" style="animation:popCheck .28s cubic-bezier(.42,1.85,.5,1.03);">✔</span>` 
                    : item.readonly
                      ? `<span class="badge badge-waiting" title="Instructor must complete" aria-label="Instructor Only">🔒</span>`
                      : `<button class="btn outline btn-sm" data-nav="${item.link}">Complete</button>`
                  }
                </div>
                <div class="checklist-details" style="display:none;">
                  ${item.details || ""}
                  ${item.substeps ? `
                    <ul class="substeps">
                      ${item.substeps.map(ss => `
                        <li${ss.done ? ' class="done"' : ''}>
                          ${ss.done ? "✅" : "<span style='color:#ff6565;font-size:1.18em;font-weight:900;vertical-align:middle;'>!</span>"} ${ss.label}
                        </li>
                      `).join("")}
                    </ul>
                  ` : ""}
                </div>
              </li>
            `).join("")}
          </ul>
        </div>
      `).join("")}
       <button class="btn wide" id="back-to-dashboard-btn" style="margin-top:24px;">⬅ Back to Dashboard</button>
    </div>
  `;

  // Animate progress bar on mount
  setTimeout(() => {
    const bar = container.querySelector('.progress-fill');
    if (bar) bar.style.width = percent + "%";
  }, 25);

  // Expand/collapse checklist details and label
  container.querySelectorAll('.checklist-item-main').forEach(main => {
    main.addEventListener("click", function() {
      const li = this.closest('.checklist-item');
      const details = li.querySelector('.checklist-details');
      const label = li.querySelector('.checklist-label');
      if (!details) return;
      const expanded = li.classList.toggle('expanded');
      details.style.display = expanded ? "block" : "none";
      if (expanded) {
        label.style.display = "none";
      } else {
        label.style.display = "";
      }
    });
  });

  // Navigation for checklist actions
  container.querySelectorAll('.btn[data-nav]').forEach(btn => {
    btn.addEventListener('click', e => {
      const target = btn.getAttribute('data-nav');
      if (target === "profile") return renderProfile();
      if (target === "walkthrough") return renderWalkthrough();
      if (target === "practiceTests") return renderPracticeTests();
      showToast("This action is not yet available.");
      setupNavigation();
    });
  });

  // Back button
  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderDashboard();
  });

  setupNavigation();
}