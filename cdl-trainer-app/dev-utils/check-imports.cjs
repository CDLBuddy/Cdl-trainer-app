// dev-utils/check-imports.cjs
// Import integrity checker for Vite + React (JS/TS/CSS + assets).
// - Resolves aliases, extensionless imports, directory indexes
// - Parses static + dynamic + require() + CSS @import
// - Strips Vite query suffixes (?raw, ?url, ?inline, etc.)
// - Reports missing files/packages and case mismatches
// - CI friendly (nonzero exit on problems) with JSON/verbose modes

const fs = require('fs')
const path = require('path')

// ---------------------------
// CLI
// ---------------------------
const argv = new Set(process.argv.slice(2))
function getArgValue(name, def = null) {
  const idx = process.argv.indexOf(name)
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : def
}

const PROJECT_ROOT = process.cwd()
const SCAN_DIR = path.resolve(getArgValue('--dir', 'src'))
const OUTPUT_JSON = argv.has('--json')
const VERBOSE = argv.has('--verbose')

// ---------------------------
// Config
// ---------------------------

// Ignore dirs during recursive walk
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.vite', 'coverage', 'build'])

// File types to scan
const CODE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
const CSS_EXTS = new Set(['.css'])

// What we attempt when import has no extension
const RESOLVE_EXTS = [
  // code
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  // styles
  '.css', '.module.css',
  // data/assets
  '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'
]
const INDEX_CANDIDATES = RESOLVE_EXTS.map(ext => 'index' + ext)

// Treat as external (don’t resolve)
const REMOTE_PREFIXES = ['http://', 'https://', 'data:', 'virtual:']
const STRIP_QUERY = true // strip ?raw, ?url, etc.

// Mirror your vite.config.js → resolve.alias (kept here for speed & CJS).
// Update this block when aliases change.
const ALIASES = {
  // Base
  '@': 'src',

  // Shared/global
  '@components': 'src/components',
  '@utils': 'src/utils',
  '@navigation': 'src/navigation',
  '@pages': 'src/pages',
  '@styles': 'src/styles',
  '@assets': 'src/assets',
  '@shared': 'src/shared',
  '@session': 'src/session',

  // Walkthrough (global)
  '@walkthrough-data': 'src/walkthrough-data',
  '@walkthrough-defaults': 'src/walkthrough-data/defaults',
  '@walkthrough-loaders': 'src/walkthrough-data/loaders',
  '@walkthrough-utils': 'src/walkthrough-data/utils',

  // Role-specific
  '@student': 'src/student',
  '@student-components': 'src/student/components',
  '@student-profile': 'src/student/profile',
  '@student-profile-sections': 'src/student/profile/sections',
  '@student-profile-ui': 'src/student/profile/ui',
  '@student-walkthrough': 'src/student/walkthrough',

  '@instructor': 'src/instructor',
  '@admin': 'src/admin',
  '@superadmin': 'src/superadmin',
}

// Valid bare package-ish specifier (so we don’t misclassify junk)
const PKG_NAME_RE = /^(@[a-zA-Z0-9-_]+\/)?[a-zA-Z0-9-_.]+(\/[a-zA-Z0-9-_.]+)*$/

// ---------------------------
// Helpers
// ---------------------------
const aliasEntries = Object.entries(ALIASES)
  .map(([k, v]) => [k, path.resolve(PROJECT_ROOT, v)])
  .sort((a, b) => b[0].length - a[0].length)

function isIgnoredDir(name) {
  return IGNORE_DIRS.has(name)
}

function listAllFiles(dir, out = []) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (!isIgnoredDir(e.name)) listAllFiles(full, out)
    } else {
      const ext = path.extname(e.name).toLowerCase()
      if (CODE_EXTS.has(ext) || CSS_EXTS.has(ext)) out.push(full)
    }
  }
  return out
}

function stripQuery(spec) {
  if (!STRIP_QUERY) return spec
  const q = spec.indexOf('?')
  return q >= 0 ? spec.slice(0, q) : spec
}

function resolveAlias(spec) {
  for (const [aliasKey, absBase] of aliasEntries) {
    if (spec === aliasKey || spec.startsWith(aliasKey + '/')) {
      const rel = spec.slice(aliasKey.length).replace(/^\/?/, '')
      return path.resolve(absBase, rel)
    }
  }
  return null
}

function resolveProjectAbsolute(spec) {
  if (spec.startsWith('/')) {
    return path.resolve(PROJECT_ROOT, spec.slice(1))
  }
  return null
}

// Check exact case along the path (guards Linux/CI)
function existsExactCase(absPath) {
  const parts = absPath.split(path.sep).filter(Boolean)
  let cur = path.isAbsolute(absPath) ? path.parse(absPath).root : ''
  for (const seg of parts) {
    const dir = cur || path.sep
    if (!fs.existsSync(dir)) return { exists: false, caseOk: false }
    const names = fs.readdirSync(dir)
    const exact = names.includes(seg)
    if (!exact) {
      const ci = names.find(n => n.toLowerCase() === seg.toLowerCase())
      if (ci) { cur = path.join(dir, ci); continue } // wrong case but exists
      return { exists: false, caseOk: false }
    }
    cur = path.join(dir, seg)
  }
  return { exists: fs.existsSync(cur), caseOk: true }
}

function tryWithExtensions(basePath) {
  // exact file
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) return basePath

  // with extensions
  for (const ext of RESOLVE_EXTS) {
    const p = basePath + ext
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
  }

  // directory index
  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const idx of INDEX_CANDIDATES) {
      const p = path.join(basePath, idx)
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
    }
  }

  return null
}

function resolveLocalImport(fromFile, rawSpec) {
  const spec0 = stripQuery(rawSpec)

  // Skip remote or virtual
  if (REMOTE_PREFIXES.some(p => spec0.startsWith(p))) {
    return { resolved: null, skip: true }
  }

  const isRelative = spec0.startsWith('./') || spec0.startsWith('../')
  const isAlias = aliasEntries.some(([k]) => spec0 === k || spec0.startsWith(k + '/'))
  const isProjectAbs = spec0.startsWith('/')

  // Bare package?
  if (!isRelative && !isAlias && !isProjectAbs) {
    if (!PKG_NAME_RE.test(spec0)) return { resolved: null, skip: true } // ignore weird stuff
    try {
      require.resolve(spec0, { paths: [PROJECT_ROOT] })
      return { resolved: null, skip: true } // valid package
    } catch {
      return { resolved: null, skip: false, missingPackage: spec0 }
    }
  }

  let absBase = null
  if (isRelative) {
    absBase = path.resolve(path.dirname(fromFile), spec0)
  } else if (isAlias) {
    absBase = resolveAlias(spec0)
  } else if (isProjectAbs) {
    absBase = resolveProjectAbsolute(spec0)
  }

  if (!absBase) return { resolved: null, skip: false }

  const finalPath = tryWithExtensions(absBase)
  return { resolved: finalPath, base: absBase, skip: false }
}

const rel = p => path.relative(PROJECT_ROOT, p).replace(/\\/g, '/')

// ---------------------------
// Import extraction
// ---------------------------

// JS/TS static/dynamic/require/export-from
const JS_IMPORT_RE =
  /\bimport\s+(?:type\s+)?[^'"]*['"]([^'"]+)['"]|(?:export\s+\*\s+from\s+|export\s*\{[^}]*\}\s*from\s*|require\s*\(\s*|import\s*\(\s*)['"]([^'"]+)['"]\s*\)?/g

// CSS @import "..." | @import url("...")
const CSS_IMPORT_RE = /@import\s+(?:url\(\s*)?['"]([^'"]+)['"]\s*\)?/g

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')      // /* ... */
    .replace(/(^|\s)\/\/.*$/gm, '')        // // ...
}

function* extractImports(filePath, content) {
  const ext = path.extname(filePath).toLowerCase()
  const s = stripComments(content)

  if (CODE_EXTS.has(ext)) {
    let m
    while ((m = JS_IMPORT_RE.exec(s))) {
      const spec = m[1] || m[2]
      if (spec) yield spec
    }
  } else if (CSS_EXTS.has(ext)) {
    let m
    while ((m = CSS_IMPORT_RE.exec(s))) {
      const spec = m[1]
      if (spec) yield spec
    }
  }
}

// ---------------------------
// Main
// ---------------------------
if (!fs.existsSync(SCAN_DIR)) {
  console.error(`❌ Cannot find directory: ${rel(SCAN_DIR)} (use --dir to set)`)
  process.exit(2)
}

const files = listAllFiles(SCAN_DIR)
let totalFiles = 0
let totalImports = 0
let brokenCount = 0

const problems = {
  missingFiles: [],     // { file, import, tried }
  caseMismatches: [],   // { file, import, actual }
  missingPackages: [],  // { file, import }
}

for (const file of files) {
  totalFiles++
  let content
  try {
    content = fs.readFileSync(file, 'utf8')
  } catch {
    continue
  }

  for (const spec of extractImports(file, content)) {
    totalImports++

    const res = resolveLocalImport(file, spec)
    if (res.skip) continue

    if (res.missingPackage) {
      problems.missingPackages.push({ file, import: spec })
      brokenCount++
      if (VERBOSE) console.log(`📦 Missing package: ${spec} (from ${rel(file)})`)
      continue
    }

    if (!res.resolved) {
      problems.missingFiles.push({ file, import: spec, tried: res.base ? rel(res.base) : '' })
      brokenCount++
      if (VERBOSE) console.log(`❌ Missing file: ${spec} (from ${rel(file)})`)
      continue
    }

    const caseInfo = existsExactCase(res.resolved)
    if (!caseInfo.caseOk) {
      problems.caseMismatches.push({ file, import: spec, actual: rel(res.resolved) })
      // case mismatch still resolves on Windows, but fail in CI → count as problem
      brokenCount++
      if (VERBOSE) console.log(`⚠ Case mismatch: ${spec} → ${rel(res.resolved)} (from ${rel(file)})`)
    }
  }
}

// ---------------------------
// Report
// ---------------------------
if (OUTPUT_JSON) {
  const payload = {
    dir: rel(SCAN_DIR) || '.',
    filesScanned: totalFiles,
    importsFound: totalImports,
    problems,
    brokenCount,
    ok: brokenCount === 0,
  }
  console.log(JSON.stringify(payload, null, 2))
  process.exit(brokenCount === 0 ? 0 : 1)
}

// Human-readable
console.log(`\nScanned ${totalFiles} files in ${rel(SCAN_DIR) || '.'}; found ${totalImports} imports.`)

let exitCode = 0

if (problems.missingFiles.length) {
  exitCode = 1
  console.log('\n❌ Missing files / wrong paths:')
  for (const x of problems.missingFiles) {
    const near = x.tried ? ` (looked near: ${x.tried})` : ''
    console.log(`  - ${rel(x.file)} → ${x.import}${near}`)
  }
}

if (problems.caseMismatches.length) {
  exitCode = 1
  console.log('\n⚠ Case mismatches (works on Windows, fails on Linux/CI):')
  for (const x of problems.caseMismatches) {
    console.log(`  - ${rel(x.file)} → ${x.import}  (actual: ${x.actual})`)
  }
}

if (problems.missingPackages.length) {
  exitCode = 1
  console.log('\n📦 Missing npm packages:')
  const byPkg = new Map()
  for (const x of problems.missingPackages) {
    if (!byPkg.has(x.import)) byPkg.set(x.import, [])
    byPkg.get(x.import).push(rel(x.file))
  }
  for (const [pkg, fromFiles] of byPkg) {
    console.log(
      `  - ${pkg}  (used in ${fromFiles.length} file${fromFiles.length > 1 ? 's' : ''})`
    )
  }
}

if (exitCode === 0) {
  console.log('✅ No broken imports found.')
}

process.exit(exitCode)
