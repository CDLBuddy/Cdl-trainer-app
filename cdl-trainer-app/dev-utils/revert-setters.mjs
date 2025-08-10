#!/usr/bin/env node
import { promises as fs } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = 'src'
const exts = new Set(['.js', '.jsx'])
const WRITE = process.argv.includes('--write')

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!['node_modules','dist','build','.git'].includes(e.name)) {
        await walk(join(dir, e.name), out)
      }
    } else if (exts.has(extname(e.name))) {
      out.push(join(dir, e.name))
    }
  }
  return out
}

const files = await walk(ROOT)
let touched = 0
for (const file of files) {
  const orig = await fs.readFile(file, 'utf8')

  // global replace _setX -> setX (safe because ESLint ignores unused setters)
  const updated = orig.replace(/\b_set([A-Z][A-Za-z0-9_]*)\b/g, 'set$1')

  if (updated !== orig) {
    touched++
    console.log(file)
    if (WRITE) {
      await fs.copyFile(file, file + '.bak')
      await fs.writeFile(file, updated, 'utf8')
    }
  }
}

console.log(WRITE ? `Applied to ${touched} file(s). Backups: .bak`
                  : `Dry run. Would touch ${touched} file(s). Add --write to apply.`)
