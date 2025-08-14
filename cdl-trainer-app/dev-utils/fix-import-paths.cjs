// dev-utils/fix-import-paths.cjs
// Fix import/export specifiers to match real file names (case + extension).
// Usage:
//   node dev-utils/fix-import-paths.cjs --dir src            # dry-run
//   node dev-utils/fix-import-paths.cjs --dir src --write    # apply changes

const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const DIR = getArg('--dir') || 'src'
const WRITE = args.includes('--write')

// Keep this alias map in sync with vite.config.js
const ALIASES = {
  '@': 'src',
  '@components': 'src/components',
  '@utils': 'src/utils',
  '@navigation': 'src/navigation',
  '@pages': 'src/pages',
  '@styles': 'src/styles',
  '@assets': 'src/assets',
  '@shared': 'src/shared',
  '@session': 'src/session',

  '@walkthrough-data': 'src/walkthrough-data',
  '@walkthrough-defaults': 'src/walkthrough-data/defaults',
  '@walkthrough-loaders': 'src/walkthrough-data/loaders',
  '@walkthrough-utils': 'src/walkthrough-data/utils',

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

const EXT_CANDIDATES = [
  '.js', '.jsx', '.ts', '.tsx',
  '.json',
  '.css', '.module.css',
]

const FILE_RE = /\b(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm

function getArg(flag) {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : null
}

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(p))
    else if (/\.(m?jsx?|tsx?)$/.test(entry.name)) out.push(p)
  }
  return out
}

function existsExact(p) {
  try {
    const dir = path.dirname(p)
    const base = path.basename(p)
    const items = fs.readdirSync(dir)
    return items.includes(base)
  } catch {
    return false
  }
}

// Return the actual file path on disk that matches given path (case-insensitive).
function resolveRealFile(absNoExtOrWithWrongCase) {
  const dir = path.dirname(absNoExtOrWithWrongCase)
  const base = path.basename(absNoExtOrWithWrongCase)
  let name = base
  let hasExt = path.extname(base) !== ''

  const candidates = []
  if (hasExt) {
    candidates.push(base)
  } else {
    for (const ext of EXT_CANDIDATES) candidates.push(base + ext)
    // also try index.* if target is a directory
    try {
      if (fs.existsSync(absNoExtOrWithWrongCase) && fs.lstatSync(absNoExtOrWithWrongCase).isDirectory()) {
        for (const ext of EXT_CANDIDATES) candidates.push(path.join(base, 'index' + ext))
      }
    } catch {}
  }

  let list
  try { list = fs.readdirSync(dir) } catch { return null }

  // Try exact match first
  for (const cand of candidates) {
    if (list.includes(cand)) return path.join(dir, cand)
  }

  // Then try case-insensitive match
  const lowerMap = new Map(list.map(n => [n.toLowerCase(), n]))
  for (const cand of candidates) {
    const hit = lowerMap.get(cand.toLowerCase())
    if (hit) return path.join(dir, hit)
  }

  return null
}

function toAliasPath(absFixed, originalSpecifier, filePath) {
  // Keep the same style (alias vs relative) as the original import
  if (originalSpecifier.startsWith('.') || originalSpecifier.startsWith('/')) {
    // relative to filePath
    const fromDir = path.dirname(filePath)
    let rel = path.relative(fromDir, absFixed).replace(/\\/g, '/')
    if (!rel.startsWith('.')) rel = './' + rel
    return rel
  }

  // alias case
  for (const [alias, base] of Object.entries(ALIASES)) {
    const baseAbs = path.resolve(process.cwd(), base)
    if (absFixed.startsWith(baseAbs + path.sep)) {
      const rest = absFixed.slice(baseAbs.length + 1).replace(/\\/g, '/')
      return `${alias}/${rest}`
    }
  }
  return originalSpecifier // fallback
}

function resolveSpecifier(specifier, filePath) {
  // external deps — skip
  if (!specifier.startsWith('.') &&
      !specifier.startsWith('/') &&
      !Object.keys(ALIASES).some(a => specifier === a || specifier.startsWith(a + '/'))) {
    return null
  }

  let abs
  if (specifier.startsWith('.')) {
    abs = path.resolve(path.dirname(filePath), specifier)
  } else {
    // alias
    const alias = Object.keys(ALIASES).find(a => specifier === a || specifier.startsWith(a + '/'))
    const rest = specifier === alias ? '' : specifier.slice(alias.length + 1)
    abs = path.resolve(process.cwd(), ALIASES[alias], rest)
  }

  // If it already matches exactly (including case), keep as-is
  if (path.extname(abs) && existsExact(abs)) return null

  const real = resolveRealFile(abs)
  if (!real) return null

  const fixed = toAliasPath(real, specifier, filePath)
  return fixed
}

function processFile(fp) {
  const src = fs.readFileSync(fp, 'utf8')
  let m, changed = false
  let out = src
  const seen = new Map()

  while ((m = FILE_RE.exec(src))) {
    const spec = m[1] || m[2]
    if (!spec) continue
    if (seen.has(spec)) continue
    const fixed = resolveSpecifier(spec, fp)
    if (fixed && fixed !== spec) {
      seen.set(spec, fixed)
      const rx = new RegExp(`(['"])${spec.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\1`, 'g')
      out = out.replace(rx, `'${fixed}'`)
      changed = true
    }
  }

  if (changed && WRITE) fs.writeFileSync(fp, out)
  return { changed, patches: [...seen.entries()] }
}

// run
const files = walk(DIR)
let changed = 0, patched = 0

for (const f of files) {
  const res = processFile(f)
  if (res.changed) {
    changed++
    for (const [from, to] of res.patches) {
      if (from !== to) {
        patched++
        console.log(`✓ ${path.relative(process.cwd(), f)}: '${from}' → '${to}'`)
      }
    }
  }
}

console.log(`\n${WRITE ? 'Applied' : 'Would apply'} fixes in ${changed} file(s), ${patched} import(s).`)
if (!WRITE) console.log('Run again with --write to apply.')
