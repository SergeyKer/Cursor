/**
 * Apply home level-2 CTAs + remove robot shell + openMenuAt wiring in AppShell.
 * UTF-8 safe: read/write utf8, then check:cyrillic.
 *
 * Usage: node scripts/patches/apply-home-menu-slide.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCyrillicIntegrity } from '../check-cyrillic-integrity.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const FILE = path.join(ROOT, 'components/app/AppShell.tsx')

function mustReplace(content, from, to, label) {
  if (!content.includes(from)) {
    throw new Error(`Missing block: ${label}\n---\n${from.slice(0, 120)}`)
  }
  const next = content.replace(from, to)
  if (next === content) throw new Error(`Replace produced no change: ${label}`)
  return next
}

function mustReplaceOnce(content, from, to, label) {
  const count = content.split(from).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 occurrence, found ${count}`)
  return mustReplace(content, from, to, label)
}

let content = fs.readFileSync(FILE, 'utf8')

// 1) Drop robot-shell imports
content = mustReplaceOnce(
  content,
  `import { getHomeMenuInstruction } from '@/lib/homeMenuInstruction'\n`,
  '',
  'remove getHomeMenuInstruction import'
)
content = mustReplaceOnce(
  content,
  `import { HomeMenuInstructionBubble } from '@/components/HomeMenuInstructionBubble'\n`,
  '',
  'remove HomeMenuInstructionBubble import'
)
content = mustReplaceOnce(
  content,
  `import { hasAnyLearningHistory, resolveReturningHomeMenuView, shouldOpenMyPlanHome } from '@/lib/myPlan/returningHome'\n`,
  `import { resolveReturningHomeMenuView } from '@/lib/myPlan/returningHome'\n`,
  'narrow returningHome import'
)

// 2) State: requestedMenuView; drop pendingHome restore
content = mustReplaceOnce(
  content,
  `  const [homeAudienceChosen, setHomeAudienceChosen] = useState(false)\n`,
  `  const [homeAudienceChosen, setHomeAudienceChosen] = useState(false)\n  const [requestedMenuView, setRequestedMenuView] = useState<MenuView | null>(null)\n`,
  'add requestedMenuView state'
)
content = mustReplaceOnce(
  content,
  `  /** Откуда запущен урок: боковое меню или встроенный блок на главной. */\n  const lessonMenuLaunchSurfaceRef = React.useRef<'slide' | 'home'>('home')\n`,
  `  /** Откуда запущен урок: всегда slide после снятия robot-shell. */\n  const lessonMenuLaunchSurfaceRef = React.useRef<'slide' | 'home'>('slide')\n`,
  'default launch surface slide'
)
content = mustReplaceOnce(
  content,
  `  /** Одноразовое восстановление встроенного меню уроков на главной после «Назад». */\n  const [pendingHomeLessonMenuRestore, setPendingHomeLessonMenuRestore] = useState(false)\n`,
  '',
  'remove pendingHomeLessonMenuRestore'
)

// 3) openMenuAt after handleHomeMenuViewChange block — insert after handleHomeMenuViewChange
content = mustReplaceOnce(
  content,
  `  const handleHomeMenuViewChange = useCallback(
    (v: MenuView) => {
      if (v === 'root' && homeMenuView !== 'root' && !dialogStarted) {
        setWelcomeCompact(false)
        setGreetingNonce((n) => n + 1)
      }
      if (v !== homeMenuView) {
        setFooterTransitionText(null)
        bumpFooterSessionContext()
      }
      setHomeMenuView(v)
    },
    [homeMenuView, dialogStarted, bumpFooterSessionContext]
  )
`,
  `  const handleHomeMenuViewChange = useCallback(
    (v: MenuView) => {
      if (v === 'root' && homeMenuView !== 'root' && !dialogStarted) {
        setWelcomeCompact(false)
        setGreetingNonce((n) => n + 1)
      }
      if (v !== homeMenuView) {
        setFooterTransitionText(null)
        bumpFooterSessionContext()
      }
      setHomeMenuView(v)
    },
    [homeMenuView, dialogStarted, bumpFooterSessionContext]
  )

  const openMenuAt = useCallback((view: MenuView) => {
    setHomeMenuView('root')
    setRequestedMenuView(view)
    setMenuOpen(true)
  }, [])

  const clearRequestedMenuView = useCallback(() => {
    setRequestedMenuView(null)
  }, [])
`,
  'add openMenuAt helpers'
)

// 4) goToStartScreen clears request
content = mustReplaceOnce(
  content,
  `    setHomeMenuView('root')
    setHomeAudienceChosen(false)
    setMenuOpen(false)
`,
  `    setHomeMenuView('root')
    setHomeAudienceChosen(false)
    setRequestedMenuView(null)
    setMenuOpen(false)
`,
  'goToStartScreen clear request'
)

// 5) Remove homeLessonMenuRestore memo + effect
content = mustReplaceOnce(
  content,
  `  const homeLessonMenuRestore = React.useMemo(() => {
    if (!pendingHomeLessonMenuRestore || dialogStarted || homeMenuView !== 'lessons' || !lessonMenuContext) {
      return null
    }
    return {
      panel: lessonMenuContext.lessonsPanel,
      context: {
        activeGrammarCategoryId: lessonMenuContext.activeGrammarCategoryId,
        activeTheoryTagId: lessonMenuContext.activeTheoryTagId,
        theorySearchQuery: lessonMenuContext.theorySearchQuery,
        activeTheoryTagIds: lessonMenuContext.activeTheoryTagIds,
        theoryLessonSource: lessonMenuContext.theoryLessonSource,
        theoryTagBrowseLevel: lessonMenuContext.theoryTagBrowseLevel,
        practiceTheoryTagFilterId: lessonMenuContext.practiceTheoryTagFilterId,
        selectedLessonId: lessonMenuContext.selectedLessonId,
        catalogBrowseIntent: lessonMenuContext.catalogBrowseIntent ?? null,
      },
    }
  }, [pendingHomeLessonMenuRestore, dialogStarted, homeMenuView, lessonMenuContext])

  React.useEffect(() => {
    if (!pendingHomeLessonMenuRestore || dialogStarted || homeMenuView !== 'lessons') return
    setPendingHomeLessonMenuRestore(false)
  }, [pendingHomeLessonMenuRestore, dialogStarted, homeMenuView, homeLessonMenuRestore])

`,
  '',
  'remove homeLessonMenuRestore'
)

// 6) backToLessonList — always slide
content = mustReplaceOnce(
  content,
  `  const backToLessonList = useCallback(() => {
    const launchSurface = lessonMenuLaunchSurfaceRef.current
    const fromMyPlan = openedFromMyPlanRef.current
    if (fromMyPlan) openedFromMyPlanRef.current = false
    firstMessageRequestIdRef.current += 1
    firstMessageInFlightRef.current = false
    setDialogStarted(false)
    setMessages([])
    setSettingsAtLastSend(null)
    setLoading(false)
    setRetryMessage(null)
    setForceNextMicLang(null)
    setLoadingTranslationIndex(null)
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    setEngvoVoiceMode(false)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    // Сохраняем контекст ветки уроков, чтобы "Назад" возвращал в тот же раздел.
    resetStructuredLessonSession({ keepLessonMenuContext: !fromMyPlan })
    setFooterTransitionText(null)
    bumpFooterSessionContext()
    if (fromMyPlan) {
      if (featureFlags.myPlanSpaceV1) {
        openMyPlanSpace()
        return
      }
      setHomeMenuView('myPlan')
      if (launchSurface === 'slide') {
        setMenuOpen(true)
        return
      }
      setMenuOpen(false)
      return
    }
    if (launchSurface === 'slide') {
      restoreLessonMenuOnNextOpenRef.current = true
      setHomeMenuView('lessons')
      setMenuOpen(true)
      return
    }
    setHomeMenuView('lessons')
    setPendingHomeLessonMenuRestore(true)
    setMenuOpen(false)
  }, [bumpFooterSessionContext, cleanupEngvoRuntime, openMyPlanSpace, resetStructuredLessonSession])
`,
  `  const backToLessonList = useCallback(() => {
    const fromMyPlan = openedFromMyPlanRef.current
    if (fromMyPlan) openedFromMyPlanRef.current = false
    firstMessageRequestIdRef.current += 1
    firstMessageInFlightRef.current = false
    setDialogStarted(false)
    setMessages([])
    setSettingsAtLastSend(null)
    setLoading(false)
    setRetryMessage(null)
    setForceNextMicLang(null)
    setLoadingTranslationIndex(null)
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    setEngvoVoiceMode(false)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    // Сохраняем контекст ветки уроков, чтобы "Назад" возвращал в тот же раздел.
    resetStructuredLessonSession({ keepLessonMenuContext: !fromMyPlan })
    setFooterTransitionText(null)
    bumpFooterSessionContext()
    setHomeMenuView('root')
    if (fromMyPlan) {
      if (featureFlags.myPlanSpaceV1) {
        openMyPlanSpace()
        return
      }
      openMenuAt('myPlan')
      return
    }
    restoreLessonMenuOnNextOpenRef.current = true
    setMenuOpen(true)
  }, [bumpFooterSessionContext, cleanupEngvoRuntime, openMenuAt, openMyPlanSpace, resetStructuredLessonSession])
`,
  'backToLessonList slide-only'
)

// 7) backToVocabularyMenu → slide + restore words
content = mustReplaceOnce(
  content,
  `  const backToVocabularyMenu = useCallback(() => {
    firstMessageRequestIdRef.current += 1
    firstMessageInFlightRef.current = false
    setDialogStarted(false)
    setMessages([])
    setSettingsAtLastSend(null)
    setHomeMenuView('lessons')
    setMenuOpen(false)
    setLoading(false)
    setRetryMessage(null)
    setForceNextMicLang(null)
    setLoadingTranslationIndex(null)
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    setEngvoVoiceMode(false)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    setFooterTransitionText(null)
    bumpFooterSessionContext()
    resetStructuredLessonSession()
    setLessonMenuContext({ menuView: 'lessons', lessonsPanel: 'words' })
  }, [bumpFooterSessionContext, cleanupEngvoRuntime, resetStructuredLessonSession])
`,
  `  const backToVocabularyMenu = useCallback(() => {
    firstMessageRequestIdRef.current += 1
    firstMessageInFlightRef.current = false
    setDialogStarted(false)
    setMessages([])
    setSettingsAtLastSend(null)
    setHomeMenuView('root')
    setLoading(false)
    setRetryMessage(null)
    setForceNextMicLang(null)
    setLoadingTranslationIndex(null)
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    setEngvoVoiceMode(false)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    setFooterTransitionText(null)
    bumpFooterSessionContext()
    resetStructuredLessonSession()
    setLessonMenuContext({ menuView: 'lessons', lessonsPanel: 'words' })
    restoreLessonMenuOnNextOpenRef.current = true
    setMenuOpen(true)
  }, [bumpFooterSessionContext, cleanupEngvoRuntime, resetStructuredLessonSession])
`,
  'backToVocabularyMenu slide'
)

// 8) Bridge hydrate: openMenuAt instead of setHomeMenuView
content = mustReplaceOnce(
  content,
  `        if (entryBridge?.audienceChosen) {
          setHomeAudienceChosen(true)
          const view = resolveReturningHomeMenuView({
            branchIntent: entryBridge.branchIntent,
          })
          if (view) setHomeMenuView(view)
        }
        setDialogStarted(false)
        setMenuOpen(false)
`,
  `        if (entryBridge?.audienceChosen) {
          setHomeAudienceChosen(true)
          const view = resolveReturningHomeMenuView({
            branchIntent: entryBridge.branchIntent,
          })
          if (view) {
            setHomeMenuView('root')
            setRequestedMenuView(view)
            setMenuOpen(true)
          }
        }
        setDialogStarted(false)
        if (!(entryBridge?.audienceChosen && resolveReturningHomeMenuView({ branchIntent: entryBridge.branchIntent }))) {
          setMenuOpen(false)
        }
`,
  'hydrate bridge openMenuAt'
)

// Fix hydrate - the above is messy. Let me simplify with a cleaner second pass if needed.
// Actually rewrite hydrate more carefully - resolveReturningHomeMenuView called twice is ugly.
// Re-read and fix if the first replace made it worse.

content = mustReplaceOnce(
  content,
  `    setHomeAudienceChosen(true)
    const view = resolveReturningHomeMenuView({
      branchIntent: entryBridge.branchIntent,
    })
    if (view) setHomeMenuView(view)
  }, [
    storageLoaded,
    entryBridge?.audience,
    entryBridge?.audienceChosen,
    entryBridge?.branchIntent,
  ])
`,
  `    setHomeAudienceChosen(true)
    const view = resolveReturningHomeMenuView({
      branchIntent: entryBridge.branchIntent,
    })
    if (view) {
      setHomeMenuView('root')
      setRequestedMenuView(view)
      setMenuOpen(true)
    }
  }, [
    storageLoaded,
    entryBridge?.audience,
    entryBridge?.audienceChosen,
    entryBridge?.branchIntent,
  ])
`,
  'effect bridge openMenuAt'
)

// 9) Prefetch: also on menuOpen + requestedMenuView
content = mustReplaceOnce(
  content,
  `  useEffect(() => {
    if (!storageLoaded) return
    if (homeMenuView === 'lessons') {
      prefetchBranch('lesson')
      prefetchBranch('practice')
      return
    }
    if (homeMenuView === 'aiChat') {
      prefetchBranch('chat')
    }
  }, [storageLoaded, homeMenuView])
`,
  `  useEffect(() => {
    if (!storageLoaded) return
    const menuStage = requestedMenuView ?? (menuOpen ? null : homeMenuView)
    if (menuOpen && (requestedMenuView === 'lessons' || requestedMenuView === 'practice')) {
      prefetchBranch('lesson')
      prefetchBranch('practice')
      return
    }
    if (menuOpen && requestedMenuView === 'aiChat') {
      prefetchBranch('chat')
      return
    }
    if (homeMenuView === 'lessons') {
      prefetchBranch('lesson')
      prefetchBranch('practice')
      return
    }
    if (homeMenuView === 'aiChat') {
      prefetchBranch('chat')
    }
    void menuStage
  }, [storageLoaded, homeMenuView, menuOpen, requestedMenuView])
`,
  'prefetch menuOpen'
)

// 10) Remove openMyPlanFromStart memo (CTA collapsed)
content = mustReplaceOnce(
  content,
  `  const openMyPlanFromStart = React.useMemo(() => {
    if (!storageLoaded) return false
    return shouldOpenMyPlanHome({
      myPlanHomeEnabled: featureFlags.myPlanHomeV1,
      hasAnyHistory: hasAnyLearningHistory({
        lastActiveDate: rewardsState.progress.lastActiveDate,
        lessonProgressCount: Object.keys(loadLessonProgressMap()).length,
        signalCount: listLearningSignals().length,
      }),
    })
  }, [storageLoaded, rewardsState.progress.lastActiveDate])

`,
  '',
  'remove openMyPlanFromStart'
)

// 11) Level 2 CTAs + greeting + remove robot shell
content = mustReplaceOnce(
  content,
  `                <HomeWelcomeBubble text={buildCompactGreeting()} />
`,
  `                <HomeWelcomeBubble text={buildCompactGreeting({ audienceChosen: homeAudienceChosen })} />
`,
  'greeting audienceChosen'
)

const level2OldStart = `                    {!homeAudienceChosen ? (`
const level2OldEnd = `                    )}`
// Find and replace the whole audience/CTA ternary — use unique end before welcomeFactLine
content = mustReplaceOnce(
  content,
  `                    {!homeAudienceChosen ? (
                      <>
                        <button
                          type="button"
                          onClick={() => completeHomeAudienceChoice('child')}
                          className={PAGE_HOME_AUDIENCE_CHILD_BUTTON_CLASS}
                        >
                          {APP_SHELL_HOME_COPY.audienceChildLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => completeHomeAudienceChoice('adult')}
                          className={PAGE_HOME_AUDIENCE_ADULT_BUTTON_CLASS}
                        >
                          {APP_SHELL_HOME_COPY.audienceAdultLabel}
                        </button>
                      </>
                    ) : openMyPlanFromStart ? (
                      <>
                        <div className="flex w-full items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setHomeAudienceChosen(false)}
                            className={PAGE_HOME_BACK_TO_AUDIENCE_BUTTON_CLASS}
                            aria-label={APP_SHELL_HOME_COPY.homeBackAriaLabel}
                          >
                            <span className="mr-1" aria-hidden>
                              &lt;
                            </span>
                            {APP_SHELL_HOME_COPY.homeBackLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (featureFlags.myPlanSpaceV1) {
                                openMyPlanSpace()
                                return
                              }
                              setHomeMenuView('myPlan')
                            }}
                            className={\`\${PAGE_HOME_START_PRIMARY_BUTTON_CLASS} shrink-0\`}
                          >
                            {APP_SHELL_HOME_COPY.startMyPlanLabel}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHomeMenuView('lessons')}
                          className={\`\${PAGE_HOME_START_PRIMARY_BUTTON_CLASS} shrink-0\`}
                        >
                          Все уроки и режимы
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex w-full items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setHomeAudienceChosen(false)}
                            className={PAGE_HOME_BACK_TO_AUDIENCE_BUTTON_CLASS}
                            aria-label={APP_SHELL_HOME_COPY.homeBackAriaLabel}
                          >
                            <span className="mr-1" aria-hidden>
                              &lt;
                            </span>
                            {APP_SHELL_HOME_COPY.homeBackLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => setHomeMenuView('aiChat')}
                            className={\`\${PAGE_HOME_START_PRIMARY_BUTTON_CLASS} shrink-0\`}
                          >
                            {APP_SHELL_HOME_COPY.startChatLabel}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHomeMenuView('lessons')}
                          className={\`\${PAGE_HOME_START_PRIMARY_BUTTON_CLASS} shrink-0\`}
                        >
                          Все уроки и режимы
                        </button>
                      </>
                    )}
`,
  `                    {!homeAudienceChosen ? (
                      <>
                        <button
                          type="button"
                          onClick={() => completeHomeAudienceChoice('child')}
                          className={PAGE_HOME_AUDIENCE_CHILD_BUTTON_CLASS}
                        >
                          {APP_SHELL_HOME_COPY.audienceChildLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => completeHomeAudienceChoice('adult')}
                          className={PAGE_HOME_AUDIENCE_ADULT_BUTTON_CLASS}
                        >
                          {APP_SHELL_HOME_COPY.audienceAdultLabel}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex w-full items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setHomeAudienceChosen(false)}
                            className={PAGE_HOME_BACK_TO_AUDIENCE_BUTTON_CLASS}
                            aria-label={APP_SHELL_HOME_COPY.homeBackAriaLabel}
                          >
                            <span className="mr-1" aria-hidden>
                              &lt;
                            </span>
                            {APP_SHELL_HOME_COPY.homeBackLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => openMenuAt('lessons')}
                            className={\`\${PAGE_HOME_START_PRIMARY_BUTTON_CLASS} shrink-0\`}
                          >
                            {APP_SHELL_HOME_COPY.lessonsLabel}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => openMenuAt('practice')}
                          className={\`\${PAGE_HOME_START_PRIMARY_BUTTON_CLASS} shrink-0\`}
                        >
                          {APP_SHELL_HOME_COPY.practiceLabel}
                        </button>
                      </>
                    )}
`,
  'level2 CTAs'
)

// 12) Remove robot shell JSX — marker based
const robotStart = `            {homeMenuView !== 'root' && (`
const robotStartIdx = content.indexOf(robotStart)
if (robotStartIdx < 0) throw new Error('robot shell start not found')
const afterRobotStart = content.slice(robotStartIdx)
// Find matching close: `\n            )}\n            </div>` after the home MenuSectionPanels block
const robotEndMarker = `\n            )}\n            </div>\n          </div>\n        ) : (`
const robotEndRel = afterRobotStart.indexOf(robotEndMarker)
if (robotEndRel < 0) throw new Error('robot shell end not found')
content =
  content.slice(0, robotStartIdx) +
  `            </div>\n          </div>\n        ) : (` +
  afterRobotStart.slice(robotEndRel + robotEndMarker.length)

// 13) onBackToPracticeMenu → slide
content = mustReplaceOnce(
  content,
  `                  onBackToPracticeMenu={() => {
                    setPracticeRewardUi(null)
                    setPracticeCompletionMeta(null)
                    practiceSession.abandonSession()
                    setDialogStarted(false)
                    setHomeMenuView('lessons')
                    setLessonMenuContext((prev) => ({
                      menuView: 'lessons',
                      lessonsPanel: 'practice',
                      activeGrammarCategoryId: prev?.activeGrammarCategoryId ?? null,
                      activeTheoryTagId: prev?.activeTheoryTagId ?? null,
                      theorySearchQuery: prev?.theorySearchQuery ?? null,
                      activeTheoryTagIds: prev?.activeTheoryTagIds ?? null,
                      theoryLessonSource: prev?.theoryLessonSource ?? null,
                      theoryTagBrowseLevel: prev?.theoryTagBrowseLevel ?? null,
                      practiceTheoryTagFilterId: prev?.practiceTheoryTagFilterId ?? null,
                    }))
                  }}
`,
  `                  onBackToPracticeMenu={() => {
                    setPracticeRewardUi(null)
                    setPracticeCompletionMeta(null)
                    practiceSession.abandonSession()
                    setDialogStarted(false)
                    setHomeMenuView('root')
                    setLessonMenuContext((prev) => ({
                      menuView: 'lessons',
                      lessonsPanel: 'practice',
                      activeGrammarCategoryId: prev?.activeGrammarCategoryId ?? null,
                      activeTheoryTagId: prev?.activeTheoryTagId ?? null,
                      theorySearchQuery: prev?.theorySearchQuery ?? null,
                      activeTheoryTagIds: prev?.activeTheoryTagIds ?? null,
                      theoryLessonSource: prev?.theoryLessonSource ?? null,
                      theoryTagBrowseLevel: prev?.theoryTagBrowseLevel ?? null,
                      practiceTheoryTagFilterId: prev?.practiceTheoryTagFilterId ?? null,
                    }))
                    restoreLessonMenuOnNextOpenRef.current = true
                    setMenuOpen(true)
                  }}
`,
  'onBackToPracticeMenu slide'
)

// 14) SlideOutMenu props
content = mustReplaceOnce(
  content,
  `        lessonMenuContext={lessonMenuContext}
        restoreLessonMenuOnNextOpenRef={restoreLessonMenuOnNextOpenRef}
        practiceProgressRevision={practiceProgressRevision}
`,
  `        lessonMenuContext={lessonMenuContext}
        restoreLessonMenuOnNextOpenRef={restoreLessonMenuOnNextOpenRef}
        requestedMenuView={requestedMenuView}
        onRequestedMenuViewConsumed={clearRequestedMenuView}
        practiceProgressRevision={practiceProgressRevision}
`,
  'SlideOutMenu requestedMenuView props'
)

// 15) openLessonsFromMyPlanSpace — already sets menu open; keep homeMenuView root
content = mustReplaceOnce(
  content,
  `  const openLessonsFromMyPlanSpace = useCallback(() => {
    setMyPlanSpaceActive(false)
    setDialogStarted(false)
    setHomeMenuView('lessons')
    setMenuOpen(true)
  }, [])
`,
  `  const openLessonsFromMyPlanSpace = useCallback(() => {
    setMyPlanSpaceActive(false)
    setDialogStarted(false)
    openMenuAt('lessons')
  }, [openMenuAt])
`,
  'openLessonsFromMyPlanSpace'
)

// 16) Force launch surface to slide when opening lessons (menuOpen ? slide : home → always slide)
content = content.replaceAll(
  `lessonMenuLaunchSurfaceRef.current = menuOpen ? 'slide' : 'home'`,
  `lessonMenuLaunchSurfaceRef.current = 'slide'`
)

// Clean up messy hydrate block if present
const messyHydrate = `        if (entryBridge?.audienceChosen) {
          setHomeAudienceChosen(true)
          const view = resolveReturningHomeMenuView({
            branchIntent: entryBridge.branchIntent,
          })
          if (view) {
            setHomeMenuView('root')
            setRequestedMenuView(view)
            setMenuOpen(true)
          }
        }
        setDialogStarted(false)
        if (!(entryBridge?.audienceChosen && resolveReturningHomeMenuView({ branchIntent: entryBridge.branchIntent }))) {
          setMenuOpen(false)
        }
`
if (content.includes(messyHydrate)) {
  content = mustReplaceOnce(
    content,
    messyHydrate,
    `        if (entryBridge?.audienceChosen) {
          setHomeAudienceChosen(true)
          const view = resolveReturningHomeMenuView({
            branchIntent: entryBridge.branchIntent,
          })
          if (view) {
            setHomeMenuView('root')
            setRequestedMenuView(view)
            setMenuOpen(true)
          } else {
            setMenuOpen(false)
          }
        } else {
          setMenuOpen(false)
        }
        setDialogStarted(false)
`,
    'clean hydrate bridge'
  )
}

// Simplify prefetch — remove void menuStage hack
content = mustReplaceOnce(
  content,
  `  useEffect(() => {
    if (!storageLoaded) return
    const menuStage = requestedMenuView ?? (menuOpen ? null : homeMenuView)
    if (menuOpen && (requestedMenuView === 'lessons' || requestedMenuView === 'practice')) {
      prefetchBranch('lesson')
      prefetchBranch('practice')
      return
    }
    if (menuOpen && requestedMenuView === 'aiChat') {
      prefetchBranch('chat')
      return
    }
    if (homeMenuView === 'lessons') {
      prefetchBranch('lesson')
      prefetchBranch('practice')
      return
    }
    if (homeMenuView === 'aiChat') {
      prefetchBranch('chat')
    }
    void menuStage
  }, [storageLoaded, homeMenuView, menuOpen, requestedMenuView])
`,
  `  useEffect(() => {
    if (!storageLoaded) return
    if (menuOpen && (requestedMenuView === 'lessons' || requestedMenuView === 'practice')) {
      prefetchBranch('lesson')
      prefetchBranch('practice')
      return
    }
    if (menuOpen && requestedMenuView === 'aiChat') {
      prefetchBranch('chat')
      return
    }
    if (homeMenuView === 'lessons') {
      prefetchBranch('lesson')
      prefetchBranch('practice')
      return
    }
    if (homeMenuView === 'aiChat') {
      prefetchBranch('chat')
    }
  }, [storageLoaded, homeMenuView, menuOpen, requestedMenuView])
`,
  'clean prefetch'
)

fs.writeFileSync(FILE, content, 'utf8')

const failures = checkCyrillicIntegrity({ root: ROOT, files: [FILE] })
if (failures.length > 0) {
  console.error('check:cyrillic failed after AppShell patch')
  for (const { relPath, violations } of failures) {
    for (const v of violations) {
      console.error(`  ${relPath}:L${v.line} [${v.type}] ${v.snippet}`)
    }
  }
  process.exit(1)
}

console.log('apply-home-menu-slide: OK')
