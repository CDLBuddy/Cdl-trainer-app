// dev-utils/import-barrel-checker.cjs

const fs = require('fs');
const path = require('path');

// Always run relative to project root (one up from dev-utils)
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

const barrelFiles = [
  'student/index.js',
  'instructor/index.js',
  'admin/index.js',
  'superadmin/index.js',
];

let allValid = true;

for (const barrelPath of barrelFiles) {
  if (!fs.existsSync(barrelPath)) {
    console.log(
      `⚠️  Barrel file missing: ${path.join(projectRoot, barrelPath)}`
    );
    allValid = false;
    continue;
  }

  const src = fs.readFileSync(barrelPath, 'utf8');
  // Find local imports only (relative paths)
  const importRegex = /import\s+.*?['"](\.\/[^'"]+)['"]/g;
  let match;
  let broken = [];
  let count = 0;
  while ((match = importRegex.exec(src))) {
    const importPath = match[1];
    const absImportPath = path.resolve(path.dirname(barrelPath), importPath);
    // If importing a directory, try index.js
    let testPath = absImportPath;
    if (!fs.existsSync(testPath)) {
      if (fs.existsSync(testPath + '.js')) {
        testPath = testPath + '.js';
      } else if (fs.existsSync(path.join(testPath, 'index.js'))) {
        testPath = path.join(testPath, 'index.js');
      } else {
        broken.push(importPath);
      }
    }
    count++;
  }
  if (broken.length > 0) {
    allValid = false;
    console.log(`❌ Broken imports in: ${barrelPath}`);
    broken.forEach((f) => console.log(`   - ${f}`));
  } else {
    console.log(`✅ All imports in ${barrelPath} exist and match!`);
    console.log(`   [Checked ${count} imports]`);
  }
}

if (allValid) {
  console.log('\n🎉 All checked barrel files passed!');
} else {
  console.log(
    '\n⚠️  Some issues detected above. Fix broken imports before committing!'
  );
}
