import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCyrillicIntegrity } from '../check-cyrillic-integrity.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const file = path.join(ROOT, 'components/app/AppShell.tsx')
let content = fs.readFileSync(file, 'utf8')

const pairs = [
  [
    "import { loadVocabMistakes } from '@/lib/vocabulary/mistakesList'\n",
    "import { loadVocabMistakes } from '@/lib/vocabulary/mistakesList'\nimport type { ProgressLaunchTarget } from '@/lib/progress/progressActions'\n",
  ],
  [
    `  const launchFromProgress = useCallback(
    async (target: {
      kind: string
      lessonId?: string
      mode?: 'relaxed' | 'balanced' | 'challenge'
    }) => {`,
    `  const launchFromProgress = useCallback(
    async (target: ProgressLaunchTarget) => {`,
  ],
  [
    `      if (target.kind === 'vocabulary') {
        setProgressSpaceActive(false)
        openVocabularyWorlds()
        return
      }`,
    `      if (target.kind === 'vocabulary') {
        setProgressSpaceActive(false)
        openVocabularyWorlds()
        return
      }
      if (target.kind === 'translation') {
        setProgressSpaceActive(false)
        setSettings((s) => ({ ...s, mode: 'translation' }))
        setDialogStarted(true)
        setMenuOpen(false)
        return
      }
      if (target.kind === 'dialogue') {
        setProgressSpaceActive(false)
        setSettings((s) => ({ ...s, mode: 'dialogue' }))
        setDialogStarted(true)
        setMenuOpen(false)
        return
      }
      if (target.kind === 'tutor') {
        openTutorChat()
        return
      }
      if (target.kind === 'pronunciation') {
        setProgressSpaceActive(false)
        openAccentTrainer()
        return
      }`,
  ],
  [
    `    [
      openLearningLesson,
      openMyPlanFromProgress,
      openPracticeSession,
      openReferenceTopic,
      openVocabularyWorlds,
      progressPracticeBusy,
      settings.level,
      startEngvoCall,
    ]
  )`,
    `    [
      openAccentTrainer,
      openLearningLesson,
      openMyPlanFromProgress,
      openPracticeSession,
      openReferenceTopic,
      openTutorChat,
      openVocabularyWorlds,
      progressPracticeBusy,
      settings.level,
      startEngvoCall,
    ]
  )`,
  ],
]

for (const [from, to] of pairs) {
  if (!content.includes(from)) {
    throw new Error(`Missing replacement block: ${from.slice(0, 120)}`)
  }
  content = content.replace(from, to)
}

fs.writeFileSync(file, content, 'utf8')
const failures = checkCyrillicIntegrity({ root: ROOT, files: [file] })
if (failures.length > 0) {
  console.error('cyrillic check failed')
  for (const { relPath, violations } of failures) {
    for (const v of violations) {
      console.error(`  ${relPath}:L${v.line} [${v.type}] ${v.snippet}`)
    }
  }
  process.exit(1)
}
console.log('patched AppShell launchFromProgress')
