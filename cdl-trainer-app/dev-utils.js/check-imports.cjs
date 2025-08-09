// dev-utils/check-imports.cjs
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, "src");

const CODE_EXTS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];
const RESOLVE_EXTS = [
  ".js",".jsx",".ts",".tsx",".mjs",".cjs",".css",".module.css",".json",
];

// If you use Vite aliases, add here e.g. "@/": "src/"
const ALIASES = {};

function walk(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(walk(full));
    else results.push(full);
  }
  return results;
}
function isCodeFile(file) { return CODE_EXTS.includes(path.extname(file)); }
function read(file) { try { return fs.readFileSync(file, "utf8"); } catch { return ""; } }

function collectImports(src) {
  const found = new Set();
  const reImport = /import(?:[\s\S]*?)?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;
  const reExport = /export(?:[\s\S]*?)from\s*['"]([^'"]+)['"]/g;
  const reRequire = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const reDyn = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = reImport.exec(src))) found.add(m[1] || m[2]);
  while ((m = reExport.exec(src))) found.add(m[1]);
  while ((m = reRequire.exec(src))) found.add(m[1]);
  while ((m = reDyn.exec(src))) found.add(m[1]);
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

function existsExactCase(absPath) {
  const parts = absPath.split(path.sep);
  let cur = parts[0] || path.sep;
  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i];
    if (!segment) continue;
    if (!fs.existsSync(cur)) return { exists: false, caseOk: false };
    const entries = new Set(fs.readdirSync(cur));
    if (!entries.has(segment)) {
      const ci = Array.from(entries).find((e) => e.toLowerCase() === segment.toLowerCase());
      if (ci) {
        cur = path.join(cur, ci);
        return { exists: fs.existsSync(cur), caseOk: false, fixed: cur };
      }
      return { exists: false, caseOk: false };
    }
    cur = path.join(cur, segment);
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

function tryResolveFile(baseDir, imp) {
  const aliasAbs = normalizeAlias(imp);
  if (aliasAbs) return resolveFile(aliasAbs);

  if (!imp.startsWith(".") && !imp.startsWith("/") && !aliasAbs) {
    try {
      require.resolve(imp, { paths: [PROJECT_ROOT] });
      return { ok: true, kind: "package" };
    } catch {
      return { ok: false, kind: "missing-package" };
    }
  }

  const abs = imp.startsWith("/")
    ? path.join(PROJECT_ROOT, imp.replace(/^\/+/, ""))
    : path.resolve(baseDir, imp);

  return resolveFile(abs);
}

if (!fs.existsSync(SRC_DIR)) {
  console.error(`❌ Cannot find src/ at: ${SRC_DIR}`);
  process.exit(2);
}

const files = walk(SRC_DIR).filter(isCodeFile);
const problems = { missingFiles: [], caseMismatches: [], missingPackages: [], aliasHints: [] };

for (const file of files) {
  const content = read(file);
  const imports = collectImports(content);
  const fileDir = path.dirname(file);
  for (const imp of imports) {
    const res = tryResolveFile(fileDir, imp);
    if (res.ok && res.kind === "file" && res.caseOk === false) {
      problems.caseMismatches.push({ file, import: imp, resolved: res.absTried });
      continue;
    }
    if (res.ok) continue;
    if (res.kind === "missing-package") {
      problems.missingPackages.push({ file, import: imp });
      continue;
    }
    if (imp in ALIASES) {
      problems.aliasHints.push({ file, import: imp });
      continue;
    }
    problems.missingFiles.push({ file, import: imp, tried: res.absTried });
  }
}

let exitCode = 0;
const rel = (p) => path.relative(PROJECT_ROOT, p).replace(/\\/g, "/");

if (problems.missingFiles.length) {
  exitCode = 1;
  console.log("\n❌ Missing files / wrong paths:");
  for (const x of problems.missingFiles) {
    console.log(`  - ${rel(x.file)} → ${x.import}    (looked near: ${rel(x.tried)})`);
  }
}

if (problems.caseMismatches.length) {
  exitCode = 1;
  console.log("\n⚠ Case mismatches (works on Windows, fails on Linux/CI):");
  for (const x of problems.caseMismatches) {
    console.log(`  - ${rel(x.file)} → ${x.import}    (resolved: ${rel(x.resolved)})`);
  }
}

if (problems.missingPackages.length) {
  exitCode = 1;
  console.log("\n📦 Missing npm packages:");
  const dedup = new Map();
  for (const x of problems.missingPackages) {
    if (!dedup.has(x.import)) dedup.set(x.import, []);
    dedup.get(x.import).push(rel(x.file));
  }
  for (const [pkg, fromFiles] of dedup) {
    console.log(`  - ${pkg}  (used in ${fromFiles.length} file${fromFiles.length > 1 ? "s" : ""})`);
  }
}

if (problems.aliasHints.length) {
  console.log("\nℹ Alias-like imports found. If unresolved, add ALIASES in this script:");
  for (const x of problems.aliasHints) {
    console.log(`  - ${rel(x.file)} → ${x.import}`);
  }
}

if (!exitCode) console.log("✅ No broken imports found.");
process.exit(exitCode);
