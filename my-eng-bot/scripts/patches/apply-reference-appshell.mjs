import fs from 'node:fs'

const f = 'components/app/AppShell.tsx'
let s = fs.readFileSync(f, 'utf8')

function mustReplace(from, to, label) {
  // tolerate LF patches against CRLF file
  const fromCr = from.replace(/\n/g, '\r\n')
  const toCr = to.replace(/\n/g, '\r\n')
  if (s.includes(fromCr)) {
    s = s.replace(fromCr, toCr)
    return
  }
  if (s.includes(from)) {
    s = s.replace(from, to)
    return
  }
  throw new Error(`Patch failed: ${label}\n---\n${from.slice(0, 120)}`)
}

mustReplace(
  `  LessonIntroScreen,
  LessonStepRenderer,
  MenuSectionPanels,`,
  `  LessonIntroScreen,
  LessonStepRenderer,
  ReferenceSheetScreen,
  MenuSectionPanels,`,
  'import ReferenceSheetScreen'
)

mustReplace(
  `import { shouldFinalizeTutorLessonOpen } from '@/lib/lessons/tutorLessonInflight'`,
  `import { shouldFinalizeTutorLessonOpen } from '@/lib/lessons/tutorLessonInflight'
import { buildReferenceSheetByLessonId } from '@/lib/reference/buildReferenceSheet'`,
  'import buildReferenceSheet'
)

mustReplace(
  `  const [lessonViewStage, setLessonViewStage] = useState<'intro' | 'tips' | 'briefing' | 'lesson'>('intro')`,
  `  const [lessonViewStage, setLessonViewStage] = useState<'intro' | 'tips' | 'briefing' | 'lesson' | 'reference'>('intro')`,
  'lessonViewStage type'
)

mustReplace(
  `        theoryTagBrowseLevel: meta?.theoryTagBrowseLevel ?? prev?.theoryTagBrowseLevel ?? null,
        practiceTheoryTagFilterId: prev?.practiceTheoryTagFilterId ?? null,
      }))
      setActiveLearningLessonId(lessonId)
      setMessages(structuredLesson ? [] : [{ role: 'assistant', content: lesson.theoryIntro }])`,
  `        theoryTagBrowseLevel: meta?.theoryTagBrowseLevel ?? prev?.theoryTagBrowseLevel ?? null,
        practiceTheoryTagFilterId: prev?.practiceTheoryTagFilterId ?? null,
        catalogBrowseIntent: meta?.catalogBrowseIntent ?? prev?.catalogBrowseIntent ?? 'lesson',
      }))
      setActiveLearningLessonId(lessonId)
      setMessages(structuredLesson ? [] : [{ role: 'assistant', content: lesson.theoryIntro }])`,
  'openLearningLesson intent'
)

const openRefFn = `
  const openReferenceTopic = useCallback(
    async (lessonId: string, lessonsPanel: LessonsPanel = 'theory', meta?: LearningLessonMenuMeta) => {
      if (!featureFlags.referenceV1) return
      const sheet = buildReferenceSheetByLessonId(lessonId)
      if (!sheet) return
      if (!getLearningLessonById(lessonId) && !getStructuredLessonById(lessonId)) return
      lessonMenuLaunchSurfaceRef.current = menuOpen ? 'slide' : 'home'
      menuLessonGenerateCleanupRef.current?.()
      menuLessonBgFetchEpochRef.current += 1
      setStructuredLessonVariantRegenerating(false)
      resetVariantPrepareRef.current()
      abandonPracticeSession()
      firstMessageRequestIdRef.current += 1
      firstMessageInFlightRef.current = false
      suppressSettingsChangeBannerRef.current = true
      setDialogStarted(true)
      setMenuOpen(false)
      setHomeMenuView('lessons')
      setLoading(false)
      setRetryMessage(null)
      setSearchingInternet(false)
      setLoadingTranslationIndex(null)
      setForceNextMicLang(null)
      setSettingsAtLastSend(null)
      setActiveStructuredLessonRuntime(null)
      setStructuredLessonLoadingId(null)
      setMenuLessonBgError(null)
      setPendingTutorLessonTitle(null)
      setLessonOverlay(null)
      setLessonReturnBriefingAckRunKey(null)
      setLessonViewStage('reference')
      setLessonTipsReturnStage('intro')
      setLessonIntroDepth('quick')
      setLessonExtraTipsStatus('idle')
      setLessonExtraTipsState(null)
      setLessonMenuContext((prev) => ({
        menuView: 'lessons',
        lessonsPanel,
        selectedLessonId: lessonId,
        activeGrammarCategoryId: meta?.activeGrammarCategoryId ?? null,
        activeTheoryTagId: meta?.activeTheoryTagId ?? null,
        theorySearchQuery: meta?.theorySearchQuery ?? null,
        activeTheoryTagIds: meta?.activeTheoryTagIds ?? null,
        theoryLessonSource: meta?.theoryLessonSource ?? null,
        theoryTagBrowseLevel: meta?.theoryTagBrowseLevel ?? prev?.theoryTagBrowseLevel ?? null,
        practiceTheoryTagFilterId: prev?.practiceTheoryTagFilterId ?? null,
        catalogBrowseIntent: 'reference',
      }))
      setActiveLearningLessonId(lessonId)
      const structuredLesson = getStructuredLessonById(lessonId)
      setMessages([])
      if (structuredLesson) {
        setStructuredLessonShuffleNonce((n) => n + 1)
        setActiveStructuredLessonRuntime(cloneStructuredLessonWithRunKey(structuredLesson))
      }
      setLastStructuredLessonGlobalDelta(0)
      bumpFooterSessionContext()
    },
    [abandonPracticeSession, bumpFooterSessionContext, menuOpen]
  )
`

mustReplace(
  `    [abandonPracticeSession, bumpFooterSessionContext, bumpLessonIntroRevealSession, menuOpen]
  )

  /** Меню «Начать урок»: всегда открывать intro с начала. */
  const openOrContinueLearningLesson = useCallback(`,
  `    [abandonPracticeSession, bumpFooterSessionContext, bumpLessonIntroRevealSession, menuOpen]
  )
${openRefFn}
  /** Меню «Начать урок»: всегда открывать intro с начала. */
  const openOrContinueLearningLesson = useCallback(`,
  'openReferenceTopic fn'
)

mustReplace(
  `        selectedLessonId: lessonMenuContext.selectedLessonId,
      },
    }
  }, [pendingHomeLessonMenuRestore, dialogStarted, homeMenuView, lessonMenuContext])`,
  `        selectedLessonId: lessonMenuContext.selectedLessonId,
        catalogBrowseIntent: lessonMenuContext.catalogBrowseIntent ?? null,
      },
    }
  }, [pendingHomeLessonMenuRestore, dialogStarted, homeMenuView, lessonMenuContext])`,
  'home restore intent'
)

mustReplace(
  `  const isLessonIntroActive = Boolean(activeLessonIntro && activeLearningLesson && lessonViewStage === 'intro')
  const isLessonTipsActive = Boolean(activeLessonIntro && activeLearningLesson && lessonViewStage === 'tips')
  const isLessonBriefingActive = Boolean(activeStructuredLesson && activeLearningLesson && lessonViewStage === 'briefing')
  const isStructuredLessonActive = Boolean(activeStructuredLesson && activeStructuredLessonStep && lessonViewStage === 'lesson')`,
  `  const activeReferenceSheet =
    lessonViewStage === 'reference' && activeLearningLessonId
      ? buildReferenceSheetByLessonId(activeLearningLessonId)
      : null
  const isReferenceSheetActive = Boolean(activeReferenceSheet && lessonViewStage === 'reference')
  const isLessonIntroActive = Boolean(activeLessonIntro && activeLearningLesson && lessonViewStage === 'intro')
  const isLessonTipsActive = Boolean(activeLessonIntro && activeLearningLesson && lessonViewStage === 'tips')
  const isLessonBriefingActive = Boolean(activeStructuredLesson && activeLearningLesson && lessonViewStage === 'briefing')
  const isStructuredLessonActive = Boolean(activeStructuredLesson && activeStructuredLessonStep && lessonViewStage === 'lesson')`,
  'reference sheet active flags'
)

mustReplace(
  `              ) : isLessonIntroActive && activeLessonIntro ? (
                <LessonIntroScreen`,
  `              ) : isReferenceSheetActive && activeReferenceSheet ? (
                <ReferenceSheetScreen
                  key={\`ref-\${activeReferenceSheet.id}\`}
                  sheet={activeReferenceSheet}
                  onBack={backToLessonList}
                  onStartLesson={() => {
                    void openLearningLesson(
                      activeReferenceSheet.relatedLessonId,
                      lessonMenuContext?.lessonsPanel ?? 'a2',
                      {
                        ...(lessonMenuContext
                          ? {
                              activeGrammarCategoryId: lessonMenuContext.activeGrammarCategoryId,
                              activeTheoryTagId: lessonMenuContext.activeTheoryTagId,
                              theorySearchQuery: lessonMenuContext.theorySearchQuery,
                              activeTheoryTagIds: lessonMenuContext.activeTheoryTagIds,
                              theoryLessonSource: lessonMenuContext.theoryLessonSource,
                              theoryTagBrowseLevel: lessonMenuContext.theoryTagBrowseLevel,
                            }
                          : {}),
                        catalogBrowseIntent: 'reference',
                      }
                    )
                  }}
                  onStartPractice={
                    activeReferenceSheet.hasPractice
                      ? () => {
                          void openPracticeSession({
                            lessonId: activeReferenceSheet.relatedLessonId,
                            mode: 'challenge',
                            entrySource: 'menu',
                          })
                        }
                      : undefined
                  }
                />
              ) : isLessonIntroActive && activeLessonIntro ? (
                <LessonIntroScreen`,
  'render ReferenceSheetScreen'
)

mustReplace(
  `                    onOpenLearningLesson={openOrContinueLearningLesson}
                    onOpenQuickTest={openQuickTest}
                    onDebugSkipToLessonFinale={handleDebugSkipToLessonFinale}`,
  `                    onOpenLearningLesson={openOrContinueLearningLesson}
                    onOpenReferenceTopic={openReferenceTopic}
                    onOpenQuickTest={openQuickTest}
                    onDebugSkipToLessonFinale={handleDebugSkipToLessonFinale}`,
  'home onOpenReferenceTopic'
)

mustReplace(
  `        onOpenLearningLesson={openOrContinueLearningLesson}
        onOpenQuickTest={openQuickTest}
        onGenerateLearningLesson={openGeneratedLearningLesson}`,
  `        onOpenLearningLesson={openOrContinueLearningLesson}
        onOpenReferenceTopic={openReferenceTopic}
        onOpenQuickTest={openQuickTest}
        onGenerateLearningLesson={openGeneratedLearningLesson}`,
  'slide onOpenReferenceTopic'
)

fs.writeFileSync(f, s, 'utf8')
console.log('AppShell reference wiring ok')
