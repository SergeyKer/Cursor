/**
 * Parses `next build` output and checks First Load JS for `/`.
 * Usage:
 *   node scripts/check-bundle-budget.mjs --baseline   # log only (Phase 0)
 *   node scripts/check-bundle-budget.mjs --enforce    # fail if > budget (Phase 1+)
 *   node scripts/check-bundle-budget.mjs --enforce --budget=140
 *   node scripts/check-bundle-budget.mjs --baseline --save-baseline
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DEFAULT_BUDGET_KB = 140
const BASELINE_PATH = path.join(ROOT, 'docs', 'bundle-baseline.json')

const args = process.argv.slice(2)
const mode = args.includes('--enforce') ? 'enforce' : 'baseline'
const saveBaseline = args.includes('--save-baseline')
const budgetArg = args.find((a) => a.startsWith('--budget='))
const budgetKb = budgetArg ? Number.parseInt(budgetArg.split('=')[1], 10) : DEFAULT_BUDGET_KB

function parseFirstLoadKb(buildOutput) {
  const lines = buildOutput.split('\n')
  for (const line of lines) {
    if (!line.includes(' / ') && !line.includes('○ /')) continue
    const kbMatches = [...line.matchAll(/([\d.]+)\s*kB/g)]
    if (kbMatches.length < 2) continue
    const last = kbMatches[kbMatches.length - 1][1]
    return Number.parseFloat(last)
  }
  throw new Error('Could not find First Load JS for `/` in next build output')
}

function runBuild() {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npmCmd, ['run', 'build'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 20 * 1024 * 1024,
  })
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  if (result.status !== 0) {
    console.error(output)
    process.exit(result.status ?? 1)
  }
  return output
}

const buildOutput = runBuild()
const firstLoadKb = parseFirstLoadKb(buildOutput)

console.log(`First Load JS for /: ${firstLoadKb} kB (mode=${mode}, budget=${budgetKb} kB)`)

if (saveBaseline) {
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true })
  fs.writeFileSync(
    BASELINE_PATH,
    JSON.stringify({ route: '/', firstLoadKb, capturedAt: new Date().toISOString() }, null, 2) + '\n'
  )
  console.log(`Baseline saved to ${path.relative(ROOT, BASELINE_PATH)}`)
}

if (mode === 'enforce' && firstLoadKb > budgetKb) {
  console.error(`FAIL: ${firstLoadKb} kB exceeds budget ${budgetKb} kB`)
  process.exit(1)
}

if (mode === 'baseline') {
  console.log('Baseline mode: budget check skipped.')
}

process.exit(0)
