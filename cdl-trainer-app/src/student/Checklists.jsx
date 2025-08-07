import React, { useEffect, useState } from "react";
import { db, auth } from "../utils/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { showToast } from "../utils/ui-helpers"; // If you want to keep this for error/info

const studentChecklistSectionsTemplate = [
  {
    header: "Personal Info",
    items: [
      {
        label: "Profile Complete",
        key: "profileComplete",
        link: "/student-profile",
        details: "Complete all required fields in your student profile.",
        readonly: false,
        substeps: null,
      },
    ],
  },
  {
    header: "Permit & Docs",
    items: [
      {
        label: "Permit Uploaded",
        key: "permitUploaded",
        link: "/student-profile",
        details: "Upload a clear photo of your CDL permit.",
        readonly: false,
        substeps: null,
      },
      {
        label: "Vehicle Data Plates Uploaded",
        key: "vehicleUploaded",
        link: "/student-profile",
        details: "Upload photos of both your truck and trailer data plates.",
        readonly: false,
        substeps: [
          { label: "Truck Plate", key: "truckPlateUrl" },
          { label: "Trailer Plate", key: "trailerPlateUrl" },
        ],
      },
    ],
  },
  {
    header: "Testing & Study",
    items: [
      {
        label: "Practice Test Passed",
        key: "practiceTestPassed",
        link: "/student-practice-tests",
        details:
          "Score at least 80% on any practice test to unlock the next step.",
        readonly: false,
        substeps: null,
      },
      {
        label: "Walkthrough Progress",
        key: "walkthroughComplete",
        link: "/student-walkthrough",
        details: "Start and complete your CDL vehicle inspection walkthrough.",
        readonly: false,
        substeps: null,
      },
    ],
  },
  {
    header: "Final Certification",
    items: [
      {
        label: "Complete in-person walkthrough and driving portion",
        key: "finalInstructorSignoff",
        link: "",
        details: "This final step must be marked complete by your instructor.",
        readonly: true,
        substeps: null,
      },
    ],
  },
];

function StudentChecklists() {
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [percent, setPercent] = useState(0);
  const [notifyItems, setNotifyItems] = useState([]);
  const navigate = useNavigate();

  function getCurrentUserEmail() {
    return (
      window.currentUserEmail ||
      localStorage.getItem("currentUserEmail") ||
      (auth.currentUser && auth.currentUser.email) ||
      null
    );
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const email = getCurrentUserEmail();
      if (!email) {
        showToast("You must be logged in to view this page.", 2800, "error");
        navigate("/login");
        return;
      }

      // Fetch user data
      let profile = {};
      let userRole = "student";
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          profile = snap.docs[0].data();
          userRole = profile.role || "student";
          localStorage.setItem("userRole", userRole);
        }
      } catch {
        profile = {};
      }
      if (userRole !== "student") {
        showToast("This checklist is only available for students.", 2600, "error");
        navigate("/login");
        return;
      }
      setUserData(profile);

      // Compute checklist progress
      const {
        cdlClass = "",
        cdlPermit = "",
        permitPhotoUrl = "",
        vehicleQualified = "",
        truckPlateUrl = "",
        trailerPlateUrl = "",
        experience = "",
        lastTestScore = 0,
        walkthroughProgress = 0,
        walkthroughComplete = false,
        finalInstructorSignoff = false,
      } = profile;

      // Deep clone checklist
      const checklistSections = JSON.parse(
        JSON.stringify(studentChecklistSectionsTemplate)
      );
      // --- Calculate step completion ---
      checklistSections[0].items[0].done = !!(cdlClass && cdlPermit && experience);
      checklistSections[0].items[0].notify = !checklistSections[0].items[0].done;

      checklistSections[1].items[0].done = cdlPermit === "yes" && !!permitPhotoUrl;
      checklistSections[1].items[0].notify = cdlPermit === "yes" && !permitPhotoUrl;

      checklistSections[1].items[1].done =
        vehicleQualified === "yes" && !!truckPlateUrl && !!trailerPlateUrl;
      checklistSections[1].items[1].notify =
        vehicleQualified === "yes" && (!truckPlateUrl || !trailerPlateUrl);

      if (checklistSections[1].items[1].substeps) {
        checklistSections[1].items[1].substeps[0].done = !!truckPlateUrl;
        checklistSections[1].items[1].substeps[1].done = !!trailerPlateUrl;
      }

      checklistSections[2].items[0].done = lastTestScore >= 80;
      checklistSections[2].items[0].notify = lastTestScore < 80;

      checklistSections[2].items[1].done = walkthroughProgress >= 1;
      checklistSections[2].items[1].notify = walkthroughProgress < 1;

      checklistSections[3].items[0].done =
        walkthroughComplete || finalInstructorSignoff;
      checklistSections[3].items[0].notify = !checklistSections[3].items[0].done;

      // Progress percent
      const flatChecklist = checklistSections.flatMap((sec) => sec.items);
      const complete = flatChecklist.filter((x) => x.done).length;
      const pct = Math.round((complete / flatChecklist.length) * 100);
      setPercent(pct);

      setSections(checklistSections);

      // Any notifications
      setNotifyItems(flatChecklist.filter((item) => item.notify));

      setLoading(false);
    }

    fetchData();
    // eslint-disable-next-line
  }, []);

  // --- UI ---
  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading your checklist…</p>
      </div>
    );
  }

  return (
    <div className="screen-wrapper fade-in checklist-page" style={{ maxWidth: 500, margin: "0 auto" }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>📋 Student Checklist</h2>
      {notifyItems.length > 0 && (
        <div
          className="checklist-alert-banner"
          role="alert"
          aria-live="polite"
          style={{
            background: "#ffe3e3",
            color: "#c1272d",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 15,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: "1.3em" }}>⚠️</span>
          <span>You have steps that need attention before you can complete your training.</span>
        </div>
      )}

      <div className="progress-track" style={{ marginBottom: 18, position: "relative" }}>
        <div className="progress-fill" style={{
          width: percent + "%",
          transition: "width 0.8s cubic-bezier(.45,1.4,.5,1.02)",
        }}></div>
        <span className="progress-label" id="progress-label" aria-live="polite" tabIndex={0}>
          {percent}% Complete
        </span>
      </div>
      {percent === 100 && (
        <div className="completion-badge" aria-live="polite"
          style={{
            background: "#bbffd0",
            color: "#14692d",
            padding: "7px 17px",
            borderRadius: 20,
            fontWeight: 600,
            textAlign: "center",
            margin: "0 0 12px 0",
          }}>
          🎉 All steps complete! Ready for certification.
        </div>
      )}

      {sections.map((section, i) => (
        <div className="checklist-section" key={section.header}>
          <h3 className="checklist-section-header">{section.header}</h3>
          <ul className="checklist-list">
            {section.items.map((item, idx) => (
              <ChecklistItem
                key={item.key}
                item={item}
                sectionIdx={i}
                itemIdx={idx}
                onAction={() => {
                  if (item.link) navigate(item.link);
                }}
              />
            ))}
          </ul>
        </div>
      ))}

      <button className="btn wide" style={{ marginTop: 24 }} onClick={() => navigate("/student-dashboard")}>
        ⬅ Back to Dashboard
      </button>
    </div>
  );
}

function ChecklistItem({ item, onAction, sectionIdx, itemIdx }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li
      className={
        "checklist-item" +
        (item.done ? " done" : "") +
        (item.readonly ? " readonly" : "") +
        (expanded ? " expanded" : "")
      }
      aria-current={item.notify && !item.done && !item.readonly ? "step" : undefined}
      tabIndex={0}
      onKeyUp={e => {
        if (e.key === "Enter" || e.key === " ") setExpanded((ex) => !ex);
      }}
    >
      {item.notify && !item.done && !item.readonly && (
        <span className="notify-bubble" aria-label="Incomplete Step" title="This step needs attention">!</span>
      )}
      <div
        className="checklist-item-main"
        role="button"
        aria-expanded={expanded ? "true" : "false"}
        aria-controls={`details-${sectionIdx}-${itemIdx}`}
        tabIndex={0}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: 38,
          userSelect: "none",
          cursor: "pointer",
        }}
        onClick={() => setExpanded((ex) => !ex)}
      >
        <span className="checklist-label" style={item.done ? { textDecoration: "line-through", color: "#9fdcb7" } : {}}>
          {item.label}
        </span>
        <span className="chevron" style={{ marginLeft: "auto", fontSize: "1.1em", color: "#999", transform: expanded ? "rotate(90deg)" : "" }}>&#x25B6;</span>
        {item.done ? (
          <span className="badge badge-success" aria-label="Complete" style={{ animation: "popCheck .28s cubic-bezier(.42,1.85,.5,1.03)" }}>✔</span>
        ) : item.readonly ? (
          <span className="badge badge-waiting" title="Instructor must complete" aria-label="Instructor Only">🔒</span>
        ) : (
          <button className="btn outline btn-sm" onClick={e => { e.stopPropagation(); onAction(); }}>
            Complete
          </button>
        )}
      </div>
      <div
        id={`details-${sectionIdx}-${itemIdx}`}
        className="checklist-details"
        style={{ display: expanded ? "block" : "none" }}
        aria-hidden={!expanded}
      >
        {item.details}
        {item.substeps && (
          <ul className="substeps">
            {item.substeps.map((ss, i) => (
              <li key={ss.key} className={ss.done ? "done" : ""}>
                {ss.done ? "✅" : <span style={{ color: "#ff6565", fontSize: "1.18em", fontWeight: 900, verticalAlign: "middle" }}>!</span>} {ss.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export default StudentChecklists;
