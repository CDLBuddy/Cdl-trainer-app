import React from "react";
export default function ChecklistReviewModal({ open=false, onClose=()=>{}, children }) {
  if (!open) return null;
  return (
    <div style="position:fixed;inset:0;background:#0009;display:flex;align-items:center;justify-content:center;">
      <div style="background:#fff;padding:16px;border-radius:10px;max-width:640px;width:92%;">
        <h3>Checklist Review</h3>
        <div>{children || "Coming soon…"}</div>
        <button onClick={onClose} style={{marginTop:12}}>Close</button>
      </div>
    </div>
  );
}
