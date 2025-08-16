// src/walkthrough-data/defaults/walkthrough-class-b.js
// =============================================================================
// CDL Class B — Full Pre-Trip Walkthrough
// Browning Mountain Training (default profile)
// =============================================================================

/** Belt-and-suspenders immutability */
function deepFreeze(o) {
  if (!o || typeof o !== 'object' || Object.isFrozen(o)) return o
  Object.freeze(o)
  for (const k of Object.keys(o)) {
    const v = o[k]
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v)
  }
  return o
}

const walkthroughClassB = {
  id: 'walkthrough-class-b',
  classCode: 'B',
  label: 'Class B (Full)',
  version: 1,
  source: 'Browning Mountain Training — default',

  sections: [
    /* --------------------------- Engine Compartment --------------------------- */
    {
      section: 'Engine Compartment',
      critical: true,
      steps: [
        {
          label: 'Oil Level',
          script: 'Check oil level with dipstick—should be within safe operating range.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Coolant Level',
          script: 'Check coolant level in the reservoir is at or above minimum mark.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Power Steering Fluid',
          script: 'Check power steering fluid is within safe range.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Leaks & Hoses',
          script: 'Look for leaks or puddles under the engine and inspect hoses for cracks or leaks.',
          mustSay: true,
        },
        {
          label: 'Belts',
          script: 'Inspect alternator and water pump belts for cracks, frays, or improper tension.',
        },
      ],
    },

    /* ------------------------------ Steering System --------------------------- */
    {
      section: 'Steering System',
      steps: [
        {
          label: 'Steering Box & Hoses',
          script: 'Steering box securely mounted and not leaking. Hoses not cracked or leaking.',
        },
        {
          label: 'Steering Linkage',
          script: 'No worn, cracked, or loose components in the linkage.',
        },
      ],
    },

    /* ----------------------------- Front Suspension --------------------------- */
    {
      section: 'Front Suspension',
      steps: [
        {
          label: 'Springs/Shocks',
          script: 'Springs and shock absorbers not cracked or leaking. Mounts secure.',
        },
        {
          label: 'Spring Mounts & U-Bolts',
          script: 'Spring mounts and U-Bolts are not cracked or broken.',
        },
      ],
    },

    /* -------------------------------- Front Brakes ---------------------------- */
    {
      section: 'Front Brakes',
      critical: true,
      steps: [
        { label: 'Brake Hoses/Lines', script: 'Inspect for leaks, cracks, or wear.', tags: ['air-brake'] },
        { label: 'Brake Chamber', script: 'Chamber securely mounted and not leaking.', tags: ['air-brake'] },
        {
          label: 'Slack Adjuster/Pushrod',
          script:
            'With brakes released and pulled by hand, pushrod should not move more than 1 inch.',
          mustSay: true,
          required: true,
          passFail: true,
          tags: ['air-brake'],
        },
        {
          label: 'Drum/Linings',
          script: 'Drum and linings have no cracks, excessive wear, or dangerously thin linings.',
          tags: ['air-brake'],
        },
      ],
    },

    /* ---------------------------- Front Wheel / Tire -------------------------- */
    {
      section: 'Front Wheel/Tire',
      steps: [
        {
          label: 'Tire Condition',
          script:
            'Tire tread evenly worn, at least 4/32” on steer tires, with no cuts or bulges.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Rims', script: 'Rims have no cracks or illegal welds.' },
        { label: 'Lug Nuts', script: 'All lug nuts present, not loose, and no rust trails.' },
        { label: 'Hub Oil Seal', script: 'Hub oil seal not leaking and oil level adequate.' },
        { label: 'Valve Stem', script: 'Valve stem not missing, broken, or leaking.' },
      ],
    },

    /* ------------------------------- Side of Vehicle -------------------------- */
    {
      section: 'Side of Vehicle',
      steps: [
        { label: 'Doors & Hinges', script: 'Doors open/close properly; hinges secure and seal intact.' },
        { label: 'Mirror Brackets', script: 'Mirror brackets securely mounted, not damaged.' },
        { label: 'Fuel Tank/Cap/Leaks', script: 'Fuel tank secure, not leaking, and cap tight.' },
        { label: 'Battery/Box', script: 'Battery box secure, connections tight, no corrosion.' },
        { label: 'Catwalk/Steps', script: 'Catwalk and steps solid, clear of objects, and securely mounted.' },
      ],
    },

    /* ------------------------------- Rear Suspension -------------------------- */
    {
      section: 'Rear Suspension',
      steps: [
        { label: 'Springs/Shocks', script: 'Springs and shocks not missing, broken, or leaking. Mounts secure.' },
        { label: 'Torque Arm', script: 'Torque arm not cracked or broken; securely mounted.' },
        { label: 'Air Bags (if equipped)', script: 'Air bags not leaking, mounted securely, not damaged.', tags: ['air-brake'] },
      ],
    },

    /* -------------------------------- Rear Brakes ----------------------------- */
    {
      section: 'Rear Brakes',
      critical: true,
      steps: [
        { label: 'Brake Hoses/Lines', script: 'Inspect for leaks, cracks, or wear.', tags: ['air-brake'] },
        { label: 'Brake Chamber', script: 'Chamber securely mounted and not leaking.', tags: ['air-brake'] },
        {
          label: 'Slack Adjuster/Pushrod',
          script:
            'With brakes released and pulled by hand, pushrod should not move more than 1 inch.',
          mustSay: true,
          required: true,
          passFail: true,
          tags: ['air-brake'],
        },
        { label: 'Drum/Linings', script: 'Drum and linings have no cracks, excessive wear, or dangerously thin linings.', tags: ['air-brake'] },
      ],
    },

    /* ------------------------------ Rear Wheels/Tires ------------------------- */
    {
      section: 'Rear Wheels/Tires',
      steps: [
        {
          label: 'Tire Condition',
          script: 'Tires have at least 2/32” tread, no cuts, bulges, or damage.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Rims', script: 'No cracks or illegal welds.' },
        { label: 'Lug Nuts', script: 'All lug nuts present, not loose, and no rust trails.' },
        { label: 'Axle Seal', script: 'Axle seal not leaking.' },
        { label: 'Valve Stem', script: 'Valve stem not missing, broken, or leaking.' },
        { label: 'Spacers/Budds (if equipped)', script: 'Spacers not bent, damaged, or rusted. Dual tires not touching.' },
      ],
    },

    /* ----------------------------- Lights / Reflectors ------------------------ */
    {
      section: 'Lights/Reflectors',
      steps: [
        { label: 'Reflectors', script: 'All reflectors and clearance lights correct color, clean, and not broken.' },
        { label: 'Tail/Turn/Brake Lights', script: 'Tail, turn, brake, and marker lights correct color and working.' },
        { label: 'License Plate Light', script: 'License plate light works and plate is secure.' },
      ],
    },

    /* --------------------------- Rear / Cargo / Body -------------------------- */
    {
      section: 'Rear of Vehicle / Cargo',
      steps: [
        { label: 'Cargo Doors', script: 'Doors open, close, and latch properly.' },
        { label: 'Lift/Hoist (if equipped)', script: 'Lift or hoist operates correctly; no missing or damaged parts.' },
        { label: 'Frame/Crossmembers', script: 'Frame and crossmembers not cracked, broken, or missing.' },
        { label: 'Floor', script: 'Floor is solid, not broken or sagging.' },
      ],
    },

    /* --------------------- In-Cab / Safe Start / Controls --------------------- */
    {
      section: 'In-Cab / Safe Start / Controls',
      critical: true,
      steps: [
        {
          label: 'Seat Belt',
          script: 'Seat belt is securely mounted, adjusts, and latches properly.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Safe Start',
          script: 'Before starting: clutch depressed, gearshift in neutral/park, parking brake applied.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Gauges', script: 'Check oil pressure, coolant temperature, and voltmeter for normal readings.' },
        { label: 'Lights/Horn/Wipers', script: 'Check operation of all lights, horn, wipers, and washers.' },
        { label: 'Heater/Defroster', script: 'Check heater and defroster for proper function.' },
        { label: 'Mirrors', script: 'Mirrors are clean, properly adjusted, and securely mounted.' },
        {
          label: 'Emergency Equipment',
          script: 'I have spare electrical fuses (if equipped), three red reflective triangles, and a fire extinguisher.',
        },
        {
          label: 'Parking Brake Check',
          script: 'With parking brake applied, gently pull against it in low gear to ensure it holds.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Air Brake Check (if equipped)',
          script: `Perform three-point air brake check:
1) With engine off/key on, release parking brake and fully apply foot brake—air pressure drop should not exceed 3 psi in one minute.
2) Fan brakes to low air warning—warning light/buzzer should activate at or above 60 psi.
3) Continue fanning brakes—spring brake should set between 20–45 psi.`,
          mustSay: true,
          required: true,
          passFail: true,
          tags: ['air-brake'],
        },
      ],
    },
  ],
}

deepFreeze(walkthroughClassB)

export default walkthroughClassB