import fs from 'node:fs'
const f = 'components/app/AppShell.tsx'
let s = fs.readFileSync(f, 'utf8')

function mustReplace(from, to, label) {
  const fromCr = from.replace(/\n/g, '\r\n')
  const toCr = to.replace(/\n/g, '\r\n')
  if (s.includes(fromCr)) s = s.replace(fromCr, toCr)
  else if (s.includes(from)) s = s.replace(from, to)
  else throw new Error(label)
}

mustReplace(
  `import { buildReferenceSheetByLessonId } from '@/lib/reference/buildReferenceSheet'`,
  `import { buildReferenceSheetByLessonId } from '@/lib/reference/buildReferenceSheet'
import {
  consumeOpenReferenceLessonId,
  readReferenceLessonIdFromSearch,
} from '@/lib/reference/openReferenceIntent'`,
  'import intent'
)

// After storageLoaded effects - find a good hook point. Use openReferenceTopic existence.
const effect = `
  React.useEffect(() => {
    if (!storageLoaded || !featureFlags.referenceV1) return
    if (dialogStarted) return
    const fromQuery =
      typeof window !== 'undefined' ? readReferenceLessonIdFromSearch(window.location.search) : null
    const lessonId = fromQuery || consumeOpenReferenceLessonId()
    if (!lessonId) return
    if (fromQuery && typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('reference')
        url.searchParams.delete('topic')
        window.history.replaceState({}, '', \`\${url.pathname}\${url.search}\${url.hash}\`)
      } catch {
        /* ignore */
      }
    }
    void openReferenceTopic(lessonId, 'theory', { catalogBrowseIntent: 'reference' })
  }, [storageLoaded, dialogStarted, openReferenceTopic])
`

mustReplace(
  `  /** Меню «Начать урок»: всегда открывать intro с начала. */
  const openOrContinueLearningLesson = useCallback(`,
  `${effect}
  /** Меню «Начать урок»: всегда открывать intro с начала. */
  const openOrContinueLearningLesson = useCallback(`,
  'deep link effect'
)

fs.writeFileSync(f, s, 'utf8')
console.log('deep link ok')
