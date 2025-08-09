// dev-utils/check-imports.cjs
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, "src");

// What we consider "code" files and resolvable targets
const CODE_EXTS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];
const RESOLVE_EXTS = [
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".css", ".module.css", ".json",
];

// If you use Vite aliases, map them here (left side must match how you import)
const ALIASES = {
  // "@/": "src/",
};

// ✅ Valid (very permissive) bare package name. Prevents random code being treated as a package.
const PKG_NAME_RE = /^(@[a-zA-Z0-9-_]+\/)?[a-zA-Z0-9-_.]+(\/[a-zA-Z0-9-_.]+)*$/;

function walk(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(walk(full));
    else results.push(full);
  }
  return results;
}
const isCodeFile = (f) => CODE_EXTS.includes(path.extname(f));
const read = (f) => fs.readFileSync(f, "utf8");
const rel = (p) => path.relative(PROJECT_ROOT, p).replace(/\\/g, "/");

// Strip comments first so regex never sees junk
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")   // /* ... */
    .replace(/(^|\s)\/\/.*$/gm, "");    // // ...
}

// Collect only string-literal module specifiers
function collectImports(src) {
  const s = stripComments(src);
  const found = new Set();
  let m;

  // import x from '...';  import '...';
  const reImport = /(?:^|\s)import\s+(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["']/g;
  while ((m = reImport.exec(s))) found.add(m[1]);

  // export { x } from '...';  export * from '...';
  const reExport = /(?:^|\s)export\s+(?:[\s\S]*?\sfrom\s*)["']([^"']+)["']/g;
  while ((m = reExport.exec(s))) found.add(m[1]);

  // require('...')
  const reRequire = /(?:^|[^\w])require\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((m = reRequire.exec(s))) found.add(m[1]);

  // dynamic import('...')
  const reDyn = /(?:^|[^\w])import\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((m = reDyn.exec(s))) found.add(m[1]);

  return Array.from(found);
}

function normalizeAlias(imp) {
  for (const [alias, target] of Object.entries(ALIASES)) {
    if (imp.startsWith(alias)) {
      const rest = imp.slice(alias.length);
      return path.join(PROJECT_ROOT, target, rest).replace(/\\/g, "/");
    }
  }
  return null;
}

// Check per-segment case on disk (Linux/CI will care)
function existsExactCase(absPath) {
  const parts = absPath.split(path.sep).filter(Boolean);
  let cur = path.isAbsolute(absPath) ? path.parse(absPath).root : "";
  for (const seg of parts) {
    const dir = cur || path.sep;
    if (!fs.existsSync(dir)) return { exists: false, caseOk: false };
    const names = fs.readdirSync(dir);
    const exact = names.includes(seg);
    if (!exact) {
      const ci = names.find((n) => n.toLowerCase() === seg.toLowerCase());
      if (ci) { cur = path.join(dir, ci); continue; } // wrong case
      return { exists: false, caseOk: false };
    }
    cur = path.join(dir, seg);
  }
  return { exists: fs.existsSync(cur), caseOk: true };
}

function resolveFile(absNoExt) {
  if (fs.existsSync(absNoExt)) {
    const chk = existsExactCase(absNoExt);
    return { ok: chk.exists, kind: "file", caseOk: chk.caseOk, absTried: absNoExt };
  }
  for (const ext of RESOLVE_EXTS) {
    const p = absNoExt + ext;
    if (fs.existsSync(p)) {
      const chk = existsExactCase(p);
      return { ok: chk.exists, kind: "file", caseOk: chk.caseOk, absTried: p };
    }
  }
  for (const ext of RESOLVE_EXTS) {
    const p = path.join(absNoExt, "index" + ext);
    if (fs.existsSync(p)) {
      const chk = existsExactCase(p);
      return { ok: chk.exists, kind: "file", caseOk: chk.caseOk, absTried: p };
    }
  }
  return { ok: false, kind: "missing-file", absTried: absNoExt };
}

function tryResolve(fileDir, imp) {
  // alias?
  const aliasAbs = normalizeAlias(imp);
  if (aliasAbs) return resolveFile(aliasAbs);

  // bare specifier (npm package)
  const isBare = !imp.startsWith(".") && !imp.startsWith("/") && !aliasAbs;
  if (isBare) {
    if (!PKG_NAME_RE.test(imp)) return { ok: true, kind: "skip-weird-bare" }; // ignore non-package junk
    try {
      require.resolve(imp, { paths: [PROJECT_ROOT] });
      return { ok: true, kind: "package" };
    } catch {
      return { ok: false, kind: "missing-package" };
    }
  }

  // relative/absolute path
  const absNoExt = imp.startsWith("/")
    ? path.join(PROJECT_ROOT, imp.replace(/^\/+/, ""))
    : path.resolve(fileDir, imp);

  return resolveFile(absNoExt);
}

// ---------- Run ----------
if (!fs.existsSync(SRC_DIR)) {
  console.error(`❌ Cannot find src/ at: ${SRC_DIR}`);
  process.exit(2);
}

const files = walk(SRC_DIR).filter(isCodeFile);
const problems = {
  missingFiles: [],
  caseMismatches: [],
  missingPackages: [],
};

for (const file of files) {
  const content = read(file);
  const imports = collectImports(content);
  const dir = path.dirname(file);

  for (const imp of imports) {
    const res = tryResolve(dir, imp);

    if (res.ok && res.kind === "file" && res.caseOk === false) {
      problems.caseMismatches.push({ file, import: imp, tried: res.absTried });
      continue;
    }
    if (res.ok) continue;

    if (res.kind === "missing-package") {
      problems.missingPackages.push({ file, import: imp });
      continue;
    }
    if (res.kind === "missing-file") {
      problems.missingFiles.push({ file, import: imp, tried: res.absTried });
    }
    // skip-weird-bare: intentionally ignored
  }
}

// ---------- Report ----------
let exitCode = 0;

if (problems.missingFiles.length) {
  exitCode = 1;
  console.log("\n❌ Missing files / wrong paths:");
  for (const x of problems.missingFiles) {
    const near = x.tried ? ` (looked near: ${rel(x.tried)})` : "";
    console.log(`  - ${rel(x.file)} → ${x.import}${near}`);
  }
}

if (problems.caseMismatches.length) {
  exitCode = 1;
  console.log("\n⚠ Case mismatches (works on Windows, fails on Linux/CI):");
  for (const x of problems.caseMismatches) {
    console.log(`  - ${rel(x.file)} → ${x.import}  (actual: ${rel(x.tried)})`);
  }
}

if (problems.missingPackages.length) {
  exitCode = 1;
  console.log("\n📦 Missing npm packages:");
  const byPkg = new Map();
  for (const x of problems.missingPackages) {
    if (!byPkg.has(x.import)) byPkg.set(x.import, []);
    byPkg.get(x.import).push(rel(x.file));
  }
  for (const [pkg, fromFiles] of byPkg) {
    console.log(`  - ${pkg}  (used in ${fromFiles.length} file${fromFiles.length > 1 ? "s" : ""})`);
  }
}

if (!exitCode) {
  console.log("✅ No broken imports found.");
}

process.exit(exitCode);
