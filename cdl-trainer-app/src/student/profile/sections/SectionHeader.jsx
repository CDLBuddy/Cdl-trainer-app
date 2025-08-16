// src/student/profile/sections/SectionHeader.jsx
import React, { useMemo } from "react";

import styles from "./sections.module.css";

/**
 * @typedef {'complete'|'missing'|'pending-verify'} SectionStatus
 */

/**
 * SectionHeader
 * Displays a section title and a status chip.
 *
 * @param {{ 
 *  title: string, 
 *  status: SectionStatus, 
 *  verifiedBy?: string, 
 *  verifiedAt?: any 
 * }} props
 */
export default function SectionHeader({ title, status, verifiedBy, verifiedAt }) {
  const { chipClass, chipText } = useMemo(() => {
    switch (status) {
      case "complete":
        return { chipClass: `${styles.chip} ${styles.chipOk}`, chipText: "✅ Verified" };
      case "pending-verify":
        return { chipClass: `${styles.chip} ${styles.chipPending}`, chipText: "⏳ Awaiting verification" };
      default:
        return { chipClass: `${styles.chip} ${styles.chipWarn}`, chipText: "⚠ Missing info" };
    }
  }, [status]);

  const meta =
    status === "complete" && (verifiedBy || verifiedAt)
      ? `• ${verifiedBy ? `by ${verifiedBy}` : ""} ${formatWhen(verifiedAt)}`
      : "";

  return (
    <div className={styles.sectionHeader} role="heading" aria-level={2}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionMeta}>
        <span className={chipClass} aria-live="polite">
          {chipText}
        </span>
        {meta && <span className={styles.sectionSubtle}>{meta}</span>}
      </div>
    </div>
  );
}

/**
 * Format a date/timestamp softly for the meta line.
 * Accepts Date, Firestore Timestamp-like (with toDate()), or ISO string.
 */
function formatWhen(value) {
  if (!value) return "";
  try {
    const d =
      value?.toDate?.() instanceof Date
        ? value.toDate()
        : value instanceof Date
        ? value
        : new Date(value);
    if (Number.isNaN(+d)) return "";
    return `on ${d.toLocaleDateString()}`;
  } catch {
    return "";
  }
}
