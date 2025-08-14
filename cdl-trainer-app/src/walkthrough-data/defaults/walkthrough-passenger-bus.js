// src/walkthrough-data/defaults/walkthrough-passenger-bus.js
// =============================================================================
// CDL Passenger Bus — Full Pre-Trip Walkthrough (Default)
// Browning Mountain Training (baseline profile)
// Schema: export default { id, classCode, label, version, source, sections[] }
// - Section: { section, critical?, passFail?, steps[] }
// - Step:    { label?, script, mustSay?, required?, passFail?, skip? }
// =============================================================================

const walkthroughPassengerBus = {
  id: 'walkthrough-passenger-bus',
  classCode: 'PASSENGER-BUS',
  label: 'Passenger Bus (Full)',
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
          script: 'Check engine oil level with the dipstick—oil must be within the safe operating range.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Coolant Level',
          script: 'Verify coolant is at proper level in the reservoir and cap is secure.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Power Steering Fluid',
          script: 'Confirm power steering fluid is at the proper level.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Leaks & Hoses',
          script: 'Look for leaks/puddles under the engine and inspect all hoses for leaks, cracks, or wear.',
          mustSay: true,
        },
        {
          label: 'Belts',
          script: 'Inspect belts for proper tension; no cracks, frays, or glazing.',
        },
      ],
    },

    /* ------------------------------ Steering System --------------------------- */
    {
      section: 'Steering System',
      steps: [
        {
          label: 'Steering Box & Hoses',
          script: 'Steering box securely mounted, not leaking; hoses intact with no leaks.',
        },
        {
          label: 'Steering Linkage',
          script: 'No worn, cracked, or loose linkage components; joints and sockets tight.',
        },
      ],
    },

    /* ----------------------------- Front Suspension --------------------------- */
    {
      section: 'Front Suspension',
      steps: [
        {
          label: 'Springs/Shocks',
          script: 'Springs and shocks not missing, broken, or leaking; mounts secure.',
        },
        {
          label: 'Spring Mounts & U-Bolts',
          script: 'Spring mounts and U-bolts not cracked or broken; hardware present.',
        },
      ],
    },

    /* -------------------------------- Front Brakes ---------------------------- */
    {
      section: 'Front Brakes',
      critical: true,
      steps: [
        { label: 'Brake Hoses/Lines', script: 'Inspect for leaks, cracks, or wear.' },
        { label: 'Brake Chamber', script: 'Chamber securely mounted and not leaking.' },
        {
          label: 'Slack Adjuster/Pushrod',
          script: 'With brakes released, pushrod should not move more than 1 inch by hand.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Drum/Linings', script: 'No cracks, excessive wear, or dangerously thin linings.' },
      ],
    },

    /* ---------------------------- Front Wheels / Tires ------------------------ */
    {
      section: 'Front Wheels/Tires',
      steps: [
        {
          label: 'Tire Condition',
          script: 'Tread evenly worn, at least 4/32” on steer tires; no cuts or bulges.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Rims', script: 'No cracks, bends, or illegal welds.' },
        { label: 'Lug Nuts', script: 'All present, not loose; no rust trails or shiny threads.' },
        { label: 'Hub Oil Seal', script: 'No leaks; oil level adequate.' },
        { label: 'Valve Stem', script: 'Not missing, broken, or leaking; cap present.' },
      ],
    },

    /* ------------------------------- Side & Entry ----------------------------- */
    {
      section: 'Side & Entry',
      steps: [
        {
          label: 'Entry Door',
          script: 'Entry door opens/closes properly; glass clean and not cracked.',
          mustSay: true,
          required: true,
        },
        { label: 'Hand Rails & Steps', script: 'Hand rails secure; steps clear, non-slip, and undamaged.' },
        { label: 'Mirrors', script: 'Exterior mirrors securely mounted, clean, and properly adjusted.' },
        { label: 'Fuel Tank/Cap/Leaks', script: 'Tank secure, cap tight, and no leaks.' },
        {
          label: 'Emergency Exits (Exterior)',
          script: 'All emergency exits clearly labeled and operable from outside.',
          mustSay: true,
          required: true,
        },
        { label: 'Reflectors & Lights', script: 'Reflectors/clearance lights correct color, clean, and working.' },
      ],
    },

    /* ------------------------------- Rear Suspension -------------------------- */
    {
      section: 'Rear Suspension',
      steps: [
        { label: 'Springs/Shocks', script: 'Not missing, broken, or leaking; mounts secure.' },
        { label: 'Torque Arm', script: 'Not cracked, broken, or loose; securely mounted.' },
        { label: 'Air Bags (if equipped)', script: 'No leaks; properly mounted; bladders undamaged.' },
      ],
    },

    /* -------------------------------- Rear Brakes ----------------------------- */
    {
      section: 'Rear Brakes',
      critical: true,
      steps: [
        { label: 'Brake Hoses/Lines', script: 'Inspect for leaks, cracks, or wear.' },
        { label: 'Brake Chamber', script: 'Chamber securely mounted and not leaking.' },
        {
          label: 'Slack Adjuster/Pushrod',
          script: 'With brakes released, pushrod should not move more than 1 inch by hand.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Drum/Linings', script: 'No cracks, excessive wear, or dangerously thin linings.' },
      ],
    },

    /* ------------------------------ Rear Wheels / Tires ----------------------- */
    {
      section: 'Rear Wheels/Tires',
      steps: [
        {
          label: 'Tire Condition',
          script: 'At least 2/32” tread; no cuts, bulges, or other damage.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Rims', script: 'No cracks, bends, or illegal welds.' },
        { label: 'Lug Nuts', script: 'All present and tight; no rust trails.' },
        { label: 'Axle Seal', script: 'No leaks at axle seal.' },
        { label: 'Valve Stem', script: 'Not missing, broken, or leaking; cap present.' },
        { label: 'Spacers (if equipped)', script: 'Spacers not bent/damaged/rusted through; duals not touching.' },
      ],
    },

    /* ----------------------------- Lights / Reflectors ------------------------ */
    {
      section: 'Lights/Reflectors',
      steps: [
        { label: 'Rear Lights', script: 'Tail, turn, brake, and marker lights correct color and working.' },
        { label: 'Reflectors', script: 'All reflectors correct color, clean, and not broken.' },
        { label: 'License Plate Light', script: 'Plate light works; plate secure and legible.' },
      ],
    },

    /* --------------------------- Interior — Passenger Area -------------------- */
    {
      section: 'Interior — Passenger Area',
      critical: true,
      steps: [
        {
          label: 'Seats & Aisles',
          script: 'All seats securely fastened; aisles clear; no damage or tripping hazards.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Emergency Equipment',
          script: 'Fire extinguisher, first-aid kit, and three reflective triangles present and secure.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Emergency Exits (Interior)',
          script: 'Check windows/roof hatches/rear door operate properly; buzzers/labels present.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Passenger Entry', script: 'Stairwell clear; step light works.' },
        { label: 'Interior Lighting & Buzzers', script: 'All interior lights and warning buzzers function.' },
      ],
    },

    /* --------------------- In-Cab / Safe Start / Controls --------------------- */
    {
      section: 'In-Cab / Safe Start / Controls',
      critical: true,
      steps: [
        {
          label: 'Seat Belt',
          script: 'Seat belt securely mounted, adjusts, and latches properly.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Safe Start',
          script: 'Parking brake applied; gear in neutral/park; clutch depressed if manual before start.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Gauges', script: 'Oil pressure, coolant temp, air pressure, and voltmeter in normal ranges.' },
        { label: 'Lights/Horn/Wipers', script: 'All exterior lights, horn, wipers, and washers operate.' },
        { label: 'Heater/Defroster', script: 'Heater and defroster function correctly.' },
        { label: 'Mirrors', script: 'Mirrors clean, properly adjusted, and secure.' },
        {
          label: 'Parking Brake Check',
          script: 'With parking brake applied, gently pull in low gear to ensure it holds.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Air Brake Check (if equipped)',
          script: `Perform air brake three-point check:
1) Engine off/key on; release parking brake; fully apply foot brake — air loss ≤ 3 psi in 1 minute.
2) Fan brakes to low air warning — light/buzzer activates at or above 60 psi.
3) Continue fanning — spring brake sets between 20–45 psi.`,
          mustSay: true,
          required: true,
          passFail: true,
        },
      ],
    },
  ],
}

export default walkthroughPassengerBus