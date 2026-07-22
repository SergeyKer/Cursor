import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCyrillicIntegrity } from '../check-cyrillic-integrity.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const FILE = path.join(ROOT, 'components/app/AppShell.tsx')
let s = fs.readFileSync(FILE, 'utf8')

const pairs = [
  [
    `import {
  resolveTeacherDetectPhase,
  shouldAllowTeacherHandoffReclaim,
} from '@/lib/engvo/teacherHandoffReclaim'`,
    `import {
  resolveTeacherDetectPhase,
  shouldAllowTeacherDrillReclaim,
} from '@/lib/engvo/teacherHandoffReclaim'`,
  ],
  [
    `      const allow = shouldAllowTeacherHandoffReclaim({
        userFinalCount: engvoTeacherUserFinalCountRef.current,
        awaitingFirstDrill: engvoTeacherAwaitingFirstDrillRef.current,
        attemptsThisUserTurn: engvoTeacherReclaimAttemptsThisUserTurnRef.current,
      })`,
    `      const allow = shouldAllowTeacherDrillReclaim({
        userFinalCount: engvoTeacherUserFinalCountRef.current,
        awaitingFirstDrill: engvoTeacherAwaitingFirstDrillRef.current,
        attemptsThisUserTurn: engvoTeacherReclaimAttemptsThisUserTurnRef.current,
        usedThisUserTurn: engvoTeacherReclaimUsedThisUserTurnRef.current,
      })`,
  ],
]

for (const [from, to] of pairs) {
  if (!s.includes(from)) throw new Error(`Missing: ${from.slice(0, 80)}`)
  s = s.replace(from, to)
}

fs.writeFileSync(FILE, s, 'utf8')
const failures = checkCyrillicIntegrity({ root: ROOT, files: [FILE] })
if (failures.length) {
  console.error(failures)
  process.exit(1)
}
console.log('ok')
