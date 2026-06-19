import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const target = path.join(root, 'components/app/AppShell.tsx')

const gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8', cwd: root }).trim()
const legacySourceGitPath = path
  .relative(gitRoot, path.join(root, 'app/page.tsx'))
  .replace(/\\/g, '/')
let src = execSync(`git show efa651e:${legacySourceGitPath}`, { encoding: 'utf8', cwd: root })

const replacements = [
  [
    `import MenuSectionPanels, {
  type LessonMenuContext,
  type LessonsPanel,
  type LearningLessonMenuMeta,
  type MenuView,
} from '@/components/MenuSectionPanels'`,
    `import type {
  LessonMenuContext,
  LessonsPanel,
  LearningLessonMenuMeta,
  MenuView,
} from '@/components/branches/HubBranch'`,
  ],
  [
    `import LessonIntroScreen, { type LessonIntroDepth } from '@/components/LessonIntroScreen'
import LessonBriefingScreen from '@/components/LessonBriefingScreen'
import LessonExtraTipsScreen, {
  type LessonExtraTipsFooterStatus,
  type LessonExtraTipsSavedState,
} from '@/components/LessonExtraTipsScreen'
import LessonStepRenderer from '@/components/LessonStepRenderer'`,
    `import type { LessonIntroDepth } from '@/components/branches/LessonBranch'
import type {
  LessonExtraTipsFooterStatus,
  LessonExtraTipsSavedState,
} from '@/components/branches/LessonBranch'`,
  ],
  [
    `import PracticeScreen from '@/components/practice/PracticeScreen'
import AccentTrainer, { type AccentFooterView } from '@/components/accent/AccentTrainer'`,
    `import type { AccentFooterView } from '@/components/branches/AccentBranch'`,
  ],
  [
    `const Chat = dynamic(() => import('@/components/Chat'))
import SlideOutMenu from '@/components/SlideOutMenu'
const VocabularyWorldsScreen = dynamic(() => import('@/components/vocabulary/VocabularyWorldsScreen'))
const VocabularyByLevelScreen = dynamic(() => import('@/components/vocabulary/VocabularyByLevelScreen'))`,
    `const MenuSectionPanels = dynamic(() => import('@/components/branches/HubBranch'))
const Chat = dynamic(() => import('@/components/branches/ChatBranch'))
const LessonIntroScreen = dynamic(() =>
  import('@/components/branches/LessonBranch').then((m) => ({ default: m.LessonIntroScreen }))
)
const LessonBriefingScreen = dynamic(() =>
  import('@/components/branches/LessonBranch').then((m) => ({ default: m.LessonBriefingScreen }))
)
const LessonExtraTipsScreen = dynamic(() =>
  import('@/components/branches/LessonBranch').then((m) => ({ default: m.LessonExtraTipsScreen }))
)
const LessonStepRenderer = dynamic(() =>
  import('@/components/branches/LessonBranch').then((m) => ({ default: m.LessonStepRenderer }))
)
const PracticeScreen = dynamic(() => import('@/components/branches/PracticeBranch'))
const AccentTrainer = dynamic(() => import('@/components/branches/AccentBranch'))
const VocabularyWorldsScreen = dynamic(() =>
  import('@/components/branches/VocabularyBranch').then((m) => ({ default: m.VocabularyWorldsScreen }))
)
const VocabularyByLevelScreen = dynamic(() =>
  import('@/components/branches/VocabularyBranch').then((m) => ({ default: m.VocabularyByLevelScreen }))
)
import SlideOutMenu from '@/components/SlideOutMenu'`,
  ],
  [
    'export default function Home() {',
    `import { AppShellProvider } from '@/components/app/AppShellContext'
import type { StartBridgeState } from '@/lib/start/startBridge'
import { resolveActiveBranch } from '@/lib/start/activeBranch'
import type { BranchId } from '@/lib/start/branchRegistry'
import { useBranchLoader } from '@/hooks/useBranchLoader'
import type { AppShellProps } from '@/components/app/AppShell.types'

export type { AppShellProps } from '@/components/app/AppShell.types'

export default function AppShell({ entryBridge = null, onRuntimeReady }: AppShellProps) {`,
  ],
  [
    '  const [homeAudienceChosen, setHomeAudienceChosen] = useState(false)',
    `  const [homeAudienceChosen, setHomeAudienceChosen] = useState(false)
  const { ensureBranchMounted, isBranchMounted } = useBranchLoader()`,
  ],
  [
    `        const mergedSettings = normalizeSettingsForAudience({
          ...state.settings,
          openAiChatPreset: 'gpt-4o-mini',
        })
        setSettings(mergedSettings)
        setDialogStarted(false)`,
    `        const mergedSettings = normalizeSettingsForAudience({
          ...state.settings,
          openAiChatPreset: 'gpt-4o-mini',
          ...(entryBridge?.audienceChosen && entryBridge.audience
            ? { audience: entryBridge.audience }
            : {}),
        })
        setSettings(mergedSettings)
        if (entryBridge?.audienceChosen) {
          setHomeAudienceChosen(true)
          if (entryBridge.branchIntent === 'chat') setHomeMenuView('aiChat')
          if (entryBridge.branchIntent === 'hub') setHomeMenuView('lessons')
        }
        setDialogStarted(false)`,
  ],
  [
    `      setFooterHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!storageLoaded) return
    saveEngvoCefrLevel(engvoCefrLevel)
  }, [engvoCefrLevel, storageLoaded])`,
    `      setFooterHydrated(true)
    }
    // Mount-only hydration: entryBridge is read once via initialLoadDoneRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!storageLoaded) return
    void loadLessonById('1')
  }, [storageLoaded])

  useEffect(() => {
    if (!storageLoaded) return
    onRuntimeReady?.()
  }, [storageLoaded, onRuntimeReady])

  useEffect(() => {
    if (!storageLoaded) return
    if (!entryBridge?.audienceChosen || !entryBridge.audience) return
    setSettings((prev) =>
      normalizeSettingsForAudience({
        ...prev,
        audience: entryBridge.audience!,
      })
    )
    setHomeAudienceChosen(true)
    if (entryBridge.branchIntent === 'chat') setHomeMenuView('aiChat')
    if (entryBridge.branchIntent === 'hub') setHomeMenuView('lessons')
  }, [storageLoaded, entryBridge?.audience, entryBridge?.audienceChosen, entryBridge?.branchIntent])

  useEffect(() => {
    if (!storageLoaded) return
    saveEngvoCefrLevel(engvoCefrLevel)
  }, [engvoCefrLevel, storageLoaded])`,
  ],
  [
    `  const isStructuredLessonActive = Boolean(activeStructuredLesson && activeStructuredLessonStep && lessonViewStage === 'lesson')

  useEffect(() => {
    handleStructuredLessonPuzzleProgressChange(null)
  }, [`,
    `  const isStructuredLessonActive = Boolean(activeStructuredLesson && activeStructuredLessonStep && lessonViewStage === 'lesson')

  const activeBranchResolved = useMemo(
    (): BranchId | null =>
      resolveActiveBranch({
        dialogStarted,
        homeMenuView,
        engvoVoiceMode,
        isVocabularyHubActive,
        isAccentActive,
        isPracticeActive,
        isStructuredLessonActive,
        isLessonIntroActive,
        isLessonTipsActive,
        isLessonBriefingActive,
        isTutorLessonPending,
      }),
    [
      dialogStarted,
      engvoVoiceMode,
      homeMenuView,
      isAccentActive,
      isLessonBriefingActive,
      isLessonIntroActive,
      isLessonTipsActive,
      isPracticeActive,
      isStructuredLessonActive,
      isTutorLessonPending,
      isVocabularyHubActive,
    ]
  )

  useEffect(() => {
    if (!activeBranchResolved) return
    void ensureBranchMounted(activeBranchResolved)
  }, [activeBranchResolved, ensureBranchMounted])

  useEffect(() => {
    handleStructuredLessonPuzzleProgressChange(null)
  }, [`,
  ],
  [
    `  return (
    <div
      data-audience={settings.audience}`,
    `  return (
    <AppShellProvider value={{ activeBranch: activeBranchResolved, isBranchMounted }}>
    <div
      data-audience={settings.audience}`,
  ],
  [
    `      ) : null}
    </div>
  )
}
`,
    `      ) : null}
    </div>
    </AppShellProvider>
  )
}
`,
  ],
  [
    `import { getStructuredLessonById } from '@/lib/structuredLessons'`,
    `import { getStructuredLessonById, loadLessonById } from '@/lib/structuredLessons'`,
  ],
]

for (const [from, to] of replacements) {
  if (!src.includes(from)) {
    console.error('Missing block:', from.slice(0, 120))
    process.exit(1)
  }
  src = src.replace(from, to)
}

// ESLint exhaustive-deps fixes
src = src.replace(
  `  }, [activeStructuredLessonStatus, activeStructuredLesson?.id, activeStructuredLesson?.runKey])`,
  `  }, [activeStructuredLessonStatus, activeStructuredLesson])`
)
src = src.replace(
  `  }, [
    activeStructuredLesson?.id,
    activeStructuredLesson?.runKey,
    lessonViewStage,
    goToStructuredLessonFinale,
  ])`,
  `  }, [activeStructuredLesson, lessonViewStage, goToStructuredLessonFinale])`
)
src = src.replace(
  `  }, [
    activeStructuredLesson,
    activeLessonVariantNumber,
    rewardsState.coinLedger,
    settings.audience,
    structuredLessonSilverCap,
  ])`,
  `  }, [
    activeStructuredLesson,
    activeLessonVariantNumber,
    rewardsState,
    settings.audience,
    structuredLessonSilverCap,
  ])`
)
src = src.replace(
  `  }, [
    lessonViewStage,
    activeStructuredLesson,
    activeStructuredLesson?.runKey,
    activeLessonVariantNumber,`,
  `  }, [
    lessonViewStage,
    activeStructuredLesson,
    activeLessonVariantNumber,`
)
src = src.replace(
  `  }, [
    footerSessionContextNonce,
    isAccentActive,
    isLessonActive,
    isLessonIntroActive,
    isLessonTipsActive,
    isPracticeActive,
    isStructuredLessonActive,
    settings.audience,
  ])`,
  `  }, [
    footerSessionContextNonce,
    isAccentActive,
    isLessonActive,
    isLessonIntroActive,
    isLessonTipsActive,
    isLessonBriefingActive,
    isPracticeActive,
    isStructuredLessonActive,
    settings.audience,
  ])`
)

fs.writeFileSync(target, src, 'utf8')
const corrupted = (src.match(/\?{3,}/g) ?? []).length
console.log('AppShell.tsx regenerated, bytes:', fs.statSync(target).size, 'corrupted blocks:', corrupted)
