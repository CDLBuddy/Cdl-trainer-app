#!/usr/bin/env node
// dev-utils/patch-bad-relatives.mjs
// Dry run:  node dev-utils/patch-bad-relatives.mjs
// Apply:    node dev-utils/patch-bad-relatives.mjs --write
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.join(process.cwd(), 'src')
const WRITE = process.argv.includes('--write')

const MAP = new Map([
  ['utils', '@utils'],
  ['components', '@components'],
  ['styles', '@styles'],
  ['pages', '@pages'],
  ['student', '@student'],
  ['instructor', '@instructor'],
  ['admin', '@admin'],
  ['superadmin', '@superadmin'],
  ['navigation', '@navigation'],
  ['walkthrough-data', '@walkthrough'],
])

const FILE_RE = /\.(?:js|jsx|mjs|cjs)$/i
const SKIP = new Set(['node_modules', 'dist', 'build', '.git'])

async function walk(dir, out = []) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP.has(e.name)) await walk(path.join(dir, e.name), out)
    } else if (FILE_RE.test(e.name)) {
      out.push(path.join(dir, e.name))
    }
  }
  return out
}

// very light import/require matcher -> captures the specifier in group 1
const SPEC_PATTERNS = [
  /import\s+[^'"]*?from\s+['"]([^'"]+)['"]/g, // import x from '...'
  /import\s+['"]([^'"]+)['"]/g, // import '...'
  /require\(\s*['"]([^'"]+)['"]\s*\)/g, // require('...')
]

function rewriteSpec(spec) {
  // only handle ../../../something/... patterns
  if (!spec.startsWith('../')) return null
  // collapse leading ../ chain and get first folder
  const m = spec.match(/^(\.\.\/)+([^/]+)\/?(.*)$/)
  if (!m) return null
  const first = m[2] // e.g., utils
  const rest = m[3] ?? ''
  const alias = MAP.get(first)
  if (!alias) return null
  return rest ? `${alias}/${rest}` : alias
}

async function processFile(file) {
  const src = await fs.readFile(file, 'utf8')
  let changed = false
  let out = src
  let changes = []

  for (const re of SPEC_PATTERNS) {
    re.lastIndex = 0
    out = out.replace(re, (full, spec) => {
      const to = rewriteSpec(spec)
      if (to && to !== spec) {
        changed = true
        changes.push([spec, to])
        return full.replace(spec, to)
      }
      return full
    })
  }

  if (changed && WRITE) {
    await fs.writeFile(file + '.bak', src, 'utf8')
    await fs.writeFile(file, out, 'utf8')
  }

  return { changed, changes }
}

;(async () => {
  const files = await walk(ROOT)
  let total = 0
  for (const f of files) {
    const { changed, changes } = await processFile(f)
    if (changed) {
      console.log('\n' + path.relative(process.cwd(), f).replaceAll('\\', '/'))
      for (const [from, to] of changes) {
        console.log(`  ${from}  ->  ${to}`)
        total++
      }
    }
  }
  console.log(
    `\n${WRITE ? 'Applied' : 'Proposed'} ${total} rewrites${
      WRITE ? ' (with .bak backups)' : ''
    }.`
  )
})().catch(err => {
  console.error(err)
  process.exit(1)
})
