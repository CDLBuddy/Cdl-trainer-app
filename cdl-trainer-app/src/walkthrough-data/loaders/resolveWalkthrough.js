// src/loaders/resolveWalkthrough.js
// ============================================================================
// Loader: resolveWalkthrough
// Centralized utility for fetching the correct walkthrough data
// for a given CDL class, supporting both built-in and custom school-provided sets.
// ============================================================================

import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/utils/firebase.js';
import { showToast } from '@/utils/ui-helpers.js';
import defaultWalkthroughs from '@/walkthrough-data/index.js';

/**
 * Resolve the walkthrough configuration for a given class type.
 *
 * @param {Object} opts
 * @param {string} opts.classType - CDL class type (e.g., "class-a", "class-b", "passenger-bus").
 * @param {string} [opts.schoolId] - Optional school ID to fetch custom walkthroughs.
 * @param {boolean} [opts.preferCustom=true] - If true, attempts custom before falling back.
 * @returns {Promise<Object|null>} The resolved walkthrough data or null if unavailable.
 */
export async function resolveWalkthrough({ classType, schoolId, preferCustom = true }) {
  if (!classType) {
    console.warn('[resolveWalkthrough] Missing classType parameter.');
    return null;
  }

  const normalizedType = String(classType).trim().toLowerCase();

  // 1. Try custom school-specific walkthrough first
  if (preferCustom && schoolId) {
    try {
      const docRef = doc(db, 'schools', schoolId, 'walkthroughs', normalizedType);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.steps?.length) {
          console.warn(`[resolveWalkthrough] Loaded custom walkthrough for ${normalizedType} from school ${schoolId}.`);
          return data;
        } else {
          console.warn(`[resolveWalkthrough] Custom walkthrough for ${normalizedType} is empty or malformed.`);
        }
      } else {
        console.warn(`[resolveWalkthrough] No custom walkthrough found for ${normalizedType} at school ${schoolId}.`);
      }
    } catch (error) {
      console.error(`[resolveWalkthrough] Error fetching custom walkthrough:`, error);
      showToast('Failed to load custom walkthrough. Using default.', 'warning');
    }
  }

  // 2. Fall back to default built-in walkthrough
  if (defaultWalkthroughs[normalizedType]) {
    console.warn(`[resolveWalkthrough] Using default walkthrough for ${normalizedType}.`);
    return defaultWalkthroughs[normalizedType];
  }

  // 3. Nothing found
  console.error(`[resolveWalkthrough] No walkthrough found for type "${normalizedType}".`);
  showToast(`Walkthrough for ${classType} not available.`, 'error');
  return null;
}