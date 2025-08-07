import React, { useEffect, useState, useRef } from "react";
import { db, storage } from "../utils/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { showToast, markStudentProfileComplete, markStudentPermitUploaded, markStudentVehicleUploaded } from "../utils/ui-helpers";
import { getCurrentSchoolBranding } from "../utils/school-branding";
import { getWalkthroughLabel } from "../utils/walkthrough-data";

function getCurrentUserEmail() {
  return (
    window.currentUserEmail ||
    window.auth?.currentUser?.email ||
    localStorage.getItem("currentUserEmail") ||
    null
  );
}

function escapeHTML(str) {
  return (str || "").replace(
    /[&<>"'`]/g,
    (s) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "`": "&#96;",
      }[s])
  );
}

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

function getCdlClassLabel(classKey) {
  return getWalkthroughLabel(classKey);
}

const phonePattern = "[0-9\\-\\(\\)\\+ ]{10,15}";

const defaultUserData = {
  name: "",
  dob: "",
  profilePicUrl: "",
  cdlClass: "",
  endorsements: [],
  restrictions: [],
  experience: "",
  assignedCompany: "",
  assignedInstructor: "",
  cdlPermit: "",
  permitPhotoUrl: "",
  permitExpiry: "",
  driverLicenseUrl: "",
  licenseExpiry: "",
  medicalCardUrl: "",
  medCardExpiry: "",
  vehicleQualified: "",
  truckPlateUrl: "",
  trailerPlateUrl: "",
  emergencyName: "",
  emergencyPhone: "",
  emergencyRelation: "",
  waiverSigned: false,
  waiverSignature: "",
  course: "",
  schedulePref: "",
  scheduleNotes: "",
  paymentStatus: "",
  paymentProofUrl: "",
  profileProgress: 0,
  profileUpdatedAt: null,
  lastUpdatedBy: "",
  status: "active",
};

function calcProgress(fd, images) {
  let total = 15, filled = 0;
  if (fd.name) filled++;
  if (fd.dob) filled++;
  if (fd.profilePicUrl || images.profilePic) filled++;
  if (fd.cdlClass) filled++;
  if (fd.endorsements.length) filled++;
  if (fd.restrictions.length) filled++;
  if (fd.experience) filled++;
  if (fd.cdlPermit) filled++;
  if (fd.permitPhotoUrl || images.permitPhoto) filled++;
  if (fd.driverLicenseUrl || images.driverLicense) filled++;
  if (fd.medicalCardUrl || images.medicalCard) filled++;
  if (fd.vehicleQualified) filled++;
  if (fd.truckPlateUrl || images.truckPlate) filled++;
  if (fd.emergencyName && fd.emergencyPhone) filled++;
  if (fd.waiverSigned) filled++;
  return Math.round((filled / total) * 100);
}

const StudentProfile = () => {
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState({});
  const [userData, setUserData] = useState(defaultUserData);
  const [role, setRole] = useState("student");
  const [schoolId, setSchoolId] = useState("");
  const [progress, setProgress] = useState(0);
  const [images, setImages] = useState({});
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const email = getCurrentUserEmail();
      if (!email) {
        showToast("No user found. Please log in again.");
        navigate("/login");
        return;
      }
      try {
        const branding = (await getCurrentSchoolBranding?.()) || {};
        setBrand(branding);
        if (branding.primaryColor) {
          document.documentElement.style.setProperty("--brand-primary", branding.primaryColor);
        }
        const userSnap = await getDoc(doc(db, "users", email));
        if (!userSnap.exists()) {
          showToast("Profile not found.", 3500, "error");
          navigate("/student-dashboard");
          return;
        }
        const data = { ...defaultUserData, ...userSnap.data() };
        setUserData(data);
        setRole(data.role || "student");
        setSchoolId(data.schoolId || "");
        setProgress(data.profileProgress || 0);
        setStatus(data.status || "active");
        setLoading(false);
      } catch (err) {
        showToast("Error fetching profile.", 3500, "error");
        navigate("/student-dashboard");
      }
    })();
    // eslint-disable-next-line
  }, []);

  // --- File upload handler ---
  const handleFileChange = async (e, field, storagePath, checklistFn) => {
    const file = e.target.files[0];
    if (!file) return;
    const email = getCurrentUserEmail();
    try {
      const storageRef = ref(storage, `${storagePath}/${email}-${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", email), { [field]: url });
      setUserData((prev) => ({ ...prev, [field]: url }));
      setImages((prev) => ({ ...prev, [field]: file }));
      showToast(`${field.replace(/Url$/, "")} uploaded!`);
      if (typeof checklistFn === "function") await checklistFn(email);
    } catch (err) {
      showToast(`Failed to upload ${field}: ` + err.message, 3500, "error");
    }
  };

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target);
    // Emergency contact required
    if (
      !fd.get("emergencyName") ||
      !fd.get("emergencyPhone") ||
      !fd.get("emergencyRelation")
    ) {
      showToast("Please fill in all emergency contact fields.", 3300, "error");
      setSaving(false);
      return;
    }
    const newUser = {
      name: fd.get("name") || "",
      dob: fd.get("dob") || "",
      cdlClass: fd.get("cdlClass") || "",
      endorsements: fd.getAll("endorsements[]") || [],
      restrictions: fd.getAll("restrictions[]") || [],
      experience: fd.get("experience") || "",
      assignedCompany: fd.get("assignedCompany") || "",
      assignedInstructor: fd.get("assignedInstructor") || "",
      cdlPermit: fd.get("cdlPermit") || "",
      permitExpiry: fd.get("permitExpiry") || "",
      licenseExpiry: fd.get("licenseExpiry") || "",
      medCardExpiry: fd.get("medCardExpiry") || "",
      vehicleQualified: fd.get("vehicleQualified") || "",
      emergencyName: fd.get("emergencyName") || "",
      emergencyPhone: fd.get("emergencyPhone") || "",
      emergencyRelation: fd.get("emergencyRelation") || "",
      course: fd.get("course") || "",
      schedulePref: fd.get("schedulePref") || "",
      scheduleNotes: fd.get("scheduleNotes") || "",
      paymentStatus: fd.get("paymentStatus") || "",
      waiverSigned: fd.get("waiver") === "on",
      waiverSignature: fd.get("waiverSignature") || "",
      profileProgress: calcProgress(
        {
          ...userData,
          ...Object.fromEntries(fd),
        },
        images
      ),
      profileUpdatedAt: serverTimestamp(),
      lastUpdatedBy: getCurrentUserEmail(),
    };

    try {
      await updateDoc(doc(db, "users", getCurrentUserEmail()), newUser);
      await markStudentProfileComplete(getCurrentUserEmail());
      showToast("✅ Profile saved!");
      setUserData((prev) => ({ ...prev, ...newUser }));
      setProgress(newUser.profileProgress);
    } catch (err) {
      showToast("❌ Error saving: " + err.message, 3500, "error");
    } finally {
      setSaving(false);
    }
  };

  // Inactive
  if (!loading && status !== "active") {
    return (
      <div className="screen-wrapper fade-in profile-page" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h2>Profile Inactive</h2>
        <p>Your profile is currently inactive. Please contact your instructor or school admin for details.</p>
        <button className="btn outline" onClick={() => navigate("/student-dashboard")}>
          ⬅ Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading your profile…</p>
      </div>
    );
  }

  // ========== MAIN PROFILE FORM ==========
  return (
    <div className="screen-wrapper fade-in profile-page" style={{ maxWidth: 480, margin: "0 auto" }}>
      <h2 style={{ color: brand.primaryColor, display: "flex", alignItems: "center", gap: 12 }}>
        {brand.logoUrl && (
          <img
            src={brand.logoUrl}
            alt="School Logo"
            style={{ height: 36, borderRadius: 8, background: "#fff", marginRight: 3, boxShadow: "0 1px 5px #0001" }}
          />
        )}
        👤 Student Profile
        <span className="role-badge student" style={{ background: brand.primaryColor, color: "#fff" }}>Student</span>
        {brand.schoolName && (
          <span className="school-badge" style={{
            marginLeft: 5,
            padding: "2px 10px 2px 7px",
            background: brand.primaryColor + "18",
            borderRadius: 8,
            color: brand.primaryColor,
            fontSize: ".98em",
            verticalAlign: "middle"
          }}>
            {brand.schoolName}
          </span>
        )}
      </h2>
      <div style={{ fontSize: "0.99em", color: "#bbb", marginBottom: "0.5em" }}>
        <strong>Status:</strong> {status.charAt(0).toUpperCase() + status.slice(1)}
        {userData.profileUpdatedAt && (
          <> | <span>Last updated: {new Date(userData.profileUpdatedAt?.seconds ? userData.profileUpdatedAt.seconds * 1000 : userData.profileUpdatedAt).toLocaleString()}</span></>
        )}
      </div>
      <div className="progress-bar" style={{ marginBottom: "1.4rem" }}>
        <div className="progress" style={{ width: `${progress}%`, background: brand.primaryColor }} />
        <span className="progress-label">{progress}% Complete</span>
      </div>
      <form ref={formRef} id="profile-form" autoComplete="off" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        {/* Name */}
        <label htmlFor="name">Name:
          <input id="name" name="name" type="text" required defaultValue={userData.name} />
        </label>
        <label htmlFor="dob">Date of Birth:
          <input id="dob" name="dob" type="date" required defaultValue={userData.dob} />
        </label>
        <label htmlFor="profilePic">Profile Picture:
          <input id="profilePic" name="profilePic" type="file" accept="image/*"
            onChange={e => handleFileChange(e, "profilePicUrl", "profilePics", markStudentProfileComplete)} />
          {userData.profilePicUrl && <img src={userData.profilePicUrl} alt="Profile Picture" style={{ maxWidth: 70, marginTop: 5, borderRadius: 9 }} />}
        </label>
        <label htmlFor="cdlClass">CDL Class:
          <select id="cdlClass" name="cdlClass" required defaultValue={userData.cdlClass}>
            <option value="">Select</option>
            <option value="A">Class A</option>
            <option value="A-WO-AIR-ELEC">Class A w/o Air/Electric</option>
            <option value="A-WO-HYD-ELEC">Class A w/o Hydraulic/Electric</option>
            <option value="B">Class B</option>
            <option value="PASSENGER-BUS">Passenger Bus</option>
          </select>
        </label>
        {/* Endorsements */}
        <label>Endorsements:<br />
          {endorsementOptions.map(opt => (
            <label key={opt.val} style={{ marginRight: "1em" }}>
              <input type="checkbox" name="endorsements[]" value={opt.val} defaultChecked={userData.endorsements.includes(opt.val)} /> {opt.label}
            </label>
          ))}
        </label>
        {/* Restrictions */}
        <label>Restrictions:<br />
          {restrictionOptions.map(opt => (
            <label key={opt.val} style={{ marginRight: "1em" }}>
              <input type="checkbox" name="restrictions[]" value={opt.val} defaultChecked={userData.restrictions.includes(opt.val)} /> {opt.label}
            </label>
          ))}
        </label>
        {/* Experience */}
        <label htmlFor="experience">Experience:
          <select id="experience" name="experience" required defaultValue={userData.experience}>
            <option value="">Select</option>
            <option value="none">No Experience</option>
            <option value="1-2">1–2 Years</option>
            <option value="3-5">3–5 Years</option>
            <option value="6-10">6–10 Years</option>
            <option value="10+">10+ Years</option>
          </select>
        </label>
        <label htmlFor="assignedCompany">Current Employer:
          <input id="assignedCompany" name="assignedCompany" type="text" defaultValue={userData.assignedCompany} />
        </label>
        <label htmlFor="assignedInstructor">Assigned Instructor:
          <input id="assignedInstructor" name="assignedInstructor" type="text" defaultValue={userData.assignedInstructor} />
        </label>
        {/* CDL Permit */}
        <label htmlFor="cdlPermit">CDL Permit?
          <select id="cdlPermit" name="cdlPermit" required defaultValue={userData.cdlPermit}>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        {userData.cdlPermit === "yes" && (
          <>
            <label htmlFor="permitPhoto">Permit Photo:
              <input id="permitPhoto" name="permitPhoto" type="file" accept="image/*"
                onChange={e => handleFileChange(e, "permitPhotoUrl", "permits", markStudentPermitUploaded)} />
              {userData.permitPhotoUrl && <img src={userData.permitPhotoUrl} alt="Permit" style={{ maxWidth: 90, marginTop: 5, borderRadius: 8 }} />}
            </label>
            <label htmlFor="permitExpiry">Permit Expiry:
              <input id="permitExpiry" name="permitExpiry" type="date" defaultValue={userData.permitExpiry} />
            </label>
          </>
        )}
        {/* License */}
        <label htmlFor="driverLicense">Driver License Upload:
          <input id="driverLicense" name="driverLicense" type="file" accept="image/*"
            onChange={e => handleFileChange(e, "driverLicenseUrl", "licenses")} />
          {userData.driverLicenseUrl && <img src={userData.driverLicenseUrl} alt="License" style={{ maxWidth: 90, marginTop: 5, borderRadius: 8 }} />}
        </label>
        <label htmlFor="licenseExpiry">License Expiry:
          <input id="licenseExpiry" name="licenseExpiry" type="date" defaultValue={userData.licenseExpiry} />
        </label>
        {/* Medical Card */}
        <label htmlFor="medicalCard">Medical Card Upload:
          <input id="medicalCard" name="medicalCard" type="file" accept="image/*"
            onChange={e => handleFileChange(e, "medicalCardUrl", "medCards")} />
          {userData.medicalCardUrl && <img src={userData.medicalCardUrl} alt="Medical Card" style={{ maxWidth: 90, marginTop: 5, borderRadius: 8 }} />}
        </label>
        <label htmlFor="medCardExpiry">Medical Card Expiry:
          <input id="medCardExpiry" name="medCardExpiry" type="date" defaultValue={userData.medCardExpiry} />
        </label>
        {/* Vehicle Qualified */}
        <label htmlFor="vehicleQualified">Is Your Vehicle Qualified?
          <select id="vehicleQualified" name="vehicleQualified" required defaultValue={userData.vehicleQualified}>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        {userData.vehicleQualified === "yes" && (
          <>
            <label htmlFor="truckPlate">Truck Data Plate:
              <input id="truckPlate" name="truckPlate" type="file" accept="image/*"
                onChange={e => handleFileChange(e, "truckPlateUrl", "vehicle-plates", markStudentVehicleUploaded)} />
              {userData.truckPlateUrl && <img src={userData.truckPlateUrl} alt="Truck Plate" style={{ maxWidth: 90, marginTop: 5, borderRadius: 8 }} />}
            </label>
            <label htmlFor="trailerPlate">Trailer Data Plate:
              <input id="trailerPlate" name="trailerPlate" type="file" accept="image/*"
                onChange={e => handleFileChange(e, "trailerPlateUrl", "vehicle-plates", markStudentVehicleUploaded)} />
              {userData.trailerPlateUrl && <img src={userData.trailerPlateUrl} alt="Trailer Plate" style={{ maxWidth: 90, marginTop: 5, borderRadius: 8 }} />}
            </label>
          </>
        )}
        {/* Emergency Contact */}
        <label htmlFor="emergencyName">Emergency Contact Name:
          <input id="emergencyName" name="emergencyName" type="text" required defaultValue={userData.emergencyName} />
        </label>
        <label htmlFor="emergencyPhone">Emergency Contact Phone:
          <input id="emergencyPhone" name="emergencyPhone" type="tel" required pattern={phonePattern} defaultValue={userData.emergencyPhone} />
        </label>
        <label htmlFor="emergencyRelation">Emergency Contact Relation:
          <input id="emergencyRelation" name="emergencyRelation" type="text" required defaultValue={userData.emergencyRelation} />
        </label>
        <label htmlFor="waiver">Waiver Signed:
          <input id="waiver" name="waiver" type="checkbox" defaultChecked={userData.waiverSigned} />
        </label>
        <label htmlFor="waiverSignature">Waiver Signature:
          <input id="waiverSignature" name="waiverSignature" type="text" defaultValue={userData.waiverSignature} />
        </label>
        <label htmlFor="course">Course:
          <input id="course" name="course" type="text" defaultValue={userData.course} />
        </label>
        <label htmlFor="schedulePref">Schedule Preference:
          <input id="schedulePref" name="schedulePref" type="text" defaultValue={userData.schedulePref} />
        </label>
        <label htmlFor="scheduleNotes">Schedule Notes:
          <textarea id="scheduleNotes" name="scheduleNotes" defaultValue={userData.scheduleNotes} />
        </label>
        <label htmlFor="paymentStatus">Payment Status:
          <input id="paymentStatus" name="paymentStatus" type="text" defaultValue={userData.paymentStatus} />
        </label>
        <label htmlFor="paymentProof">Payment Proof Upload:
          <input id="paymentProof" name="paymentProof" type="file" accept="image/*"
            onChange={e => handleFileChange(e, "paymentProofUrl", "payments")} />
          {userData.paymentProofUrl && <img src={userData.paymentProofUrl} alt="Payment Proof" style={{ maxWidth: 90, marginTop: 5, borderRadius: 8 }} />}
        </label>
        <button className="btn primary wide" id="save-profile-btn" type="submit" style={{ background: brand.primaryColor, border: "none" }} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
        <button className="btn outline" type="button" onClick={() => navigate("/student-dashboard")}>⬅ Dashboard</button>
      </form>
      <div style={{ marginTop: "1.5rem", fontSize: "1em", color: brand.primaryColor }}>
        <strong>Your selected CDL Class:</strong>{" "}
        <span style={{ fontWeight: 600 }}>
          {getCdlClassLabel(userData.cdlClass) || <i>Not selected</i>}
        </span>
      </div>
    </div>
  );
};

export default StudentProfile;
