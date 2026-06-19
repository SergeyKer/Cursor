/**
 * Apply UTF-8-safe in-memory replacements to source files.
 *
 * Usage:
 *   node scripts/safe-utf8-patch.mjs --file components/app/AppShell.tsx --replacements scripts/patches/foo.json
 *   node scripts/safe-utf8-patch.mjs --file components/app/AppShell.tsx --from-git HEAD
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCyrillicIntegrity } from './check-cyrillic-integrity.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const args = { file: null, replacements: null, fromGit: null }
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--file') args.file = argv[++i]
    else if (arg === '--replacements') args.replacements = argv[++i]
    else if (arg === '--from-git') args.fromGit = argv[++i] ?? 'HEAD'
  }
  return args
}

function gitObjectPath(absFilePath) {
  const gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8', cwd: ROOT }).trim()
  return path.relative(gitRoot, path.resolve(absFilePath)).replace(/\\/g, '/')
}

function readSource({ file, replacements, fromGit }) {
  const absFile = path.resolve(ROOT, file)
  let content

  if (fromGit) {
    const gitPath = gitObjectPath(absFile)
    content = execSync(`git show ${fromGit}:${gitPath}`, { encoding: 'utf8', cwd: ROOT })
  } else {
    content = fs.readFileSync(absFile, 'utf8')
  }

  if (replacements) {
    const replPath = path.resolve(ROOT, replacements)
    const pairs = JSON.parse(fs.readFileSync(replPath, 'utf8'))
    if (!Array.isArray(pairs)) {
      throw new Error('replacements JSON must be an array of [from, to] pairs')
    }
    for (const [from, to] of pairs) {
      if (!content.includes(from)) {
        throw new Error(`Missing replacement block in ${file}: ${String(from).slice(0, 80)}`)
      }
      content = content.replace(from, to)
    }
  }

  return { absFile, content }
}

function main() {
  const args = parseArgs(process.argv)
  if (!args.file) {
    console.error('Usage: node scripts/safe-utf8-patch.mjs --file <path> [--replacements <json>] [--from-git <rev>]')
    process.exit(1)
  }

  const { absFile, content } = readSource(args)
  fs.writeFileSync(absFile, content, 'utf8')

  const failures = checkCyrillicIntegrity({ root: ROOT, files: [absFile] })
  if (failures.length > 0) {
    console.error('safe-utf8-patch: check:cyrillic failed after write')
    for (const { relPath, violations } of failures) {
      for (const v of violations) {
        console.error(`  ${relPath}:L${v.line} [${v.type}] ${v.snippet}`)
      }
    }
    process.exit(1)
  }

  console.log('safe-utf8-patch OK:', path.relative(ROOT, absFile).replace(/\\/g, '/'))
}

main()
