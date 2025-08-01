// walkthrough-passenger-bus.js
// CDL Passenger Bus Full Pre-Trip Walkthrough
// Structure: [ { section, steps: [ { label, script, mustSay, required, passFail } ] } ]

export const walkthroughPassengerBus = [
  {
    section: "Engine Compartment",
    steps: [
      {
        label: "Oil Level",
        script: "Check engine oil level using the dipstick; oil must be within safe operating range.",
        mustSay: true,
        required: true,
      },
      {
        label: "Coolant Level",
        script: "Ensure coolant is at proper level in reservoir and cap is secure.",
        mustSay: true,
        required: true,
      },
      {
        label: "Power Steering Fluid",
        script: "Check power steering fluid is at proper level.",
        mustSay: true,
        required: true,
      },
      {
        label: "Leaks & Hoses",
        script: "Look for leaks or puddles under engine; inspect all hoses for leaks and cracks.",
        mustSay: true,
      },
      {
        label: "Belts",
        script: "Inspect belts for proper tension, no cracks or frays.",
      },
    ],
  },
  {
    section: "Steering System",
    steps: [
      {
        label: "Steering Box & Hoses",
        script: "Ensure steering box is securely mounted, not leaking, and hoses have no leaks.",
      },
      {
        label: "Steering Linkage",
        script: "No worn, cracked, or loose components in the steering linkage.",
      },
    ],
  },
  {
    section: "Front Suspension",
    steps: [
      {
        label: "Springs/Shocks",
        script: "Springs and shocks not missing, broken, or leaking. Mounts are secure.",
      },
      {
        label: "Spring Mounts/U-Bolts",
        script: "Check spring mounts and U-bolts for cracks, breaks, or looseness.",
      },
    ],
  },
  {
    section: "Front Brakes",
    steps: [
      {
        label: "Brake Hoses/Lines",
        script: "Inspect brake hoses and lines for cracks, leaks, or wear.",
      },
      {
        label: "Brake Chamber",
        script: "Brake chamber securely mounted, not leaking.",
      },
      {
        label: "Slack Adjuster/Pushrod",
        script: "With brakes released, pushrod should not move more than 1 inch by hand.",
        mustSay: true,
        required: true,
      },
      {
        label: "Drum/Linings",
        script: "Drum and linings have no cracks, excessive wear, or dangerously thin linings.",
      },
    ],
  },
  {
    section: "Front Wheels/Tires",
    steps: [
      {
        label: "Tire Condition",
        script: "Tread is evenly worn, at least 4/32” on steer tires, no cuts or bulges.",
        mustSay: true,
        required: true,
      },
      {
        label: "Rims",
        script: "No cracks, bends, or illegal welds on rims.",
      },
      {
        label: "Lug Nuts",
        script: "All lug nuts present, not loose, and no rust trails.",
      },
      {
        label: "Hub Oil Seal",
        script: "No leaks from hub oil seal, oil level adequate.",
      },
      {
        label: "Valve Stem",
        script: "Valve stem not missing, broken, or leaking.",
      },
    ],
  },
  {
    section: "Side & Entry",
    steps: [
      {
        label: "Entry Door",
        script: "Entry door opens and closes properly, glass clean and not cracked.",
        mustSay: true,
        required: true,
      },
      {
        label: "Hand Rails & Steps",
        script: "Hand rails are secure, steps are clear and not damaged.",
      },
      {
        label: "Mirrors",
        script: "All exterior mirrors are securely mounted, clean, and properly adjusted.",
      },
      {
        label: "Fuel Tank/Cap/Leaks",
        script: "Fuel tank secure, cap tight, no leaks.",
      },
      {
        label: "Emergency Exits",
        script: "All emergency exits function properly and are labeled.",
        mustSay: true,
        required: true,
      },
      {
        label: "Reflectors & Lights",
        script: "Reflectors and clearance lights are clean, correct color, and working.",
      },
    ],
  },
  {
    section: "Rear Suspension",
    steps: [
      {
        label: "Springs/Shocks",
        script: "Springs and shocks not missing, broken, or leaking; mounts secure.",
      },
      {
        label: "Torque Arm",
        script: "Torque arm not cracked, broken, or loose.",
      },
      {
        label: "Air Bags (if equipped)",
        script: "Air bags not leaking, properly mounted, no damage.",
      },
    ],
  },
  {
    section: "Rear Brakes",
    steps: [
      {
        label: "Brake Hoses/Lines",
        script: "Inspect for leaks, cracks, or wear.",
      },
      {
        label: "Brake Chamber",
        script: "Chamber is securely mounted and not leaking.",
      },
      {
        label: "Slack Adjuster/Pushrod",
        script: "With brakes released, pushrod should not move more than 1 inch by hand.",
        mustSay: true,
        required: true,
      },
      {
        label: "Drum/Linings",
        script: "Drum and linings have no cracks, excessive wear, or dangerously thin linings.",
      },
    ],
  },
  {
    section: "Rear Wheels/Tires",
    steps: [
      {
        label: "Tire Condition",
        script: "Tires have at least 2/32” tread, no cuts, bulges, or damage.",
        mustSay: true,
        required: true,
      },
      {
        label: "Rims",
        script: "No cracks, bends, or illegal welds.",
      },
      {
        label: "Lug Nuts",
        script: "All lug nuts present, not loose, no rust trails.",
      },
      {
        label: "Axle Seal",
        script: "Axle seal not leaking.",
      },
      {
        label: "Valve Stem",
        script: "Valve stem not missing, broken, or leaking.",
      },
      {
        label: "Spacers (if equipped)",
        script: "Spacers not bent, damaged, or rusted. Dual tires not touching.",
      },
    ],
  },
  {
    section: "Lights/Reflectors",
    steps: [
      {
        label: "Rear Lights",
        script: "Tail, turn, brake, and marker lights are correct color and working.",
      },
      {
        label: "Reflectors",
        script: "All reflectors are correct color, clean, and not broken.",
      },
      {
        label: "License Plate Light",
        script: "License plate light works and plate is secure.",
      },
    ],
  },
  {
    section: "Interior - Passenger Area",
    steps: [
      {
        label: "Seats & Aisles",
        script: "All seats securely fastened, aisles clear, no damage.",
        mustSay: true,
        required: true,
      },
      {
        label: "Emergency Equipment",
        script: "Fire extinguisher, first aid kit, and emergency reflectors are present and secure.",
        mustSay: true,
        required: true,
      },
      {
        label: "Emergency Exits (interior)",
        script: "Check all emergency exits (windows, roof hatches, rear door) for proper function and labeling.",
        mustSay: true,
        required: true,
      },
      {
        label: "Passenger Entry",
        script: "Stairwell is clear and step light works.",
      },
      {
        label: "Lighting & Signaling Devices",
        script: "All interior lights and buzzers function correctly.",
      },
    ],
  },
  {
    section: "In-Cab / Safe Start / Controls",
    steps: [
      {
        label: "Seat Belt",
        script: "Seat belt is securely mounted, adjusts, and latches properly.",
        mustSay: true,
        required: true,
      },
      {
        label: "Safe Start",
        script: "Before starting: parking brake applied, gearshift in neutral or park, clutch depressed if manual.",
        mustSay: true,
        required: true,
      },
      {
        label: "Gauges",
        script: "Check oil pressure, coolant temperature, air pressure, and voltmeter for normal readings.",
      },
      {
        label: "Lights/Horn/Wipers",
        script: "Check operation of all lights, horn, wipers, and washers.",
      },
      {
        label: "Heater/Defroster",
        script: "Check heater and defroster for proper function.",
      },
      {
        label: "Mirrors",
        script: "Mirrors are clean, properly adjusted, and securely mounted.",
      },
      {
        label: "Parking Brake Check",
        script: "With parking brake applied, gently pull against it in low gear to ensure it holds.",
        mustSay: true,
        required: true,
      },
      {
        label: "Air Brake Check (if equipped)",
        script: `Perform air brake check:
1. With engine off/key on, release parking brake and fully apply foot brake—air pressure drop should not exceed 3 psi in one minute.
2. Fan brakes to low air warning—warning light/buzzer activates at or above 60 psi.
3. Continue fanning brakes—spring brake should set between 20-45 psi.`,
        mustSay: true,
        required: true,
        passFail: true,
      },
    ],
  },
];

export default walkthroughPassengerBus;