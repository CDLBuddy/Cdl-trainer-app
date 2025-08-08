import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../utils/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import {
  showToast,
  markStudentProfileComplete,
  markStudentPermitUploaded,
  markStudentVehicleUploaded,
} from "../utils/ui-helpers";
import { getCurrentSchoolBranding } from "../utils/school-branding";
import { getWalkthroughLabel } from "../utils/walkthrough-data";

// ---------- Constants ----------
const endorsementOptions = [
  { val: "H", label: "Hazmat (H)" },
  { val: "N", label: "Tanker (N)" },
  { val: "T", label: "Double/Triple Trailers (T)" },
  { val: "P", label: "Passenger (P)" },
  { val: "S", label: "School Bus (S)" },
  { val: "AirBrakes", label: "Air Brakes" },
  { val: "Other", label: "Other" },
];

const restrictionOptions = [
  { val: "auto", label: "Remove Automatic Restriction" },
  { val: "airbrake", label: "Remove Air Brake Restriction" },
  { val: "refresher", label: "One-day Refresher" },
  { val: "roadtest", label: "Road Test Prep" },
];

const PHONE_PATTERN = "[0-9\\-\\(\\)\\+ ]{10,15}";
const AUTOSAVE_DEBOUNCE_MS = 700;

// ---------- Helpers ----------
const getCurrentUserEmail = () =>
  auth.currentUser?.email ||
  window.currentUserEmail ||
  localStorage.getItem("currentUserEmail") ||
  null;

function calcProgress(p = {}) {
  // Keep parity with your legacy calculation (15 checks)
  let total = 15;
  let filled = 0;
  if (p.name) filled++;
  if (p.dob) filled++;
  if (p.profilePicUrl) filled++;
  if (p.cdlClass) filled++;
  if (Array.isArray(p.endorsements) && p.endorsements.length) filled++;
  if (Array.isArray(p.restrictions) && p.restrictions.length) filled++;
  if (p.experience) filled++;
  if (p.cdlPermit) filled++;
  if (p.permitPhotoUrl) filled++;
  if (p.driverLicenseUrl) filled++;
  if (p.medicalCardUrl) filled++;
  if (p.vehicleQualified) filled++;
  if (p.truckPlateUrl) filled++;
  if (p.emergencyName && p.emergencyPhone) filled++;
  if (p.waiverSigned) filled++;
  return Math.round((filled / total) * 100);
}

export default function Profile() {
  const navigate = useNavigate();
  const email = getCurrentUserEmail();

  const [brand, setBrand] = useState({ primaryColor: "", logoUrl: "", schoolName: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRef, setUserRef] = useState(null);

  // The full profile state (one object, controlled form)
  const [p, setP] = useState({
    // basic
    name: "",
    dob: "",
    profilePicUrl: "",
    // cdl
    cdlClass: "",
    endorsements: [],
    restrictions: [],
    experience: "",
    // assignments
    assignedCompany: "",
    assignedInstructor: "",
    // permit
    cdlPermit: "",
    permitPhotoUrl: "",
    permitExpiry: "",
    // license
    driverLicenseUrl: "",
    licenseExpiry: "",
    // med card
    medicalCardUrl: "",
    medCardExpiry: "",
    // vehicle
    vehicleQualified: "",
    truckPlateUrl: "",
    trailerPlateUrl: "",
    // emergency
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",
    // waiver
    waiverSigned: false,
    waiverSignature: "",
    // course/schedule
    course: "",
    schedulePref: "",
    scheduleNotes: "",
    // payment
    paymentStatus: "",
    paymentProofUrl: "",
    // meta
    status: "active",
    profileProgress: 0,
    profileUpdatedAt: null,
    lastUpdatedBy: "",
    role: "student",
  });

  const progress = useMemo(() => calcProgress(p), [p]);
  const firstLoadRef = useRef(true);
  const autosaveTimer = useRef(null);

  // ---------- Load branding + profile ----------
  useEffect(() => {
    if (!email) {
      showToast("You must be logged in to view your profile.", 3000, "error");
      navigate("/login");
      return;
    }

    (async () => {
      try {
        const b = (await getCurrentSchoolBranding()) || {};
        setBrand(b);

        const refDoc = doc(db, "users", email);
        setUserRef(refDoc);
        const snap = await getDoc(refDoc);

        if (!snap.exists()) {
          showToast("Profile not found.", 3000, "error");
          navigate("/student/dashboard");
          return;
        }

        const data = snap.data() || {};
        // role-guard here as a safety net; router should guard too
        const role = data.role || localStorage.getItem("userRole") || "student";
        if (role !== "student") {
          showToast("Access denied: Student profile only.", 3000, "error");
          navigate("/student/dashboard");
          return;
        }

        setP((prev) => ({ ...prev, ...data }));
      } catch (e) {
        console.error(e);
        showToast("Failed to load profile.", 3000, "error");
        navigate("/student/dashboard");
      } finally {
        setLoading(false);
        firstLoadRef.current = false;
      }
    })();
  }, [email, navigate]);

  // ---------- Apply branding to CSS var ----------
  useEffect(() => {
    if (brand?.primaryColor) {
      document.documentElement.style.setProperty("--brand-primary", brand.primaryColor);
    }
  }, [brand]);

  // ---------- Debounced Auto-save ----------
  const requestAutosave = useCallback(() => {
    if (!userRef || firstLoadRef.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const payload = {
          ...p,
          profileProgress: calcProgress(p),
          profileUpdatedAt: serverTimestamp(),
          lastUpdatedBy: email,
        };
        await updateDoc(userRef, payload);
        await markStudentProfileComplete(email); // mirrors previous behavior
      } catch (e) {
        console.error(e);
        showToast("Auto-save failed. Check your connection.", 3500, "error");
      } finally {
        setSaving(false);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [p, userRef, email]);

  useEffect(() => {
    // trigger autosave when p changes (skip initial load)
    if (!firstLoadRef.current) requestAutosave();
  }, [p, requestAutosave]);

  // ---------- Field change helpers ----------
  const setField = (key, val) => setP((prev) => ({ ...prev, [key]: val }));
  const toggleInArray = (key, val) =>
    setP((prev) => {
      const arr = new Set(prev[key] || []);
      arr.has(val) ? arr.delete(val) : arr.add(val);
      return { ...prev, [key]: Array.from(arr) };
    });

  // ---------- Upload handler ----------
  async function handleUpload(file, path, field, checklistFn) {
    if (!file || !userRef) return;
    try {
      const storageRef = ref(storage, `${path}/${email}-${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setField(field, url); // triggers autosave
      showToast(`${field.replace(/Url$/, "")} uploaded!`);

      if (typeof checklistFn === "function") {
        try {
          await checklistFn(email);
        } catch (_) {
          /* non-fatal */
        }
      }
    } catch (e) {
      console.error(e);
      showToast(`Failed to upload ${field}.`, 3500, "error");
    }
  }

  // When both plates uploaded, mark vehicle uploaded
  useEffect(() => {
    if (p.truckPlateUrl && p.trailerPlateUrl) {
      (async () => {
        try {
          await markStudentVehicleUploaded(email);
        } catch (_) {}
      })();
    }
  }, [p.truckPlateUrl, p.trailerPlateUrl, email]);

  // If permit photo uploaded and cdlPermit === "yes", mark permit uploaded
  useEffect(() => {
    if (p.cdlPermit === "yes" && p.permitPhotoUrl) {
      (async () => {
        try {
          await markStudentPermitUploaded(email);
        } catch (_) {}
      })();
    }
  }, [p.cdlPermit, p.permitPhotoUrl, email]);

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="screen-wrapper fade-in" style={{ textAlign: "center", marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading profile…</p>
      </div>
    );
  }

  if (p.status && p.status !== "active") {
    return (
      <div className="screen-wrapper fade-in profile-page" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h2>Profile Inactive</h2>
        <p>Your profile is currently inactive. Please contact your instructor or school admin.</p>
        <button className="btn outline" onClick={() => navigate("/student/dashboard")}>⬅ Dashboard</button>
      </div>
    );
  }

  return (
    <div className="screen-wrapper fade-in profile-page" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h2 style={{ color: brand?.primaryColor, display: "flex", alignItems: "center", gap: 12 }}>
        {brand?.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt="School Logo"
            style={{ height: 36, borderRadius: 8, background: "#fff", boxShadow: "0 1px 5px #0001" }}
          />
        ) : null}
        👤 Student Profile
        <span className="role-badge student" style={{ background: brand?.primaryColor, color: "#fff" }}>
          Student
        </span>
        {brand?.schoolName ? (
          <span
            className="school-badge"
            style={{
              marginLeft: 6,
              padding: "2px 10px",
              background: `${brand.primaryColor || "#6a8"}22`,
              borderRadius: 8,
              color: brand?.primaryColor,
              fontSize: ".95em",
            }}
          >
            {brand.schoolName}
          </span>
        ) : null}
      </h2>

      <div className="progress-bar" style={{ marginBottom: "1.2rem" }}>
        <div className="progress" style={{ width: `${progress}%`, background: brand?.primaryColor }} />
        <span className="progress-label">{progress}% Complete</span>
      </div>

      <form className="profile-form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        {/* Basic */}
        <label>
          Name:
          <input
            type="text"
            value={p.name || ""}
            onChange={(e) => setField("name", e.target.value)}
            required
          />
        </label>

        <label>
          Date of Birth:
          <input
            type="date"
            value={p.dob || ""}
            onChange={(e) => setField("dob", e.target.value)}
            required
          />
        </label>

        <label>
          Profile Picture:
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleUpload(e.target.files?.[0], "profilePics", "profilePicUrl", markStudentProfileComplete)}
          />
          {p.profilePicUrl ? (
            <img src={p.profilePicUrl} alt="Profile" style={{ maxWidth: 80, marginTop: 6, borderRadius: 9 }} />
          ) : null}
        </label>

        {/* CDL */}
        <label>
          CDL Class:
          <select
            value={p.cdlClass || ""}
            onChange={(e) => setField("cdlClass", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option value="A">Class A</option>
            <option value="A-WO-AIR-ELEC">Class A w/o Air/Electric</option>
            <option value="A-WO-HYD-ELEC">Class A w/o Hydraulic/Electric</option>
            <option value="B">Class B</option>
            <option value="PASSENGER-BUS">Passenger Bus</option>
          </select>
        </label>

        <fieldset>
          <legend>Endorsements</legend>
          {endorsementOptions.map((opt) => (
            <label key={opt.val} style={{ marginRight: "1em" }}>
              <input
                type="checkbox"
                checked={Array.isArray(p.endorsements) && p.endorsements.includes(opt.val)}
                onChange={() => toggleInArray("endorsements", opt.val)}
              />
              {" "}{opt.label}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Restrictions</legend>
          {restrictionOptions.map((opt) => (
            <label key={opt.val} style={{ marginRight: "1em" }}>
              <input
                type="checkbox"
                checked={Array.isArray(p.restrictions) && p.restrictions.includes(opt.val)}
                onChange={() => toggleInArray("restrictions", opt.val)}
              />
              {" "}{opt.label}
            </label>
          ))}
        </fieldset>

        <label>
          Experience:
          <select
            value={p.experience || ""}
            onChange={(e) => setField("experience", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option value="none">No Experience</option>
            <option value="1-2">1–2 Years</option>
            <option value="3-5">3–5 Years</option>
            <option value="6-10">6–10 Years</option>
            <option value="10+">10+ Years</option>
          </select>
        </label>

        <label>
          Current Employer:
          <input
            type="text"
            value={p.assignedCompany || ""}
            onChange={(e) => setField("assignedCompany", e.target.value)}
          />
        </label>

        <label>
          Assigned Instructor:
          <input
            type="text"
            value={p.assignedInstructor || ""}
            onChange={(e) => setField("assignedInstructor", e.target.value)}
          />
        </label>

        {/* Permit */}
        <label>
          CDL Permit?
          <select
            value={p.cdlPermit || ""}
            onChange={(e) => setField("cdlPermit", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        {p.cdlPermit === "yes" && (
          <>
            <label>
              Permit Photo:
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleUpload(e.target.files?.[0], "permits", "permitPhotoUrl", markStudentPermitUploaded)}
              />
              {p.permitPhotoUrl ? (
                <img src={p.permitPhotoUrl} alt="Permit" style={{ maxWidth: 90, marginTop: 6, borderRadius: 8 }} />
              ) : null}
            </label>

            <label>
              Permit Expiry:
              <input
                type="date"
                value={p.permitExpiry || ""}
                onChange={(e) => setField("permitExpiry", e.target.value)}
              />
            </label>
          </>
        )}

        {/* License */}
        <label>
          Driver License Upload:
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleUpload(e.target.files?.[0], "licenses", "driverLicenseUrl")}
          />
          {p.driverLicenseUrl ? (
            <img src={p.driverLicenseUrl} alt="License" style={{ maxWidth: 90, marginTop: 6, borderRadius: 8 }} />
          ) : null}
        </label>

        <label>
          License Expiry:
          <input
            type="date"
            value={p.licenseExpiry || ""}
            onChange={(e) => setField("licenseExpiry", e.target.value)}
          />
        </label>

        {/* Medical Card */}
        <label>
          Medical Card Upload:
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleUpload(e.target.files?.[0], "medCards", "medicalCardUrl")}
          />
          {p.medicalCardUrl ? (
            <img src={p.medicalCardUrl} alt="Medical Card" style={{ maxWidth: 90, marginTop: 6, borderRadius: 8 }} />
          ) : null}
        </label>

        <label>
          Medical Card Expiry:
          <input
            type="date"
            value={p.medCardExpiry || ""}
            onChange={(e) => setField("medCardExpiry", e.target.value)}
          />
        </label>

        {/* Vehicle */}
        <label>
          Is Your Vehicle Qualified?
          <select
            value={p.vehicleQualified || ""}
            onChange={(e) => setField("vehicleQualified", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        {p.vehicleQualified === "yes" && (
          <>
            <label>
              Truck Data Plate:
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleUpload(e.target.files?.[0], "vehicle-plates", "truckPlateUrl")}
              />
              {p.truckPlateUrl ? (
                <img src={p.truckPlateUrl} alt="Truck Plate" style={{ maxWidth: 90, marginTop: 6, borderRadius: 8 }} />
              ) : null}
            </label>

            <label>
              Trailer Data Plate:
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleUpload(e.target.files?.[0], "vehicle-plates", "trailerPlateUrl")}
              />
              {p.trailerPlateUrl ? (
                <img src={p.trailerPlateUrl} alt="Trailer Plate" style={{ maxWidth: 90, marginTop: 6, borderRadius: 8 }} />
              ) : null}
            </label>
          </>
        )}

        {/* Emergency */}
        <label>
          Emergency Contact Name:
          <input
            type="text"
            value={p.emergencyName || ""}
            onChange={(e) => setField("emergencyName", e.target.value)}
            required
          />
        </label>

        <label>
          Emergency Contact Phone:
          <input
            type="tel"
            pattern={PHONE_PATTERN}
            value={p.emergencyPhone || ""}
            onChange={(e) => setField("emergencyPhone", e.target.value)}
            required
          />
        </label>

        <label>
          Emergency Contact Relation:
          <input
            type="text"
            value={p.emergencyRelation || ""}
            onChange={(e) => setField("emergencyRelation", e.target.value)}
            required
          />
        </label>

        {/* Waiver */}
        <label>
          <input
            type="checkbox"
            checked={!!p.waiverSigned}
            onChange={(e) => setField("waiverSigned", e.target.checked)}
          />{" "}
          Waiver Signed
        </label>

        <label>
          Waiver Signature:
          <input
            type="text"
            value={p.waiverSignature || ""}
            onChange={(e) => setField("waiverSignature", e.target.value)}
          />
        </label>

        {/* Course & Schedule */}
        <label>
          Course:
          <input
            type="text"
            value={p.course || ""}
            onChange={(e) => setField("course", e.target.value)}
          />
        </label>

        <label>
          Schedule Preference:
          <input
            type="text"
            value={p.schedulePref || ""}
            onChange={(e) => setField("schedulePref", e.target.value)}
          />
        </label>

        <label>
          Schedule Notes:
          <textarea
            value={p.scheduleNotes || ""}
            onChange={(e) => setField("scheduleNotes", e.target.value)}
          />
        </label>

        {/* Payment */}
        <label>
          Payment Status:
          <input
            type="text"
            value={p.paymentStatus || ""}
            onChange={(e) => setField("paymentStatus", e.target.value)}
          />
        </label>

        <label>
          Payment Proof Upload:
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleUpload(e.target.files?.[0], "payments", "paymentProofUrl")}
          />
          {p.paymentProofUrl ? (
            <img src={p.paymentProofUrl} alt="Payment Proof" style={{ maxWidth: 90, marginTop: 6, borderRadius: 8 }} />
          ) : null}
        </label>

        {/* Footer */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          <button type="button" className="btn outline" onClick={() => navigate("/student/dashboard")}>
            ⬅ Dashboard
          </button>
          <div style={{ marginLeft: "auto", fontSize: ".95em", opacity: 0.8 }}>
            {saving ? "Saving…" : "All changes saved"}
          </div>
        </div>
      </form>

      <div style={{ marginTop: "1.2rem", color: brand?.primaryColor }}>
        <strong>Your selected CDL Class:</strong>{" "}
        <span style={{ fontWeight: 600 }}>
          {getWalkthroughLabel?.(p.cdlClass) || <i>Not selected</i>}
        </span>
      </div>
    </div>
  );
}