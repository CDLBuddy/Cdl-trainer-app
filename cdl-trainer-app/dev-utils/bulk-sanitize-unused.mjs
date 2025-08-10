#!/usr/bin/env node
// dev-utils/bulk-sanitize-unused.mjs
// Usage:
//   node dev-utils/bulk-sanitize-unused.mjs          (dry run)
//   node dev-utils/bulk-sanitize-unused.mjs --write  (apply with .bak backups)

import { promises as fs } from 'node:fs'
import path from 'node:path'

const ROOT = 'src'
const EXTS = new Set(['.js', '.jsx'])
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git'])
const WRITE = process.argv.includes('--write')

function unixify(p) {
  return p.split(path.sep).join('/')
}

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) await walk(full, out)
    } else if (EXTS.has(path.extname(e.name))) {
      out.push(full)
    }
  }
  return out
}

// --- Minimal JS scanner to find the matching } for a { ---
function findMatchingBrace(text, openIndex) {
  let i = openIndex
  let depth = 0
  let inS = false,
    inD = false,
    inT = false
  let inLine = false,
    inBlock = false

  const len = text.length
  while (i < len) {
    const c = text[i]
    const n = text[i + 1]

    if (inLine) {
      if (c === '\n') inLine = false
      i++
      continue
    }
    if (inBlock) {
      if (c === '*' && n === '/') {
        inBlock = false
        i += 2
        continue
      }
      i++
      continue
    }
    if (inS) {
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === "'") inS = false
      i++
      continue
    }
    if (inD) {
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === '"') inD = false
      i++
      continue
    }
    if (inT) {
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === '`') inT = false
      i++
      continue
    }

    // entering comments
    if (c === '/' && n === '/') {
      inLine = true
      i += 2
      continue
    }
    if (c === '/' && n === '*') {
      inBlock = true
      i += 2
      continue
    }

    // entering strings
    if (c === "'") {
      inS = true
      i++
      continue
    }
    if (c === '"') {
      inD = true
      i++
      continue
    }
    if (c === '`') {
      inT = true
      i++
      continue
    }

    if (c === '{') {
      depth++
    }
    if (c === '}') {
      depth--
      if (depth === 0) return i
    }
    i++
  }
  return -1
}

// Replace catch param only if unused inside its block
function sanitizeUnusedCatchParams(src) {
  const changes = []
  let out = src
  const re = /catch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{/g
  let match
  // We need to rebuild with offsets as we go
  let offset = 0

  while ((match = re.exec(src)) !== null) {
    const id = match[1]
    const parenStart = match.index
    const bracePos = src.indexOf('{', re.lastIndex - 1)
    if (bracePos === -1) continue

    const blockEnd = findMatchingBrace(src, bracePos)
    if (blockEnd === -1) continue

    const body = src.slice(bracePos + 1, blockEnd)
    const used = new RegExp(`\\b${id}\\b`).test(body)
    if (used) continue // do not rename if used

    // position of identifier within original string
    const idStart = match.index + match[0].indexOf(id)
    const idEnd = idStart + id.length

    // apply in 'out' with current offset
    const adjStart = idStart + offset
    const adjEnd = idEnd + offset
    out = out.slice(0, adjStart) + `_${id}` + out.slice(adjEnd)
    offset += 1 // we added one char "_"
    changes.push(`catch(${id})→_${id}`)
  }

  return { text: out, changes }
}

// Rename setX in const/let destructure ONLY if that setter is unused elsewhere
function sanitizeUnusedSetters(src) {
  const changes = []
  let out = src

  // matches: const [state, setSomething] = useState(…)
  const declRe =
    /(?:const|let|var)\s*\[\s*([^\]]*?)\s*,\s*(set[A-Z][A-Za-z0-9_]*)\s*\]\s*=\s*(?:React\.)?useState\b/g

  // We’ll collect edits then apply from end to start
  const edits = []
  let m
  while ((m = declRe.exec(src)) !== null) {
    const setter = m[2]
    const setterWord = new RegExp(`\\b${setter}\\b`, 'g')

    let count = 0
    while (setterWord.exec(src)) count++

    // If appears only once (this declaration), it’s safe to prefix
    if (count === 1) {
      // location of setter token
      const setterPos = m.index + m[0].indexOf(setter)
      edits.push({
        start: setterPos,
        end: setterPos + setter.length,
        name: setter,
      })
    }
  }

  // Apply edits from the back so indices stay valid
  edits.sort((a, b) => b.start - a.start)
  for (const e of edits) {
    out = out.slice(0, e.start) + `_${e.name}` + out.slice(e.end)
    changes.push(`setX(${e.name})→_${e.name}`)
  }

  return { text: out, changes }
}

async function writeWithBackup(file, content, original) {
  let bak = file + '.bak'
  try {
    await fs.stat(bak)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    bak = `${file}.${stamp}.bak`
  } catch {}
  await fs.writeFile(bak, original, 'utf8')
  await fs.writeFile(file, content, 'utf8')
}

async function main() {
  // sanity
  try {
    const st = await fs.stat(ROOT)
    if (!st.isDirectory()) throw new Error('src/ is not a directory')
  } catch {
    console.error('Error: cannot find src/ folder')
    process.exit(1)
  }

  const files = await walk(ROOT)
  let touched = 0

  for (const file of files) {
    const original = await fs.readFile(file, 'utf8')

    const c1 = sanitizeUnusedCatchParams(original)
    const c2 = sanitizeUnusedSetters(c1.text)

    const changed = c1.changes.length || c2.changes.length
    if (!changed) continue

    touched++
    const rel = unixify(path.relative(process.cwd(), file))
    console.log(`${rel}  ${[...c1.changes, ...c2.changes].join(', ')}`)

    if (WRITE) {
      await writeWithBackup(file, c2.text, original)
    }
  }

  console.log(
    WRITE
      ? `\nApplied to ${touched} file(s). Backups created (.bak / timestamped).`
      : `\nDry run. Changes would touch ${touched} file(s). Add --write to apply.`
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
