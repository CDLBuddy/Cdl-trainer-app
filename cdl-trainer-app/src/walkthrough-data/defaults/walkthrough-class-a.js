// src/walkthrough-data/defaults/walkthrough-class-a.js
// =============================================================================
// CDL Class A — Full Pre-Trip Walkthrough (Air + Hydraulic + Electric lines)
// Browning Mountain Training (default profile)
// Schema: export default { id, classCode, label, version, source, sections[] }
// - Section: { section, critical?, passFail?, steps[] }
// - Step:    { label?, script, mustSay?, required?, passFail?, skip? }
// =============================================================================

const walkthroughClassA = {
  id: 'walkthrough-class-a',
  classCode: 'A',
  label: 'Class A (Full — Air/Hydraulic/Electric)',
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
          script:
            'I would check the oil level using the dipstick. Oil should be within the safe operating range.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Coolant Level',
          script:
            'I would check the coolant level in the reservoir, ensuring it is at or above the minimum mark.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Power Steering Fluid',
          script:
            'I would check the power steering fluid level, ensuring it is within the safe range.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Leaks and Hoses',
          script:
            'Look for leaks or puddles under the engine and inspect hoses for cracks, leaks, or wear.',
          mustSay: true,
        },
        {
          label: 'Belts',
          script:
            'Inspect the alternator and water pump belts for cracks, frays, or loose tension.',
        },
      ],
    },

    /* ------------------------------ Steering Sys ----------------------------- */
    {
      section: 'Steering System',
      steps: [
        {
          label: 'Steering Box & Hoses',
          script:
            'Check that the steering box is securely mounted, not leaking, and that hoses are not cracked or leaking.',
        },
        {
          label: 'Steering Linkage',
          script:
            'Check that the steering linkage is not worn or cracked. All connecting links, arms, and rods should not be worn or loose. Joints and sockets should not be worn or loose.',
        },
      ],
    },

    /* --------------------------- Front Suspension ---------------------------- */
    {
      section: 'Front Suspension',
      steps: [
        {
          label: 'Springs/Shocks',
          script:
            'Inspect the springs and shock absorbers for cracks, breaks, and leaks. Mounts should be secure.',
        },
        {
          label: 'Spring Mounts & U-Bolts',
          script:
            'Check that the spring mounts and U-bolts are secure, not cracked or broken.',
        },
      ],
    },

    /* ------------------------------ Front Brakes ----------------------------- */
    {
      section: 'Front Brake (Air)',
      critical: true,
      steps: [
        { label: 'Brake Hoses/Lines', script: 'Inspect hoses and lines for leaks, cracks, or wear.' },
        { label: 'Brake Chamber', script: 'Check that the brake chamber is securely mounted and not leaking.' },
        {
          label: 'Slack Adjuster/Pushrod',
          script:
            'With the brakes released and pulled by hand, the pushrod should not move more than 1 inch. Slack adjuster and pushrod should be secure.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Drum/Linings',
          script:
            'Check the brake drum and linings for cracks, excessive wear, and ensure linings are not dangerously thin.',
        },
      ],
    },

    /* ---------------------------- Front Wheel/Tire ---------------------------- */
    {
      section: 'Front Wheel/Tire',
      steps: [
        {
          label: 'Tire Condition',
          script:
            'Check that tire tread is evenly worn, has at least 4/32” tread depth on steer tires, and no cuts or bulges.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Rims', script: 'Check rims for cracks or illegal welds.' },
        { label: 'Lug Nuts', script: 'All lug nuts should be present, not loose, and have no rust trails.' },
        { label: 'Hub Oil Seal', script: 'Check the hub oil seal for leaks and that oil level is adequate.' },
        { label: 'Valve Stem', script: 'Valve stem and cap should not be missing, broken, or leaking.' },
      ],
    },

    /* ----------------------------- Driver/Fuel Area --------------------------- */
    {
      section: 'Driver/Fuel Area',
      steps: [
        { label: 'Door & Hinges', script: 'Check that the door opens and closes properly, hinges are secure, and seal is intact.' },
        { label: 'Mirror Brackets', script: 'Check that the mirror brackets are securely mounted and not damaged.' },
        { label: 'Fuel Tank/Cap/Leaks', script: 'Check that the fuel tank is secure, not leaking, and the cap is tight.' },
        { label: 'Battery/Box', script: 'Check that the battery/box is secure, connections are tight, and no corrosion.' },
        { label: 'Catwalk/Steps', script: 'Check that the catwalk and steps are solid, clear of objects, and securely bolted.' },
      ],
    },

    /* ----------------------- Coupling & Connection Lines ---------------------- */
    {
      section: 'Coupling & Connection Lines',
      steps: [
        {
          label: 'Air Lines',
          script:
            'Check that air lines are not leaking, cracked, or worn. Glad hands are secure, not leaking, and have proper seals.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Electrical Line',
          script:
            'Check the electrical cord is firmly plugged in, not damaged, and secured to prevent dragging.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Hydraulic Line (if equipped)',
          script:
            'Inspect the hydraulic line for leaks, cracks, and that it is securely connected. (Skip if not equipped)',
        },
        { label: 'Support Bracket', script: 'Support brackets should be secure and not damaged.' },
      ],
    },

    /* ----------------------- Rear Axle / Trailer Suspension ------------------- */
    {
      section: 'Rear Axle/Trailer Suspension',
      steps: [
        { label: 'Springs/Shocks', script: 'Check that the springs and shocks are not missing, broken, or leaking. Mounts are secure.' },
        { label: 'Torque Arm', script: 'Check the torque arm for cracks or breaks and that it’s securely mounted.' },
        { label: 'Air Bags', script: 'Check airbags (if equipped) for leaks, secure mounting, and no damage.' },
      ],
    },

    /* ------------------------------ Rear Brakes ------------------------------- */
    {
      section: 'Rear Brakes (Air)',
      critical: true,
      steps: [
        { label: 'Brake Hoses/Lines', script: 'Check hoses and lines for leaks, cracks, or wear.' },
        { label: 'Brake Chamber', script: 'Check that the brake chamber is securely mounted and not leaking.' },
        {
          label: 'Slack Adjuster/Pushrod',
          script:
            'With brakes released and pulled by hand, the pushrod should not move more than 1 inch. Slack adjuster and pushrod should be secure.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Drum/Linings',
          script:
            'Check the brake drum and linings for cracks, excessive wear, and that linings are not dangerously thin.',
        },
      ],
    },

    /* ----------------------------- Rear Wheels/Tires -------------------------- */
    {
      section: 'Rear Wheels/Tires',
      steps: [
        {
          label: 'Tire Condition',
          script:
            'Tires should have at least 2/32” tread depth, be evenly worn, with no cuts, bulges, or other damage.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Rims', script: 'Check for cracks or illegal welds.' },
        { label: 'Lug Nuts', script: 'All lug nuts should be present, not loose, and have no rust trails.' },
        { label: 'Axle Seal', script: 'Check the axle seal for leaks.' },
        { label: 'Valve Stem', script: 'Valve stem and cap should not be missing, broken, or leaking.' },
        { label: 'Spacers/Budds', script: 'If equipped, check spacers are not bent, damaged, or rusted through. Dual tires should not be touching.' },
      ],
    },

    /* ---------------------------- Lights / Reflectors ------------------------- */
    {
      section: 'Lights/Reflectors',
      steps: [
        { label: 'Reflectors', script: 'Check all reflectors and clearance lights for proper color, cleanliness, and that they are not broken.' },
        { label: 'Tail, Turn, Brake Lights', script: 'Check that all tail, turn signal, brake, and marker lights are the correct color and working.' },
        { label: 'License Plate Light', script: 'License plate light is clean, working, and plate is secure.' },
      ],
    },

    /* -------------------------------- Coupling -------------------------------- */
    {
      section: 'Trailer/Coupling',
      steps: [
        {
          label: 'Kingpin/Locking Jaws',
          script:
            'Check the kingpin and locking jaws for excessive wear, cracks, and that jaws are locked around the shank.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Apron', script: 'Apron should not be bent, cracked, or broken.' },
        { label: 'Mounting Bolts', script: 'Check that the mounting bolts are secure and not missing.' },
        { label: 'Fifth Wheel', script: 'Fifth wheel should be properly greased, securely mounted, and not cracked or broken.' },
        { label: 'Platform', script: 'Platform should not be cracked or broken and is properly secured.' },
        { label: 'Release Arm', script: 'Check that the release arm is secure and in the locked position.' },
        { label: 'Skid Plate', script: 'Skid plate should not be cracked, broken, or excessively worn.' },
        { label: 'Trailer Front/Rear', script: 'Check trailer front and rear for damage. Inspect all lights, reflectors, and DOT tape.' },
        { label: 'Landing Gear', script: 'Landing gear is fully raised, has no missing parts, is not bent or damaged, and the crank handle is secure.' },
        { label: 'Frame/Crossmembers', script: 'Frame and crossmembers should not be cracked, broken, or missing.' },
        { label: 'Floor', script: 'Floor should be solid, not broken or sagging.' },
        { label: 'Doors/Ties/Lift', script: 'Doors and ties/lift should open, close, and latch properly.' },
      ],
    },

    /* --------------------- In-Cab / Safe Start / Controls --------------------- */
    {
      section: 'In-Cab / Safe Start / Controls',
      critical: true,
      steps: [
        {
          label: 'Seat Belt',
          script:
            'Seat belt is securely mounted, adjusts, and latches properly.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Safe Start',
          script:
            'Before starting: clutch depressed, gearshift in neutral or park, parking brake applied.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Gauges', script: 'Check all gauges—oil pressure, coolant temperature, and voltmeter—for normal readings.' },
        { label: 'Lights/Horn/Wipers', script: 'Check operation of all lights, horn, windshield wipers, and washers.' },
        { label: 'Heater/Defroster', script: 'Heater and defroster should work properly.' },
        { label: 'Mirrors', script: 'Mirrors are clean, properly adjusted, and securely mounted.' },
        {
          label: 'Emergency Equipment',
          script:
            'I have spare electrical fuses (if equipped), three red reflective triangles, and a fire extinguisher.',
        },
        {
          label: 'Parking Brake Check',
          script:
            'With parking brake applied, gently pull against it in low gear to ensure it holds.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Air Brake Check',
          script: `I'll perform the three-point air brake check:
1) With engine off and key on, release parking brake and fully apply foot brake—observe air pressure drop; should not exceed 3 psi in one minute.
2) Fan brakes to low air warning—warning light/buzzer should activate at or above 60 psi.
3) Continue to fan brakes—spring brake (parking brake) should set between 20–45 psi.`,
          mustSay: true,
          required: true,
          passFail: true,
        },
      ],
    },
  ],
}

export default walkthroughClassA