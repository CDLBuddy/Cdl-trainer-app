import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage, auth } from "../utils/firebase";
import { getCurrentSchoolBranding } from "../utils/school-branding";
import { showToast } from "../utils/ui-helpers";
let jsPDF = null;

const PROFILE_FIELDS = [
  "name",
  "phone",
  "companyName",
  "companyAddress",
  "profilePicUrl",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelation",
  "adminWaiverSigned",
  "adminSignature",
];

const AdminProfile = () => {
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState({});
  const [userData, setUserData] = useState({});
  const [profilePercent, setProfilePercent] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("");
  const [saving, setSaving] = useState(false);

  // School/User IDs
  const currentUserEmail =
    auth?.currentUser?.email ||
    window.currentUserEmail ||
    localStorage.getItem("currentUserEmail") ||
    null;
  const currentSchoolId =
    window.schoolId || localStorage.getItem("schoolId") || null;

  // Refs for file inputs
  const profilePicInput = useRef();
  const logoInput = useRef();
  const complianceDocsInput = useRef();

  // Fetch profile on mount
  useEffect(() => {
    (async () => {
      if (!currentUserEmail || !currentSchoolId) return;
      setLoading(true);
      const brandObj = (await getCurrentSchoolBranding()) || {};
      setBrand(brandObj);

      // Fetch admin user data
      let data = {};
      let updated = "";
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", currentUserEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          data = snap.docs[0].data();
          updated = data.profileUpdatedAt || data.updatedAt || "";
        }
      } catch (e) {
        showToast("Failed to load admin profile.", 3500, "error");
      }
      // Security: Only admins in own school
      if (
        (data.role || "student") !== "admin" ||
        data.schoolId !== currentSchoolId
      ) {
        showToast("Access denied: Admin profile only.", 4200, "error");
        window.location.href = "/admin-dashboard";
        return;
      }
      setUserData(data);
      setLastUpdated(updated);
      // Completion %
      let completed = PROFILE_FIELDS.filter((f) => !!data[f]).length;
      setProfilePercent(
        Math.floor((completed / PROFILE_FIELDS.length) * 100)
      );
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, []);

  // File/image upload handler
  const handleUpload = async (file, path, updateField) => {
    try {
      const fileRef = storageRef(storage, `${path}/${currentUserEmail}-${Date.now()}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { [updateField]: downloadURL });
        showToast(`${updateField.replace(/Url$/, "")} uploaded!`);
        window.location.reload(); // Or refetch userData for SPA
      }
    } catch (err) {
      showToast(`Failed to upload ${updateField}: ${err.message}`, 4200, "error");
    }
  };

  // School logo upload handler
  const handleSchoolLogoUpload = async () => {
    const file = logoInput.current.files[0];
    if (!file) return showToast("Please select a logo file first.");
    if (!currentSchoolId) return showToast("School ID not found.");
    try {
      // Preview: update instantly (SPA, not with reload)
      // Upload logo to storage (for THIS school only)
      const ext = file.name.split(".").pop();
      const logoRef = storageRef(storage, `school-logos/${currentSchoolId}/logo.${ext}`);
      await uploadBytes(logoRef, file);
      const logoUrl = await getDownloadURL(logoRef);

      // Save to schools collection (central branding, scoped)
      await setDoc(doc(db, "schools", currentSchoolId), { logoUrl }, { merge: true });
      // Save also to admin user profile
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { companyLogoUrl: logoUrl });
      }
      showToast("School logo uploaded!");
      setBrand((b) => ({ ...b, logoUrl }));
    } catch (err) {
      showToast("Logo upload failed: " + err.message, 4200, "error");
    }
  };

  // Profile form submit
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target);

    // Emergency contact validation
    if (
      fd.get("emergencyContactName") ||
      fd.get("emergencyContactPhone") ||
      fd.get("emergencyContactRelation")
    ) {
      if (
        !fd.get("emergencyContactName") ||
        !fd.get("emergencyContactPhone") ||
        !fd.get("emergencyContactRelation")
      ) {
        showToast("Please complete all emergency contact fields.");
        setSaving(false);
        return;
      }
    }

    // Update object
    const updateObj = {
      name: fd.get("name"),
      phone: fd.get("phone"),
      companyName: fd.get("companyName"),
      companyAddress: fd.get("companyAddress"),
      adminNotes: fd.get("adminNotes"),
      emergencyContactName: fd.get("emergencyContactName"),
      emergencyContactPhone: fd.get("emergencyContactPhone"),
      emergencyContactRelation: fd.get("emergencyContactRelation"),
      adminWaiverSigned: !!fd.get("adminWaiverSigned"),
      adminSignature: fd.get("adminSignature"),
      profileUpdatedAt: serverTimestamp(),
    };

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, updateObj);
        // Add to admin logs
        await addDoc(collection(db, "adminLogs"), {
          admin: currentUserEmail,
          schoolId: currentSchoolId,
          update: updateObj,
          updatedAt: new Date().toISOString(),
        });
        localStorage.setItem("fullName", updateObj.name);
        showToast("✅ Profile saved!");
        setTimeout(() => window.location.reload(), 1200);
      } else throw new Error("User document not found.");
    } catch (err) {
      showToast("❌ Error saving: " + err.message, 4200, "error");
    }
    setSaving(false);
  };

  // PDF Export
  const handleDownloadPDF = async () => {
    if (!jsPDF) {
      const mod = await import("jspdf");
      jsPDF = mod.jsPDF;
    }
    const docPDF = new jsPDF();
    docPDF.setFontSize(15);
    docPDF.text(
      `${brand.schoolName || "CDL Trainer"} - Admin Profile`,
      10,
      20
    );
    docPDF.setFontSize(11);
    const lines = [
      `Name: ${userData.name}`,
      `Email: ${userData.email}`,
      `Phone: ${userData.phone}`,
      `Company Name: ${userData.companyName}`,
      `Company Address: ${userData.companyAddress}`,
      `Emergency Contact: ${userData.emergencyContactName || ""} (${userData.emergencyContactRelation || ""}) ${userData.emergencyContactPhone || ""}`,
      `Admin Waiver Signed: ${userData.adminWaiverSigned ? "Yes" : "No"}`,
      `Signature: ${userData.adminSignature || ""}`,
      `Notes: ${userData.adminNotes || ""}`,
    ];
    let y = 34;
    lines.forEach((line) => {
      docPDF.text(line, 10, y);
      y += 8;
    });
    docPDF.save(`admin-profile-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading profile…</p>
      </div>
    );

  return (
    <div className="screen-wrapper fade-in profile-page" style={{ maxWidth: 540, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
        <span style={{ fontSize: "1.35em", fontWeight: 500, color: brand.primaryColor || "#b48aff" }}>
          {brand.schoolName || "CDL Trainer"}
        </span>
        {brand.logoUrl && (
          <img src={brand.logoUrl} alt="School Logo" className="dashboard-logo" style={{ maxWidth: 90, verticalAlign: "middle", marginBottom: 3 }} />
        )}
      </header>
      <div className="dashboard-card" style={{ marginBottom: "1.3em", padding: "1em" }}>
        <b>
          Admin Profile Completion:{" "}
          <span style={{ color: profilePercent < 80 ? "#c50" : "#2c7" }}>
            {profilePercent}%
          </span>
        </b>
        <br />
        <small>
          Last updated:{" "}
          {lastUpdated
            ? new Date(
                lastUpdated.seconds
                  ? lastUpdated.seconds * 1000
                  : lastUpdated
              ).toLocaleString()
            : "(unknown)"}
        </small>
      </div>
      <h2>
        👤 Admin Profile <span className="role-badge admin">Admin</span>
      </h2>
      <form
        id="admin-profile-form"
        style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}
        onSubmit={handleProfileSave}
        autoComplete="off"
      >
        <label>
          Name:
          <input type="text" name="name" defaultValue={userData.name || ""} required />
        </label>
        <label>
          Email:
          <span style={{ userSelect: "all" }}>{userData.email}</span>
        </label>
        <label>
          Profile Picture:
          <input type="file" name="profilePic" ref={profilePicInput} accept="image/*"
            onChange={(e) => {
              if (!e.target.files?.length) return;
              handleUpload(e.target.files[0], "profilePics", "profilePicUrl");
            }} />
          {userData.profilePicUrl && (
            <img
              src={userData.profilePicUrl}
              alt="Profile Picture"
              style={{ maxWidth: 90, borderRadius: 12, display: "block", marginTop: 7 }}
            />
          )}
        </label>
        <label>
          Phone:
          <input type="tel" name="phone" defaultValue={userData.phone || ""} placeholder="(Optional)" />
        </label>
        <label>
          School / Company Name:
          <input type="text" name="companyName" defaultValue={userData.companyName || ""} />
        </label>
        <label>
          School Address:
          <input type="text" name="companyAddress" defaultValue={userData.companyAddress || ""} />
        </label>
        <div className="logo-upload-section">
          <label htmlFor="school-logo-upload">School/Brand Logo:</label>
          <input type="file" id="school-logo-upload" ref={logoInput} accept="image/*" />
          <img
            id="current-school-logo"
            src={brand.logoUrl || userData.companyLogoUrl || "/default-logo.svg"}
            alt="School Logo"
            style={{ height: 60, display: "block", margin: "12px 0" }}
          />
          <button type="button" className="btn outline small" style={{ marginBottom: 10 }} onClick={handleSchoolLogoUpload}>
            Upload Logo
          </button>
        </div>
        <label>
          Admin Notes / Memo:
          <textarea name="adminNotes" rows={2} defaultValue={userData.adminNotes || ""}></textarea>
        </label>
        <details>
          <summary>
            <strong>Emergency Contact</strong>
          </summary>
          <label>
            Name: <input type="text" name="emergencyContactName" defaultValue={userData.emergencyContactName || ""} />
          </label>
          <label>
            Phone: <input type="tel" name="emergencyContactPhone" defaultValue={userData.emergencyContactPhone || ""} />
          </label>
          <label>
            Relation: <input type="text" name="emergencyContactRelation" defaultValue={userData.emergencyContactRelation || ""} />
          </label>
        </details>
        <details>
          <summary>
            <strong>Compliance Documents</strong> (Insurance, Bonding, etc.)
          </summary>
          <label>
            Upload Document(s):
            <input
              type="file"
              name="complianceDocs"
              ref={complianceDocsInput}
              accept="image/*,application/pdf"
              onChange={(e) => {
                if (!e.target.files?.length) return;
                handleUpload(e.target.files[0], "complianceDocs", "complianceDocsUrl");
              }}
            />
            {userData.complianceDocsUrl && (
              <a href={userData.complianceDocsUrl} target="_blank" rel="noopener noreferrer">
                View
              </a>
            )}
          </label>
        </details>
        <label>
          <input type="checkbox" name="adminWaiverSigned" defaultChecked={!!userData.adminWaiverSigned} />
          I acknowledge the code of conduct and compliance requirements.
        </label>
        <label>
          Digital Signature:{" "}
          <input
            type="text"
            name="adminSignature"
            defaultValue={userData.adminSignature || ""}
            placeholder="Type or sign your name"
          />
        </label>
        <div style={{ display: "flex", gap: "1em" }}>
          <button className="btn primary wide" type="submit" style={{ background: brand.primaryColor || "#b48aff", border: "none" }} disabled={saving}>
            {saving ? "Saving…" : "💾 Save Profile"}
          </button>
          <button type="button" className="btn outline" onClick={handleDownloadPDF}>
            📄 Download PDF
          </button>
        </div>
        <button
          className="btn outline"
          type="button"
          style={{ marginTop: "0.5rem" }}
          onClick={() => (window.location.href = "/admin-dashboard")}
        >
          ⬅ Dashboard
        </button>
      </form>
    </div>
  );
};

export default AdminProfile;
