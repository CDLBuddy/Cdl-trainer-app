// deep-import-checker.cjs
// Comprehensive local import checker for Vite + React projects.
// - Checks JS/TS/JSX/TSX/MJS/CJS and CSS @import
// - Resolves aliases (configure aliasMap below to mirror vite.config.js)
// - Resolves extensionless imports for many filetypes
// - Handles directory indexes and Vite query suffixes (?raw, ?url, etc.)

const fs = require('fs')
const path = require('path')

// ---------------------------
// Configuration
// ---------------------------

// Project root to scan (defaults to CWD or first arg)
const PROJECT_ROOT = path.resolve(process.argv[2] || process.cwd())

// Folders to ignore
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.vite', 'coverage'])

// File types to scan for imports
const CODE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
const CSS_EXTS = new Set(['.css'])

// Extensions we will try when an import is extensionless
const RESOLVE_EXTS = [
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', // code
  '.json',                                      // data
  '.css', '.module.css'                         // styles
]

// Directory index filenames we’ll try if import points to a folder
const INDEX_CANDIDATES = RESOLVE_EXTS.map(ext => 'index' + ext)

// Treat these as “remote” and skip resolution
const REMOTE_PREFIXES = ['http://', 'https://', 'data:', 'virtual:']

// Vite query suffixes to strip for existence checks (e.g., '?raw', '?url', '?inline')
const STRIP_QUERY = true

// ---- IMPORTANT: Mirror this with your vite.config.js alias block ----
// You can paste your alias map here. For your current tree it should be:
const aliasMap = {
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

  // Walkthrough system (global)
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
// --------------------------------------------------------------------

// Precompute alias entries sorted by longest key first to avoid partial matches
const aliasEntries = Object.entries(aliasMap)
  .map(([k, v]) => [k, path.resolve(PROJECT_ROOT, v)])
  .sort((a, b) => b[0].length - a[0].length)

// ---------------------------
// Helpers
// ---------------------------

function isIgnoredDir(name) {
  return IGNORE_DIRS.has(name)
}

function listAllFiles(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
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

// Strip vite query suffixes (?raw, ?url, ?inline, etc.)
function stripQueryIfNeeded(spec) {
  if (!STRIP_QUERY) return spec
  const q = spec.indexOf('?')
  return q >= 0 ? spec.slice(0, q) : spec
}

// Apply alias mapping (returns absolute path or null)
function resolveAlias(spec) {
  for (const [aliasKey, absBase] of aliasEntries) {
    if (spec === aliasKey || spec.startsWith(aliasKey + '/')) {
      const rel = spec.slice(aliasKey.length).replace(/^\/?/, '')
      return path.resolve(absBase, rel)
    }
  }
  return null
}

// Resolve absolute-from-project-root imports like `/utils/x`
function resolveProjectAbsolute(spec) {
  if (spec.startsWith('/')) {
    return path.resolve(PROJECT_ROOT, spec.slice(1))
  }
  return null
}

// Try existence with extension candidates
function tryWithExtensions(basePath) {
  // exact file
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) return basePath

  // try extension list
  for (const ext of RESOLVE_EXTS) {
    const p = basePath + ext
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
  }

  // try directory index
  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const idx of INDEX_CANDIDATES) {
      const p = path.join(basePath, idx)
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
    }
  }

  return null
}

function resolveLocalImport(fromFile, rawSpec) {
  let spec = stripQueryIfNeeded(rawSpec)

  // Skip remote / virtual
  if (REMOTE_PREFIXES.some(p => spec.startsWith(p))) return { resolved: null, skip: true }

  // Node packages (not relative/alias/absolute project paths)
  const isRelative = spec.startsWith('./') || spec.startsWith('../')
  const isAlias = aliasEntries.some(([k]) => spec === k || spec.startsWith(k + '/'))
  const isProjectAbs = spec.startsWith('/')

  if (!isRelative && !isAlias && !isProjectAbs) {
    // package import: ignore
    return { resolved: null, skip: true }
  }

  // Resolve to absolute base before extension attempts
  let absBase = null
  if (isRelative) {
    absBase = path.resolve(path.dirname(fromFile), spec)
  } else if (isAlias) {
    absBase = resolveAlias(spec)
  } else if (isProjectAbs) {
    absBase = resolveProjectAbsolute(spec)
  }

  if (!absBase) return { resolved: null, skip: false }

  const finalPath = tryWithExtensions(absBase)
  return { resolved: finalPath, skip: false }
}

// ---------------------------
// Import extraction
// ---------------------------

// JS/TS: static import/export-from, require(), dynamic import()
const JS_IMPORT_RE = /\bimport\s+(?:type\s+)?[^'"]*['"]([^'"]+)['"]|(?:export\s+\*\s+from\s+|export\s*\{[^}]*\}\s*from\s*|require\s*\(\s*|import\s*\(\s*)['"]([^'"]+)['"]\s*\)?/g

// CSS: @import "<path>" or @import url("<path>")
const CSS_IMPORT_RE = /@import\s+(?:url\(\s*)?['"]([^'"]+)['"]\s*\)?/g

function* extractImports(filePath, content) {
  const ext = path.extname(filePath).toLowerCase()

  if (CODE_EXTS.has(ext)) {
    let m
    while ((m = JS_IMPORT_RE.exec(content))) {
      const spec = m[1] || m[2]
      if (spec) yield spec
    }
  } else if (CSS_EXTS.has(ext)) {
    let m
    while ((m = CSS_IMPORT_RE.exec(content))) {
      const spec = m[1]
      if (spec) yield spec
    }
  }
}

// ---------------------------
// Main
// ---------------------------

const files = listAllFiles(PROJECT_ROOT)
let totalImports = 0
let totalBroken = 0
let brokenByFile = new Map()

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  const broken = []

  for (const spec of extractImports(file, src)) {
    totalImports++
    const { resolved, skip } = resolveLocalImport(file, spec)
    if (skip) continue
    if (!resolved) {
      broken.push(spec)
      totalBroken++
    }
  }

  if (broken.length) {
    brokenByFile.set(file, broken)
  }
}

// ---------------------------
// Report
// ---------------------------

if (brokenByFile.size === 0) {
  console.log(`\n✅ All ${totalImports} local/alias imports in ${files.length} files are valid!`)
} else {
  console.log(`\n❌ Found ${totalBroken} broken local/alias imports across ${brokenByFile.size} files.\n`)
  for (const [file, list] of brokenByFile.entries()) {
    console.log(`✖ ${path.relative(PROJECT_ROOT, file)}`)
    for (const s of list) console.log(`   - ${s}`)
  }
  console.log('\nTip: Ensure the alias map in deep-import-checker.cjs mirrors vite.config.js → resolve.alias.\n')
}
