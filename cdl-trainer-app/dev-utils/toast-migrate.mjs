#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'src');
const WRITE = process.argv.includes('--write');

const exts = new Set(['.js', '.jsx']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git']);

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) await walk(path.join(dir, e.name), out);
    } else if (exts.has(path.extname(e.name))) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

function transform(text) {
  let updated = text;
  const changes = [];

  // Replace "import { showToast } from '@utils/ui-helpers'" -> '@components/toast-compat'
  const re1 = /import\s*\{\s*showToast\s*\}\s*from\s*['"]@utils\/ui-helpers(?:\.js)?['"];?/g;
  if (re1.test(updated)) {
    updated = updated.replace(re1, "import { showToast } from '@components/toast-compat';");
    changes.push("@utils/ui-helpers → @components/toast-compat");
  }

  // Replace relative imports to utils/ui-helpers → compat (for any ../../utils/ui-helpers ...)
  const re2 = /import\s*\{\s*showToast\s*\}\s*from\s*['"][.\/]+(?:[^'"]*?)utils\/ui-helpers(?:\.js)?['"];?/g;
  if (re2.test(updated)) {
    updated = updated.replace(re2, "import { showToast } from '@components/toast-compat';");
    changes.push("relative utils/ui-helpers → @components/toast-compat");
  }

  // Optional: Rewrite window.showToast / globalThis.showToast to direct shim call (but only if there’s no local binding)
  // This is conservative: we only touch obvious globals.
  const re3 = /(?:window|globalThis)\.showToast\s*\(/g;
  if (re3.test(updated) && !/import\s*\{\s*showToast\s*\}\s*from\s*['"][^'"]+['"]/.test(updated)) {
    updated = `import { showToast } from '@components/toast-compat';\n` + updated;
    updated = updated.replace(re3, 'showToast(');
    changes.push("window/globalThis.showToast → shim + import");
  }

  return { updated, changes };
}

const files = await walk(ROOT);
let count = 0;
for (const f of files) {
  const src = await fs.readFile(f, 'utf8');
  const { updated, changes } = transform(src);
  if (changes.length) {
    count += changes.length;
    console.log(`\n${path.relative(process.cwd(), f)}:`);
    for (const c of changes) console.log('  ' + c);

    if (WRITE) {
      await fs.copyFile(f, f + '.bak');
      await fs.writeFile(f, updated, 'utf8');
    }
  }
}

console.log(`\n${WRITE ? 'Applied' : 'Proposed'} ${count} change(s). Run with --write to apply.`);
