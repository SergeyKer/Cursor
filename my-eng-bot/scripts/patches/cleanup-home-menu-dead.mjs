import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCyrillicIntegrity } from '../check-cyrillic-integrity.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const FILE = path.join(ROOT, 'components/app/AppShell.tsx')
let out = fs.readFileSync(FILE, 'utf8')

function rep(from, to, label) {
  if (!out.includes(from)) throw new Error('missing: ' + label)
  out = out.replace(from, to)
}

rep('  listLearningSignals,\n', '', 'listLearningSignals import')
rep("import type { AiChatPanel } from '@/lib/aiChatPanel'\n", '', 'AiChatPanel import')
rep("  const [homeAiChatPanel, setHomeAiChatPanel] = useState<AiChatPanel>('summary')\n", '', 'homeAiChatPanel state')
rep(
  `  React.useEffect(() => {
    if (homeMenuView !== 'aiChat') setHomeAiChatPanel('summary')
  }, [homeMenuView])

`,
  '',
  'homeAiChatPanel effect'
)
rep(
  `  const handleStartChatFromHome = useCallback(() => {
    setComposerSessionKey((k) => k + 1)
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    setEngvoVoiceMode(false)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    resetStructuredLessonSession()
    setDialogStarted(true)
  }, [cleanupEngvoRuntime, resetStructuredLessonSession])

`,
  '',
  'handleStartChatFromHome'
)

fs.writeFileSync(FILE, out, 'utf8')
const failures = checkCyrillicIntegrity({ root: ROOT, files: [FILE] })
if (failures.length) {
  console.error(failures)
  process.exit(1)
}
console.log('cleanup-dead: OK')
