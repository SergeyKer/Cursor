/**
 * Fails when Cyrillic UI copy was corrupted (????? placeholders or UTF-8 mojibake).
 * Usage: node scripts/check-cyrillic-integrity.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SCAN_DIRS = ['components', 'lib', 'app']
const EXTENSIONS = new Set(['.ts', '.tsx'])
const CYRILLIC = /[А-Яа-яЁё]/
const MOJIBAKE = /Ð[\u0080-\u00BF]/
const APP_SHELL_REL = 'components/app/AppShell.tsx'

function isTestFile(relPath) {
  return /\.test\.(ts|tsx)$/.test(relPath)
}

function walkSourceFiles() {
  const files = []
  for (const dirName of SCAN_DIRS) {
    const dir = path.join(ROOT, dirName)
    if (!fs.existsSync(dir)) continue
    walkDir(dir, files)
  }
  return files
}

function walkDir(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      walkDir(full, files)
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full)
    }
  }
}

function isCommentOnlyLine(trimmed) {
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
}

function scanFileContent(content, relPath) {
  const violations = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNo = i + 1
    const trimmed = line.trim()
    if (!trimmed || isCommentOnlyLine(trimmed)) continue

    if (MOJIBAKE.test(line)) {
      violations.push({
        type: 'mojibake',
        line: lineNo,
        snippet: trimmed.slice(0, 100),
      })
    }

    for (const match of line.matchAll(/'([^'\\]|\\.)*'|"([^"\\]|\\.)*"|`([^`\\]|\\.)*`/g)) {
      if (/\?{3,}/.test(match[0])) {
        violations.push({
          type: 'placeholder-string',
          line: lineNo,
          snippet: match[0].slice(0, 100),
        })
      }
    }

    for (const match of line.matchAll(/\/(?:\\.|[^/\\])+\/[dgimsuvy]*/g)) {
      if (/\?{3,}/.test(match[0])) {
        violations.push({
          type: 'placeholder-regex',
          line: lineNo,
          snippet: match[0].slice(0, 100),
        })
      }
    }
  }

  if (relPath === APP_SHELL_REL) {
    if (!CYRILLIC.test(content)) {
      violations.push({
        type: 'appshell-no-cyrillic',
        line: 1,
        snippet: 'AppShell must contain Cyrillic UI strings',
      })
    }
  }

  return violations
}

export function checkCyrillicIntegrity(options = {}) {
  const root = options.root ?? ROOT
  const files = options.files ?? walkSourceFiles()
  const failures = []

  for (const filePath of files) {
    const relPath = path.relative(root, filePath).replace(/\\/g, '/')
    if (isTestFile(relPath)) continue

    const content = fs.readFileSync(filePath, 'utf8')
    const violations = scanFileContent(content, relPath)
    if (violations.length > 0) {
      failures.push({ relPath, violations })
    }
  }

  return failures
}

function main() {
  const failures = checkCyrillicIntegrity()

  if (failures.length === 0) {
    console.log('check:cyrillic OK')
    return
  }

  console.error('check:cyrillic FAILED\n')
  for (const { relPath, violations } of failures) {
    console.error(`${relPath}:`)
    for (const v of violations) {
      console.error(`  L${v.line} [${v.type}] ${v.snippet}`)
    }
    console.error('')
  }
  process.exit(1)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main()
}
