import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), '')
const FORBIDDEN = ['PracticeScreen', 'usePracticeSession', 'PracticeQuestionRenderer']

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, files)
    else if (/\.(ts|tsx)$/.test(name) && !name.includes('.test.')) files.push(full)
  }
  return files
}

describe('quickTest isolation', () => {
  it('does not import practice orchestration', () => {
    const dirs = [join(ROOT, 'app/test'), join(ROOT, 'components/quickTest'), join(ROOT, 'lib/quickTest')]
    const offenders: string[] = []
    for (const dir of dirs) {
      for (const file of walk(dir)) {
        const text = readFileSync(file, 'utf8')
        for (const token of FORBIDDEN) {
          if (text.includes(token)) offenders.push(`${file} -> ${token}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
