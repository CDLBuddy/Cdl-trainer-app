// src/walkthrough-data/defaults/walkthrough-class-a-wo-air-elec.js
// =============================================================================
// CDL Class A — Pre-Trip Walkthrough (WITHOUT Air/Electric Lines)
// Browning Mountain Training (default profile)
//
// Schema:
//   export default {
//     id, classCode, label, version, source,
//     sections: Array<{
//       section: string,
//       critical?: boolean,
//       passFail?: boolean,
//       steps: Array<{
//         label?: string,
//         script: string,
//         mustSay?: boolean,
//         required?: boolean,
//         passFail?: boolean,
//         skip?: boolean
//       }>
//     }>
//   }
//
// Notes:
// - Pure dataset object; the registry clones & deep-freezes at read time.
// - Uses straight quotes and consistent phrasing for easier parsing.
// =============================================================================

const walkthroughClassAWoAirElec = {
  id: 'walkthrough-class-a-wo-air-elec',
  classCode: 'A-WO-AIR-ELEC',
  label: 'Class A (No Air/Electric Lines)',
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
            'I would check the oil level using the dipstick. The oil should be within the safe operating range.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Coolant Level',
          script:
            'I would check the coolant level in the reservoir, making sure it is at or above the minimum mark.',
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
            'I would look for leaks or puddles under the engine and inspect hoses for cracks, leaks, or wear.',
          mustSay: true,
        },
        {
          label: 'Belts',
          script:
            'I would inspect the alternator and water pump belts for cracks, frays, or loose tension.',
        },
      ],
    },

    /* ------------------------------ Steering System -------------------------- */
    {
      section: 'Steering System',
      steps: [
        {
          label: 'Steering Box & Hoses',
          script:
            'I would check that the steering box is securely mounted, not leaking, and that the hoses are not cracked or leaking.',
        },
        {
          label: 'Steering Linkage',
          script:
            'I would check that the steering linkage is not worn or cracked. All connecting links, arms, and rods should not be worn or loose. Joints and sockets should not be worn or loose.',
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
            'I would inspect the springs and shock absorbers for cracks, breaks, and leaks. Mounts should be secure.',
        },
        {
          label: 'Spring Mounts & U-Bolts',
          script:
            'I would check that the spring mounts and U-bolts are secure, not cracked or broken.',
        },
      ],
    },

    /* -------------------------------- Front Brakes --------------------------- */
    {
      section: 'Front Brakes',
      critical: true,
      steps: [
        {
          label: 'Brake Hoses/Lines',
          script: 'I would inspect hoses and lines for leaks, cracks, or wear.',
        },
        {
          label: 'Brake Chamber',
          script:
            'I would check that the brake chamber is securely mounted and not leaking.',
        },
        {
          label: 'Slack Adjuster/Pushrod',
          script:
            'With the brakes released and pulled by hand, the pushrod should not move more than 1 inch. The slack adjuster and pushrod should be secure, not broken or missing parts.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Drum/Linings',
          script:
            'I would check the brake drum and linings for cracks, excessive wear, and that linings are not dangerously thin.',
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
            'I would check that the tire tread is evenly worn, has at least 4/32" tread depth on steer tires, and no cuts or bulges.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Rims', script: 'I would check rims for cracks or illegal welds.' },
        {
          label: 'Lug Nuts',
          script:
            'All lug nuts should be present, not loose, and have no rust trails.',
        },
        {
          label: 'Hub Oil Seal',
          script:
            'I would check the hub oil seal for leaks and that the oil level is adequate.',
        },
        {
          label: 'Valve Stem',
          script:
            'The valve stem and cap should not be missing, broken, or leaking.',
        },
      ],
    },

    /* ----------------------------- Driver/Fuel Area --------------------------- */
    {
      section: 'Driver/Fuel Area',
      steps: [
        {
          label: 'Door & Hinges',
          script:
            'I would check that the door opens and closes properly, hinges are secure, and the seal is intact.',
        },
        {
          label: 'Mirror Brackets',
          script:
            'I would check that the mirror brackets are securely mounted and not damaged.',
        },
        {
          label: 'Fuel Tank/Cap/Leaks',
          script:
            'I would check that the fuel tank is secure, not leaking, and the cap is tight.',
        },
        {
          label: 'Battery/Box',
          script:
            'I would check that the battery/box is secure, connections are tight, and there is no corrosion.',
        },
        {
          label: 'Catwalk/Steps',
          script:
            'I would check that the catwalk and steps are solid, clear of objects, and securely bolted.',
        },
      ],
    },

    /* ----------------------- Rear Axle / Trailer Suspension ------------------- */
    {
      section: 'Rear Axle/Trailer Suspension',
      steps: [
        {
          label: 'Springs/Shocks',
          script:
            'I would check that the springs and shocks are not missing, broken, or leaking, and the mounts are secure.',
        },
        {
          label: 'Torque Arm',
          script:
            'I would check the torque arm for cracks or breaks and that it’s securely mounted.',
        },
        {
          label: 'Air Bags (Skip)',
          script: 'This truck/trailer does not have air ride suspension.',
          skip: true,
        },
      ],
    },

    /* -------------------------------- Rear Brakes ----------------------------- */
    {
      section: 'Rear Brakes',
      critical: true,
      steps: [
        {
          label: 'Brake Hoses/Lines',
          script: 'I would check hoses and lines for leaks, cracks, or wear.',
        },
        {
          label: 'Brake Chamber',
          script:
            'I would check that the brake chamber is securely mounted and not leaking.',
        },
        {
          label: 'Slack Adjuster/Pushrod',
          script:
            'With brakes released and pulled by hand, the pushrod should not move more than 1 inch. Slack adjuster and pushrod should be secure, not broken or missing parts.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        {
          label: 'Drum/Linings',
          script:
            'I would check the brake drum and linings for cracks, excessive wear, and that linings are not dangerously thin.',
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
            'Tires should have at least 2/32" tread depth, be evenly worn, with no cuts, bulges, or other damage.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Rims', script: 'I would check for cracks or illegal welds.' },
        {
          label: 'Lug Nuts',
          script:
            'All lug nuts should be present, not loose, and have no rust trails.',
        },
        { label: 'Axle Seal', script: 'I would check the axle seal for leaks.' },
        {
          label: 'Valve Stem',
          script: 'Valve stem and cap should not be missing, broken, or leaking.',
        },
        {
          label: 'Spacers/Budds',
          script:
            'If equipped, check that spacers are not bent, damaged, or rusted through. Dual tires should not be touching.',
        },
      ],
    },

    /* ---------------------------- Lights / Reflectors ------------------------- */
    {
      section: 'Lights/Reflectors',
      steps: [
        {
          label: 'Reflectors',
          script:
            'I would check all reflectors and clearance lights for proper color, cleanliness, and that they are not broken.',
        },
        {
          label: 'Tail/Turn/Brake Lights',
          script:
            'I would check that all tail, turn signal, brake, and marker lights are the correct color and working.',
        },
        {
          label: 'License Plate Light',
          script: 'License plate light is clean, working, and the plate is secure.',
        },
      ],
    },

    /* --------------------- Trailer / Coupling (no air/electric) --------------- */
    {
      section: 'Trailer/Coupling (No Air/Electric)',
      steps: [
        {
          label: 'Kingpin/Locking Jaws',
          script:
            'I would check the kingpin and locking jaws for excessive wear, cracks, and that jaws are locked around the shank.',
          mustSay: true,
          required: true,
          passFail: true,
        },
        { label: 'Apron',           script: 'The apron should not be bent, cracked, or broken.' },
        { label: 'Mounting Bolts',  script: 'I would check that the mounting bolts are secure and not missing.' },
        {
          label: 'Fifth Wheel',
          script:
            'The fifth wheel should be properly greased, securely mounted, and not cracked or broken.',
        },
        { label: 'Platform',        script: 'The platform should not be cracked or broken and is properly secured.' },
        { label: 'Release Arm',     script: 'I would check that the release arm is secure and in the locked position.' },
        { label: 'Skid Plate',      script: 'The skid plate should not be cracked, broken, or excessively worn.' },
        {
          label: 'Trailer Front/Rear',
          script:
            'Check trailer front and rear for damage. Inspect all lights, reflectors, and DOT tape.',
        },
        {
          label: 'Landing Gear',
          script:
            'Landing gear is fully raised, has no missing parts, is not bent or damaged, and the crank handle is secure.',
        },
        { label: 'Frame/Crossmembers', script: 'The frame and crossmembers should not be cracked, broken, or missing.' },
        { label: 'Floor',               script: 'The floor should be solid, not broken or sagging.' },
        { label: 'Doors/Ties/Lift',     script: 'Doors and ties/lift should open, close, and latch properly.' },
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
        {
          label: 'Gauges',
          script:
            'I would check all gauges—oil pressure, coolant temperature, and voltmeter—for normal readings.',
        },
        {
          label: 'Lights/Horn/Wipers',
          script:
            'Check operation of all lights, horn, windshield wipers, and washers.',
        },
        { label: 'Heater/Defroster', script: 'Heater and defroster should work properly.' },
        { label: 'Mirrors',          script: 'Mirrors are clean, properly adjusted, and securely mounted.' },
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
      ],
    },
    // …add school-specific extras later via overlays
  ],
}

export default walkthroughClassAWoAirElec