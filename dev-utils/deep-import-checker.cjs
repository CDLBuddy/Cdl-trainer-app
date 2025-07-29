// deep-import-checker.cjs
const fs = require('fs');
const path = require('path');

// Utility to recursively find all JS files except node_modules
function getAllJsFiles(dir, found = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      getAllJsFiles(full, found);
    } else if (entry.name.endsWith('.js')) {
      found.push(full);
    }
  }
  return found;
}

// Normalize import path (handles .js extension, index.js, etc)
function resolveImportPath(importPath, currentFile) {
  if (!importPath.startsWith('.')) return null; // Ignore packages
  let resolved = path.resolve(path.dirname(currentFile), importPath);
  if (fs.existsSync(resolved + '.js')) return resolved + '.js';
  if (fs.existsSync(resolved)) return resolved;
  if (fs.existsSync(resolved + '/index.js')) return resolved + '/index.js';
  return null;
}

const jsFiles = getAllJsFiles(process.cwd());
let totalBroken = 0;
let totalImports = 0;

for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const importRegex = /import\s+[^'"]*['"](.+?)['"]/g;
  let match,
    broken = [];
  while ((match = importRegex.exec(content))) {
    const importPath = match[1];
    totalImports++;
    const resolved = resolveImportPath(importPath, file);
    if (importPath.startsWith('.') && !resolved) {
      broken.push(importPath);
    }
  }
  if (broken.length > 0) {
    console.log(`❌ Broken imports in: ${path.relative(process.cwd(), file)}`);
    broken.forEach((i) => console.log(`   - ${i}`));
    totalBroken += broken.length;
  }
}

if (totalBroken === 0) {
  console.log(
    `\n✅ All ${totalImports} local imports in ${jsFiles.length} JS files are valid!`
  );
} else {
  console.log(
    `\n❌ Found ${totalBroken} broken local imports in ${jsFiles.length} files.`
  );
}
