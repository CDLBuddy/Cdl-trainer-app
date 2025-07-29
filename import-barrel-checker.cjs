// import-barrel-checker.cjs
const fs = require('fs');
const path = require('path');

// === Folders to check ===
const roleFolders = ['student', 'instructor', 'admin', 'superadmin'];

// === Function to check imports for a single barrel/index.js ===
function checkImportsForBarrel(folder) {
  const barrelPath = path.join(__dirname, folder, 'index.js');
  if (!fs.existsSync(barrelPath)) {
    console.warn(`⚠️  Barrel file missing: ${barrelPath}`);
    return;
  }

  const content = fs.readFileSync(barrelPath, 'utf8');
  // Match import { ... } from './something.js';
  const importRegex = /import\s+.*?from\s+['"](\.\/.*?\.js)['"]/g;
  let match,
    missing = [],
    found = [];
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const fullPath = path.join(__dirname, folder, importPath);
    if (fs.existsSync(fullPath)) {
      found.push(importPath);
    } else {
      missing.push(importPath);
    }
  }

  // Output summary
  if (missing.length === 0) {
    console.log(`✅ All imports in ${folder}/index.js exist and match!`);
  } else {
    console.log(`❌ Missing files for ${folder}/index.js:`);
    missing.forEach((p) => console.log(`   - ${p}`));
  }
  if (found.length) {
    console.log(`   [Checked ${found.length + missing.length} imports]`);
  }
}

// === Main ===
roleFolders.forEach((folder) => checkImportsForBarrel(folder));
