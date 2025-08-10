#!/usr/bin/env node
// alias-codemod.mjs
// Usage:
//   node dev-utils/alias-codemod.mjs                 (dry run)
//   node dev-utils/alias-codemod.mjs --write         (apply with .bak backups)
//   node dev-utils/alias-codemod.mjs --write --dynamic
//   node dev-utils/alias-codemod.mjs --write --append-ext=always|never|auto
//
// Notes:
// - Rewrites only *relative* imports that resolve under aliased folders.
// - Leaves bare/external imports alone (e.g., 'react', 'firebase/auth').
// - Keeps same-folder "./something" relative imports untouched.
// - For index resolution, `../navigation` → `@navigation`.
// - Extension policy (default auto):
//     auto   : keep extension only if the original spec had one
//     always : always append resolved extension (e.g. .js / .jsx)
//     never  : never append extension (good with Vite-style resolution)

import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

// ---------- CLI flags ----------
const ARGV = new Set(process.argv.slice(2))
const WRITE = ARGV.has('--write')
const ENABLE_DYNAMIC = ARGV.has('--dynamic')

// --append-ext=auto|always|never (default: auto)
let APPEND_EXT_MODE = 'auto'
for (const arg of ARGV) {
  if (arg.startsWith('--append-ext=')) {
    const v = arg.split('=')[1]
    if (['auto', 'always', 'never'].includes(v)) APPEND_EXT_MODE = v
    else {
      console.error('Invalid --append-ext value. Use auto|always|never.')
      process.exit(1)
    }
  }
}

const projectRoot = process.cwd()
const SRC = path.join(projectRoot, 'src')

// Aliases → absolute folder targets
const ALIASES = [
  ['@', path.join(SRC)],
  ['@utils', path.join(SRC, 'utils')],
  ['@components', path.join(SRC, 'components')],
  ['@styles', path.join(SRC, 'styles')],
  ['@pages', path.join(SRC, 'pages')],
  ['@student', path.join(SRC, 'student')],
  ['@instructor', path.join(SRC, 'instructor')],
  ['@admin', path.join(SRC, 'admin')],
  ['@superadmin', path.join(SRC, 'superadmin')],
  ['@navigation', path.join(SRC, 'navigation')],
  ['@walkthrough', path.join(SRC, 'walkthrough-data')],
]

// Extensions we consider when resolving filesystem targets
const RESOLVE_EXTS = ['.js', '.jsx', '.json', '.css', '.mjs', '.cjs']

// ---------- helpers ----------
function unixify(p) {
  return p.split(path.sep).join('/')
}

function relFromRoot(p) {
  return unixify(path.relative(projectRoot, p))
}

async function walk(dir) {
  const out = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      const bn = e.name.toLowerCase()
      if (['node_modules', 'dist', 'build'].includes(bn)) continue
      out.push(...(await walk(p)))
    } else if (/\.(jsx?|mjs|cjs)$/i.test(e.name)) {
      out.push(p)
    }
  }
  return out
}

// Attempt to resolve a relative specifier to an absolute file or directory
async function resolveImport(fromFile, spec) {
  const base = path.dirname(fromFile)
  let abs = path.resolve(base, spec)

  try {
    const s = await fs.stat(abs)
    if (s.isDirectory()) {
      for (const ext of RESOLVE_EXTS) {
        const idx = path.join(abs, 'index' + ext)
        try {
          const st = await fs.stat(idx)
          if (st.isFile()) return { absPath: idx, isIndex: true, dirPath: abs }
        } catch {}
      }
      return null // dir with no index
    }
    if (s.isFile())
      return { absPath: abs, isIndex: false, dirPath: path.dirname(abs) }
  } catch {
    for (const ext of RESOLVE_EXTS) {
      const cand = abs + ext
      try {
        const st = await fs.stat(cand)
        if (st.isFile())
          return { absPath: cand, isIndex: false, dirPath: path.dirname(cand) }
      } catch {}
    }
  }
  return null
}

// Decide alias for an absolute path if it lives under an aliased folder
function aliasFor(absPathOrDir) {
  const n = path.resolve(absPathOrDir)
  let best = null

  for (const [alias, targetAbsRaw] of ALIASES) {
    const r = path.resolve(targetAbsRaw)
    const isUnder = n === r || n.startsWith(r + path.sep)
    if (isUnder) {
      const rel = path.relative(r, n)
      const relUnix = unixify(rel)
      const spec = rel ? `${alias}/${relUnix}` : alias
      if (!best || alias.length > best.alias.length) best = { alias, spec }
    }
  }

  return best ? best.spec : null
}

function isRelative(spec) {
  return spec.startsWith('./') || spec.startsWith('../')
}

function sameFolderRelative(spec) {
  return spec.startsWith('./')
}

function hasExt(spec) {
  return /\.[a-z0-9]+$/i.test(spec)
}

// build new specifier string according to extension policy and whether it's index
function buildNewSpec(originalSpec, aliased, resolved) {
  if (resolved.isIndex) {
    // Prefer folder alias without /index
    return aliased
  }

  const resolvedExt = path.extname(resolved.absPath)

  if (APPEND_EXT_MODE === 'always') {
    // ensure we have extension once
    return aliased.endsWith(resolvedExt) ? aliased : aliased + resolvedExt
  }

  if (APPEND_EXT_MODE === 'never') {
    return aliased
  }

  // auto: keep extension only if original had one
  if (hasExt(originalSpec)) {
    return aliased.endsWith(resolvedExt) ? aliased : aliased + resolvedExt
  }
  return aliased
}

// ---------- regex (order matters) ----------
// 1) ESM imports with "from", excluding side-effect imports
const importRegex =
  /(^|\s)import\s+(?!['"])(?:type\s+)?[^'"]*?\bfrom\s+['"]([^'"]+)['"];?/gm

// 2) Side-effect-only imports: import 'x';
const sideEffectImportRegex = /(^|\s)import\s+['"]([^'"]+)['"];?/gm

// 3) CommonJS require
const requireRegex =
  /(^|\s)(?:const|let|var)\s+[\w$]+\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/gm

// 4) Dynamic imports (optional via --dynamic)
const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/gm

// ---------- main per-file processor ----------
async function processFile(file) {
  const src = await fs.readFile(file, 'utf8')
  let text = src
  const report = []

  async function runRegexPass(regex, kind) {
    const matches = [...text.matchAll(regex)]
    // replace from the end to keep indices valid
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i]
      const full = m[0]
      const spec = m[2] // capture group with module specifier
      if (!spec) continue

      if (!isRelative(spec)) continue // leave bare/external alone
      if (sameFolderRelative(spec)) continue // keep ./something as-is

      const resolved = await resolveImport(file, spec)
      if (!resolved) continue

      const targetForAlias = resolved.isIndex
        ? resolved.dirPath
        : resolved.absPath
      const aliased = aliasFor(targetForAlias)
      if (!aliased) continue

      const newSpec = buildNewSpec(spec, aliased, resolved)
      const updated = full.replace(spec, newSpec)

      if (updated !== full) {
        const start = m.index
        text = text.slice(0, start) + updated + text.slice(start + full.length)
        report.push({ from: spec, to: newSpec, kind })
      }
    }
  }

  // Pass 1: ESM "from"
  await runRegexPass(importRegex, 'esm')

  // Pass 2: side-effect imports
  await runRegexPass(sideEffectImportRegex, 'side-effect')

  // Pass 3: require()
  await runRegexPass(requireRegex, 'require')

  // Pass 4: dynamic imports (optional)
  if (ENABLE_DYNAMIC) {
    await runRegexPass(dynamicImportRegex, 'dynamic')
  }

  const changed = text !== src
  return { changed, report, out: text, original: src }
}

// ---------- backups ----------
async function writeWithBackup(file, content, original) {
  // try plain .bak first
  let bakPath = file + '.bak'
  try {
    await fs.stat(bakPath)
    // exists -> create timestamped
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    bakPath = `${file}.${stamp}.bak`
  } catch {
    // ok to use .bak
  }
  await fs.writeFile(bakPath, original, 'utf8')
  await fs.writeFile(file, content, 'utf8')
}

// ---------- run ----------
async function main() {
  try {
    const st = await fs.stat(SRC)
    if (!st.isDirectory()) throw new Error('src/ is not a directory')
  } catch (e) {
    console.error('Error: cannot find src/ folder at', SRC)
    process.exit(1)
  }

  const files = await walk(SRC)
  let total = 0
  let changedFiles = 0

  for (const file of files) {
    const { changed, report, out, original } = await processFile(file)
    if (!changed) continue

    changedFiles++
    console.log(`\n${relFromRoot(file)}:`)
    report.forEach(({ from, to, kind }) => {
      console.log(`  ${from}  ->  ${to}  ${kind ? `(${kind})` : ''}`)
      total++
    })

    if (WRITE) await writeWithBackup(file, out, original)
  }

  if (total === 0) {
    console.log('No changes proposed — your imports already match the aliases.')
  } else {
    console.log(
      `\n${WRITE ? 'Applied' : 'Proposed'} ${total} update(s) across ${changedFiles} file(s).`
    )
    if (!WRITE) {
      console.log(
        'Run again with --write to apply changes (backups will be created).'
      )
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
