// src/utils/ui-helpers.js

// --- DEBOUNCE
export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// --- FORMAT DATE
export function formatDate(dateInput) {
  if (!dateInput) return '-';
  let d = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// --- GET RANDOM AI TIP
export function getRandomAITip() {
  const tips = [
    "Remember to verbally state 'three-point brake check' word-for-word during your walkthrough exam!",
    "Use three points of contact when entering and exiting the vehicle.",
    "Take time to walk around your vehicle and inspect all lights before every trip.",
    "Keep your study streak alive for better memory retention!",
    "Ask your instructor for feedback after each practice test.",
    "When practicing pre-trip, say each step out loud--it helps lock it in.",
    "Focus on sections that gave you trouble last quiz. Practice makes perfect!",
    "Have your permit and ID ready before every test session.",
    "Use your checklist to track what you’ve mastered and what needs more review.",
  ];
  return tips[new Date().getDay() % tips.length];
}

// --- CHECKLIST ALERTS
export function getNextChecklistAlert(user = {}) {
  if (!user.cdlClass || !user.cdlPermit || !user.experience) {
    const missing = [];
    if (!user.cdlClass) missing.push('CDL class');
    if (!user.cdlPermit) missing.push('CDL permit status');
    if (!user.experience) missing.push('experience level');
    return `Complete your profile: ${missing.join(', ')}.`;
  }
  if (user.cdlPermit === 'yes' && !user.permitPhotoUrl) {
    return 'Upload a photo of your CDL permit.';
  }
  if (
    user.vehicleQualified === 'yes' &&
    (!user.truckPlateUrl || !user.trailerPlateUrl)
  ) {
    const which = [
      !user.truckPlateUrl ? 'truck' : null,
      !user.trailerPlateUrl ? 'trailer' : null,
    ]
      .filter(Boolean)
      .join(' & ');
    return `Upload your ${which} data plate photo${which.includes('&') ? 's' : ''}.`;
  }
  if (typeof user.lastTestScore === 'number' && user.lastTestScore < 80) {
    return 'Pass a practice test (80%+ required).';
  }
  if (!user.walkthroughProgress || user.walkthroughProgress < 1) {
    return 'Complete at least one walkthrough drill.';
  }
  return 'All required steps complete! 🎉';
}

// --- ROLE BADGE (as component!)
import React from 'react';
export function RoleBadge({ role }) {
  const label = (role || 'student').charAt(0).toUpperCase() + (role || 'student').slice(1);
  return <span className={`role-badge ${role}`}>{label}</span>;
}
