#!/usr/bin/env node
// cdl-trainer-app/dev-utils/check-walkthroughs.mjs
// ============================================================================
// Walkthrough validator (dev/CI).
// Usage:
//   node cdl-trainer-app/dev-utils/check-walkthroughs.mjs
//   node cdl-trainer-app/dev-utils/check-walkthroughs.mjs <schoolId> <classType>
//   node cdl-trainer-app/dev-utils/check-walkthroughs.mjs --school=<id> --class=<type>
// Examples:
//   node cdl-trainer-app/dev-utils/check-walkthroughs.mjs browning-mountain class-a
//   node cdl-trainer-app/dev-utils/check-walkthroughs.mjs --school=bm --class=class-b
// ============================================================================

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Project root (dev-utils sits under /cdl-trainer-app)
const root = path.resolve(__dirname, '..');

// Paths into src/
const indexPath  = path.join(root, 'src', 'walkthrough-data', 'index.js');
const utilPath   = path.join(root, 'src', 'walkthrough-data', 'utils', 'validateWalkthroughs.js');
const loaderPath = path.join(root, 'src', 'walkthrough-data', 'loaders', 'resolveWalkthrough.js'); // <- your new location

// Pretty helpers
const hr  = () => console.log('--'.repeat(72));
const ok  = (s) => `\x1b[32m${s}\x1b[0m`;
const bad = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

// Parse args (positional or --flags)
function parseArgs(argv) {
  const out = { school: null, klass: null };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--school=')) out.school = a.split('=')[1];
    else if (a.startsWith('--class=')) out.klass = a.split('=')[1];
    else if (!out.school) out.school = a;
    else if (!out.klass) out.klass = a;
  }
  return out;
}

async function main() {
  // Dynamic imports (no Vite needed)
  const { default: defaultsIndex } = await import(pathToFileURL(indexPath));
  const { validateAllWalkthroughs, validateWalkthrough } = await import(pathToFileURL(utilPath));

  console.log(dim(`root: ${root}`));
  console.log(dim(`defaults: ${indexPath}`));
  hr();

  // 1) Validate DEFAULTS map
  console.log('Validating DEFAULT walkthroughs…');
  const res = validateAllWalkthroughs(defaultsIndex);
  for (const [name, r] of Object.entries(res.results)) {
    if (r.ok) {
      console.log(` ${ok('✓')} ${name}`);
    } else {
      console.log(` ${bad('✗')} ${name}  (${r.problems.length} problems)`);
      for (const p of r.problems) console.log('   •', p);
    }
  }
  hr();

  let exitBad = !res.ok;

  // 2) Optionally validate a custom (school) set via the resolver
  const { school, klass } = parseArgs(process.argv);
  if (school && klass) {
    console.log(`Checking custom walkthrough via resolver: school="${school}" class="${klass}"`);
    const { resolveWalkthrough } = await import(pathToFileURL(loaderPath));
    try {
      const custom = await resolveWalkthrough({
        classType: klass,
        schoolId: school,
        preferCustom: true,
      });

      if (!custom) {
        console.log(` ${bad('!')} No custom walkthrough found (or load failed).`);
      } else {
        const single = validateWalkthrough(`${klass} (custom:${school})`, custom);
        if (single.ok) {
          console.log(` ${ok('✓')} Custom walkthrough structure looks good.`);
        } else {
          console.log(` ${bad('✗')} Custom walkthrough has ${single.problems.length} issue(s):`);
          for (const p of single.problems) console.log('   •', p);
          exitBad = true;
        }
      }
    } catch (e) {
      console.log(` ${bad('✗')} Resolver threw:`, e?.message || e);
      exitBad = true;
    }
    hr();
  } else if (school || klass) {
    console.log(dim('Tip: provide both <schoolId> and <classType> to validate a custom set.'));
  }

  // Exit code for CI
  if (exitBad) {
    console.log(bad('Walkthrough validation failed.'));
    process.exit(1);
  } else {
    console.log(ok('All walkthroughs look good! 🎉'));
    process.exit(0);
  }
}

main().catch((e) => {
  console.error(bad('Fatal error:'), e?.stack || e);
  process.exit(1);
});