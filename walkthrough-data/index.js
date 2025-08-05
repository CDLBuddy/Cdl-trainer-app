// walkthrough-data/index.js

// === WALKTHROUGH BARREL IMPORTS ===
import walkthroughClassAWoAirElec from './walkthrough-class-a-wo-air-elec.js';
import walkthroughClassAWoHydElec from './walkthrough-class-a-wo-hyd-elec.js';
import walkthroughClassA from './walkthrough-class-a.js';
import walkthroughClassB from './walkthrough-class-b.js';
import walkthroughPassengerBus from './walkthrough-passenger-bus.js';

// === BARREL EXPORTS ===
export {
  walkthroughClassAWoAirElec,
  walkthroughClassAWoHydElec,
  walkthroughClassA,
  walkthroughClassB,
  walkthroughPassengerBus,
};

// === WALKTHROUGH METADATA LIST ===
/**
 * Array of all supported walkthroughs.
 * Used for selection menus, admin tables, etc.
 */
export const allWalkthroughs = [
  { key: 'A', label: 'Class A', data: walkthroughClassA },
  {
    key: 'A-WO-AIR-ELEC',
    label: 'Class A w/o Air/Electric',
    data: walkthroughClassAWoAirElec,
  },
  {
    key: 'A-WO-HYD-ELEC',
    label: 'Class A w/o Hydraulic/Electric',
    data: walkthroughClassAWoHydElec,
  },
  { key: 'B', label: 'Class B', data: walkthroughClassB },
  {
    key: 'PASSENGER-BUS',
    label: 'Passenger Bus',
    data: walkthroughPassengerBus,
  },
];

// === WALKTHROUGH LOOKUP MAP (advanced/faster lookup) ===
/**
 * Map of class keys to walkthrough data (for instant lookup).
 * Advanced: Use this if you need key → data without iteration.
 */
export const walkthroughMap = {
  A: walkthroughClassA,
  'A-WO-AIR-ELEC': walkthroughClassAWoAirElec,
  'A-WO-HYD-ELEC': walkthroughClassAWoHydElec,
  B: walkthroughClassB,
  'PASSENGER-BUS': walkthroughPassengerBus,
};

/**
 * Returns the walkthrough object for a given class key.
 * @param {string} className - The CDL class key (e.g., 'A', 'B', etc.)
 * @returns {object|null} The walkthrough data, or null if not found.
 */
export function getWalkthroughByClass(className) {
  // Prefer the map for O(1) lookup.
  return walkthroughMap[className] || null;
}

/**
 * Returns all supported walkthrough keys.
 * @returns {string[]}
 */
export function getAllWalkthroughKeys() {
  return Object.keys(walkthroughMap);
}

/**
 * Returns walkthrough label by key, or the key itself if missing.
 * @param {string} className
 * @returns {string}
 */
export function getWalkthroughLabel(className) {
  const found = allWalkthroughs.find((w) => w.key === className);
  return found ? found.label : className;
}
