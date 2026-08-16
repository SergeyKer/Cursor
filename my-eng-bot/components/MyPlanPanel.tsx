'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { featureFlags } from '@/lib/featureFlags'
import { pickQuickStartPracticeTopic, type LessonCatalogLevel } from '@/lib/lessonCatalog'
import type { AttentionZone, LearningSignal } from '@/lib/learningMemory/types'
import {
  clearLearningSignals,
  clearSkillMasteryMap,
  listLearningSignals,
} from '@/lib/learningMemory/storage'
import { isLearningMemoryDebugEnabled } from '@/lib/learningMemory/debug'
import { canUseAiReinforce } from '@/lib/entitlements'
import { trackMyPlanEvent } from '@/lib/myPlan/analytics'
import { buildMyPlanModeDoors } from '@/lib/myPlan/buildModeDoors'
import type {
  MyPlanAction,
  MyPlanRecommendation,
  MyPlanStatusSlice,
  ProgramStatus,
} from '@/lib/myPlan/types'
import {
  MY_PLAN_COPY,
  buildIdleNowCardView,
  buildNowCardView,
  buildProgramCardView,
  buildRecommendationCardView,
  myPlanCopy,
  myPlanLevelLine,
  myPlanStreakLine,
} from '@/lib/uiCopy/myPlan'
import { markTutorCardConsumed } from '@/lib/tutor/tutorQuestionCache'
import { useTutorQuestionPrefetch } from '@/lib/tutor/useTutorQuestionPrefetch'
import MyPlanCard from '@/components/myPlan/MyPlanCard'
import MyPlanCardFooterButton from '@/components/myPlan/MyPlanCardFooterButton'
import {
  MY_PLAN_CARD_BODY_REASON,
  MY_PLAN_CARD_BODY_TITLE,
  MY_PLAN_INSET_LAUNCH,
  MY_PLAN_TUTOR_CHIP,
} from '@/lib/myPlan/cardStyles'
import { recordSoftFocusShown } from '@/lib/myPlan/softFocusRotation'
import type { ProgressLaunchTarget } from '@/lib/progress/progressActions'
import type { PracticeEntrySource, PracticeExerciseType, PracticeMode } from '@/types/practice'
import type { Settings } from '@/lib/types'

function levelToCatalogLevel(level: Settings['level']): LessonCatalogLevel {
  const id = (level || 'a2').toLowerCase()
  if (id === 'a1' || id === 'a2' || id === 'b1' || id === 'b2' || id === 'c1' || id === 'c2') {
    return id.toUpperCase() as LessonCatalogLevel
  }
  return 'A2'
}

function mainZoneSkillId(task: MyPlanRecommendation | null): string | null {
  if (!task) return null
  if (task.action.kind === 'reinforce_skill') return task.action.skillTagId
  return null
}

export interface MyPlanPanelProps {
  mainTask?: MyPlanRecommendation | null
  secondary?: MyPlanRecommendation[]
  tutorTask?: MyPlanRecommendation | null
  tutorTasks?: MyPlanRecommendation[]
  recommendations?: MyPlanRecommendation[]
  status?: MyPlanStatusSlice
  programTask?: MyPlanRecommendation | null
  programStatus?: ProgramStatus
  unstartedCount?: number
  dailyClosedToday?: boolean
  dayXOf7?: number
  anchorLevel?: string
  attentionZones?: AttentionZone[]
  modeGap?: { skillTagId: string; title: string } | null
  settings: Settings
  nowGoalLayout?: boolean
  showAdultPaywallHint?: boolean
  onOpenLearningLesson?: (lessonId: string) => void
  onOpenReferenceTopic?: (lessonId: string) => void
  onOpenTutorChat?: (opts?: { prefill?: string }) => void
  onOpenPracticeSession?: (request: {
    lessonId?: string
    mode: PracticeMode
    entrySource: PracticeEntrySource
    customTopic?: string
    referenceExerciseType?: PracticeExerciseType
  }) => Promise<void> | void
  onGeneratePracticeSession?: (request: {
    lessonId?: string
    mode: PracticeMode
    entrySource: PracticeEntrySource
    customTopic?: string
    referenceExerciseType?: PracticeExerciseType
  }) => Promise<void> | void
  onOpenVocabularyWorlds?: () => void | Promise<void>
  onOpenVocabularyFeed?: () => void | Promise<void>
  onOpenTranslationVocabNag?: (spotId: string) => void | Promise<void>
  onMenuViewChange?: (view: 'lessons' | 'progress' | 'myPlan') => void
  onOpenProgressSpace?: () => void
  onMarkOpenedFromMyPlan?: () => void
  onLaunchTarget?: (target: ProgressLaunchTarget) => void | Promise<void>
}

export default function MyPlanPanel({
  mainTask = null,
  secondary = [],
  tutorTask = null,
  tutorTasks,
  recommendations,
  status,
  programTask = null,
  programStatus = 'no_catalog',
  unstartedCount = 0,
  dailyClosedToday = false,
  dayXOf7 = 0,
  anchorLevel,
  attentionZones = [],
  settings,
  nowGoalLayout = true,
  showAdultPaywallHint = false,
  onOpenLearningLesson,
  onOpenReferenceTopic,
  onOpenTutorChat,
  onOpenPracticeSession,
  onGeneratePracticeSession,
  onOpenVocabularyWorlds,
  onOpenVocabularyFeed,
  onOpenTranslationVocabNag,
  onMenuViewChange,
  onOpenProgressSpace,
  onMarkOpenedFromMyPlan,
  onLaunchTarget,
}: MyPlanPanelProps) {
  const [practiceBusy, setPracticeBusy] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugSignals, setDebugSignals] = useState<LearningSignal[]>([])
  const [modesOpen, setModesOpen] = useState(false)
  const showDebug = isLearningMemoryDebugEnabled()
  const audience = settings.audience === 'child' ? 'child' : 'adult'
  const copy = myPlanCopy(audience)
  const [, setTutorCardTick] = useState(0)

  useTutorQuestionPrefetch({
    attentionZones,
    audience,
    level: settings.level,
    provider: settings.provider,
    openAiChatPreset: settings.openAiChatPreset,
    enabled: featureFlags.tutorChatV1,
    faqPoolEnabled: featureFlags.tutorFaqPoolV1,
    onCached: () => setTutorCardTick((n) => n + 1),
  })

  const legacyList = !nowGoalLayout && recommendations ? recommendations : null
  const resolvedMain = legacyList ? legacyList[0] ?? null : mainTask
  const resolvedSecondary = legacyList ? legacyList.slice(1, 2) : secondary.slice(0, 1)
  const resolvedTutorTasks =
    tutorTasks && tutorTasks.length > 0 ? tutorTasks.slice(0, 3) : tutorTask ? [tutorTask] : []

  useEffect(() => {
    const programLessonId =
      programTask?.action.kind === 'open_lesson' ? programTask.action.lessonId : undefined
    trackMyPlanEvent('my_plan_viewed', {
      audience,
      hasMain: Boolean(resolvedMain),
      mainType: resolvedMain?.goalType,
      programStatus,
      programLessonId,
      anchorLevel,
    })
    if (
      resolvedMain?.goalType === 'improve_medal' ||
      resolvedMain?.goalType === 'soft_return' ||
      resolvedMain?.goalType === 'weak_spot' ||
      (resolvedMain?.goalType === 'reinforce' && resolvedMain.id.startsWith('review-'))
    ) {
      const key =
        resolvedMain.goalType === 'soft_return'
          ? 'soft_return:global'
          : resolvedMain.goalType === 'improve_medal' && resolvedMain.action.kind === 'open_lesson'
            ? `improve_medal:${resolvedMain.action.lessonId}`
            : resolvedMain.goalType === 'weak_spot' && resolvedMain.action.kind === 'weak_spot'
              ? `weak_spot:${resolvedMain.action.spotId}`
              : resolvedMain.action.kind === 'reinforce_skill'
                ? `reinforce:${resolvedMain.action.skillTagId}`
                : resolvedMain.id
      recordSoftFocusShown(key)
    }
  }, [audience, resolvedMain, programStatus, programTask, anchorLevel])

  useEffect(() => {
    if (
      showAdultPaywallHint &&
      audience === 'adult' &&
      resolvedMain?.goalType === 'reinforce' &&
      !canUseAiReinforce()
    ) {
      trackMyPlanEvent('my_plan_paywall_shown', { audience })
    }
  }, [audience, resolvedMain?.goalType, showAdultPaywallHint])

  const refreshDebug = useCallback(() => {
    setDebugSignals(listLearningSignals().slice(-40).reverse())
  }, [])

  const runPractice = useCallback(
    async (
      req: {
        lessonId?: string
        mode: PracticeMode
        entrySource: PracticeEntrySource
      },
      preferAi = false
    ) => {
      const opener = preferAi && onGeneratePracticeSession ? onGeneratePracticeSession : onOpenPracticeSession
      if (!opener || practiceBusy) return
      onMarkOpenedFromMyPlan?.()
      setPracticeBusy(true)
      try {
        await opener(req)
      } finally {
        setPracticeBusy(false)
      }
    },
    [onGeneratePracticeSession, onMarkOpenedFromMyPlan, onOpenPracticeSession, practiceBusy]
  )

  const handleAction = useCallback(
    async (action: MyPlanAction, source: 'main' | 'secondary') => {
      trackMyPlanEvent(source === 'main' ? 'my_plan_main_cta' : 'my_plan_secondary_cta', {
        audience,
        actionKind: action.kind,
        mainType: resolvedMain?.goalType,
        generation: action.kind === 'reinforce_skill' ? action.generation : undefined,
        lessonId:
          action.kind === 'resume_lesson' ||
          action.kind === 'open_lesson' ||
          action.kind === 'start_practice' ||
          action.kind === 'reinforce_skill' ||
          action.kind === 'open_reference'
            ? action.lessonId
            : undefined,
        skillTagId: action.kind === 'reinforce_skill' ? action.skillTagId : undefined,
      })

      switch (action.kind) {
        case 'resume_lesson':
        case 'open_lesson':
          onMarkOpenedFromMyPlan?.()
          onOpenLearningLesson?.(action.lessonId)
          return
        case 'open_reference':
          onMarkOpenedFromMyPlan?.()
          onOpenReferenceTopic?.(action.lessonId)
          return
        case 'open_communication':
          onMarkOpenedFromMyPlan?.()
          await onLaunchTarget?.({ kind: 'communication' })
          return
        case 'open_engvo':
          onMarkOpenedFromMyPlan?.()
          await onLaunchTarget?.({ kind: 'engvo' })
          return
        case 'start_practice':
          await runPractice({
            lessonId: action.lessonId,
            mode: action.mode,
            entrySource: action.entrySource === 'my_plan' ? 'my_plan' : action.entrySource,
          })
          return
        case 'reinforce_skill': {
          if (action.generation === 'ai' && action.lessonId && canUseAiReinforce()) {
            trackMyPlanEvent('my_plan_ai_reinforce_started', {
              audience,
              lessonId: action.lessonId,
              skillTagId: action.skillTagId,
            })
            await runPractice(
              {
                lessonId: action.lessonId,
                mode: 'balanced',
                entrySource: 'my_plan',
              },
              true
            )
            return
          }
          if (action.lessonId) {
            await runPractice({
              lessonId: action.lessonId,
              mode: 'balanced',
              entrySource: 'my_plan',
            })
            return
          }
          {
            const topic = pickQuickStartPracticeTopic(levelToCatalogLevel(settings.level))
            if (!topic) return
            await runPractice({
              lessonId: topic.id,
              mode: 'relaxed',
              entrySource: 'my_plan',
            })
          }
          return
        }
        case 'quick_practice': {
          const topic = pickQuickStartPracticeTopic(levelToCatalogLevel(settings.level))
          if (!topic) return
          await runPractice({
            lessonId: topic.id,
            mode: 'relaxed',
            entrySource: action.entrySource === 'my_plan' ? 'my_plan' : 'quick_start',
          })
          return
        }
        case 'weak_spot':
          if (action.target === 'vocabulary') {
            onMarkOpenedFromMyPlan?.()
            const nagSpot =
              action.spotId === 'vocab-mistakes-inbox' || action.spotId === 'vocab-bank-waiting'
            if (nagSpot) {
              if (onOpenTranslationVocabNag) {
                await onOpenTranslationVocabNag(action.spotId)
                return
              }
              if (onOpenVocabularyFeed) {
                await onOpenVocabularyFeed()
                return
              }
              await onOpenVocabularyWorlds?.()
              return
            }
            if (onOpenVocabularyFeed) {
              await onOpenVocabularyFeed()
              return
            }
            await onOpenVocabularyWorlds?.()
            return
          }
          {
            const topic = pickQuickStartPracticeTopic(levelToCatalogLevel(settings.level))
            if (!topic) return
            await runPractice({ lessonId: topic.id, mode: 'balanced', entrySource: 'my_plan' })
          }
          return
        case 'open_tutor':
          onMarkOpenedFromMyPlan?.()
          if (action.skillTagId) markTutorCardConsumed(action.skillTagId)
          onOpenTutorChat?.({ prefill: action.prefill })
          return
        default:
          return
      }
    },
    [
      audience,
      onLaunchTarget,
      onMarkOpenedFromMyPlan,
      onOpenLearningLesson,
      onOpenReferenceTopic,
      onOpenTutorChat,
      onOpenVocabularyWorlds,
      onOpenVocabularyFeed,
      onOpenTranslationVocabNag,
      resolvedMain?.goalType,
      runPractice,
      settings.level,
    ]
  )

  const handleModeDoor = useCallback(
    async (target: ProgressLaunchTarget) => {
      trackMyPlanEvent('my_plan_secondary_cta', { audience, actionKind: `mode:${target.kind}` })
      onMarkOpenedFromMyPlan?.()
      if (target.kind === 'quick_practice') {
        const topic = pickQuickStartPracticeTopic(levelToCatalogLevel(settings.level))
        if (!topic) return
        await runPractice({ lessonId: topic.id, mode: 'relaxed', entrySource: 'my_plan' })
        return
      }
      if (target.kind === 'practice') {
        await runPractice({
          lessonId: target.lessonId,
          mode: target.mode,
          entrySource: 'my_plan',
        })
        return
      }
      if (target.kind === 'vocabulary') {
        await onOpenVocabularyWorlds?.()
        return
      }
      if (target.kind === 'tutor') {
        onOpenTutorChat?.()
        return
      }
      if (target.kind === 'reference') {
        onOpenReferenceTopic?.(target.lessonId)
        return
      }
      await onLaunchTarget?.(target)
    },
    [
      audience,
      onLaunchTarget,
      onMarkOpenedFromMyPlan,
      onOpenReferenceTopic,
      onOpenTutorChat,
      onOpenVocabularyWorlds,
      runPractice,
      settings.level,
    ]
  )

  const openLessons = useCallback(() => {
    onMenuViewChange?.('lessons')
  }, [onMenuViewChange])

  const openProgress = useCallback(() => {
    trackMyPlanEvent('my_plan_progress_link', { audience })
    if (onOpenProgressSpace) {
      onOpenProgressSpace()
      return
    }
    onMenuViewChange?.('progress')
  }, [audience, onMenuViewChange, onOpenProgressSpace])

  const modeDoors = useMemo(
    () =>
      buildMyPlanModeDoors(
        {
          engvoVoiceV1: featureFlags.engvoVoiceV1,
          practiceEngineV1: featureFlags.practiceEngineV1,
          tutorChatV1: featureFlags.tutorChatV1,
          accentTrainerV1: featureFlags.accentTrainerV1,
          referenceV1: featureFlags.referenceV1,
        },
        audience
      ),
    [audience]
  )

  const debugLogBlock =
    showDebug ? (
      <div className="w-full min-w-0 rounded-lg border border-dashed border-[var(--border)] px-3 py-2.5">
        <button
          type="button"
          className="text-[12px] text-[var(--text-muted)] underline"
          onClick={() => {
            const next = !debugOpen
            setDebugOpen(next)
            if (next) refreshDebug()
          }}
        >
          {debugOpen ? MY_PLAN_COPY.debugHide : MY_PLAN_COPY.debugShow}
        </button>
        {debugOpen ? (
          <div className="mt-2 space-y-2">
            <p className="text-[12px] font-medium text-[var(--text-muted)]">{MY_PLAN_COPY.debugTitle}</p>
            {debugSignals.length === 0 ? (
              <p className="text-[12px] text-[var(--text-muted)]">{MY_PLAN_COPY.debugEmpty}</p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto text-[11px] leading-snug text-[var(--text-muted)]">
                {debugSignals.map((s) => (
                  <li key={s.id} className="break-words border-b border-[var(--border)] pb-1">
                    {s.at.slice(0, 19)} · {s.source}/{s.detector} · {s.skillTagIds.join(',')}
                    {s.snippet?.original ? ` · «${s.snippet.original}»` : ''}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="text-[12px] text-[var(--text-muted)] underline"
              onClick={() => {
                clearLearningSignals()
                clearSkillMasteryMap()
                refreshDebug()
              }}
            >
              {MY_PLAN_COPY.debugClear}
            </button>
          </div>
        ) : null}
      </div>
    ) : null

  const extra = resolvedSecondary[0] ?? null
  const nowView = resolvedMain
    ? buildNowCardView({
        audience,
        heroStart: true,
        task: {
          title: resolvedMain.title,
          reasonLine: resolvedMain.reasonLine,
          buttonLabel: resolvedMain.buttonLabel,
          ariaLabel: resolvedMain.ariaLabel,
          timeLabel: resolvedMain.timeLabel,
          goalType: resolvedMain.goalType,
        },
      })
    : programStatus === 'no_catalog'
      ? buildNowCardView({ audience, task: null })
      : buildIdleNowCardView({ audience, programTask })

  const showPaywallHint =
    showAdultPaywallHint &&
    audience === 'adult' &&
    resolvedMain?.goalType === 'reinforce' &&
    !canUseAiReinforce()

  const nowBlock = (
    <MyPlanCard
      title={nowView.headerTitle}
      footer={
        nowView.footer ? (
          <MyPlanCardFooterButton
            variant={nowView.footer.variant}
            label={nowView.footer.label}
            ariaLabel={nowView.footer.ariaLabel}
            disabled={practiceBusy}
            onClick={() => {
              if (resolvedMain) {
                void handleAction(resolvedMain.action, 'main')
                return
              }
              if (programStatus === 'active' && programTask) {
                void handleAction(programTask.action, 'secondary')
                return
              }
              openLessons()
            }}
          />
        ) : null
      }
    >
      <p className={MY_PLAN_CARD_BODY_TITLE}>{nowView.bodyTitle}</p>
      <p className={MY_PLAN_CARD_BODY_REASON}>{nowView.bodyReason}</p>
      {extra ? (
        <div className="space-y-1.5 pt-1">
          <p className={MY_PLAN_CARD_BODY_REASON}>
            {copy.sectionMore}: {extra.title}
          </p>
          <MyPlanCardFooterButton
            variant="action"
            label={extra.buttonLabel}
            ariaLabel={extra.ariaLabel}
            disabled={practiceBusy}
            onClick={() => void handleAction(extra.action, 'secondary')}
          />
        </div>
      ) : null}
      {showPaywallHint ? (
        <p className="break-words text-[12px] leading-snug text-[var(--text-muted)]">
          {MY_PLAN_COPY.adultPaywallLead} {MY_PLAN_COPY.adultPaywallLocal}.
        </p>
      ) : null}
      {practiceBusy ? (
        <p className="break-words text-[13px] text-[var(--text-muted)]">{copy.busy}</p>
      ) : null}
    </MyPlanCard>
  )

  const shownZones = attentionZones.slice(0, 2)
  const mainSkill = mainZoneSkillId(resolvedMain)
  const growthBlock = (
    <MyPlanCard
      title={copy.sectionGrowth}
      footer={
        shownZones.length === 0 ? (
          <MyPlanCardFooterButton
            variant="launch"
            label={copy.zonesEmptyCta}
            ariaLabel={copy.zonesEmptyCta}
            disabled={practiceBusy}
            onClick={() => {
              onMarkOpenedFromMyPlan?.()
              if (onOpenTutorChat) {
                onOpenTutorChat()
                return
              }
              void handleAction({ kind: 'quick_practice', entrySource: 'my_plan' }, 'secondary')
            }}
          />
        ) : null
      }
    >
      {shownZones.length === 0 ? (
        <>
          <p className={MY_PLAN_CARD_BODY_TITLE}>{copy.zonesEmpty}</p>
          <p className={MY_PLAN_CARD_BODY_REASON}>{copy.growthEmptyHint}</p>
        </>
      ) : (
        <ul className="space-y-4">
          {shownZones.map((z, index) => {
            const quieter = Boolean(mainSkill && z.skillTagId === mainSkill)
            const canPractice = Boolean(z.chipActive && z.lessonId)
            return (
              <li key={z.skillTagId} className="min-w-0">
                <p className="flex min-w-0 items-start gap-2">
                  <span className="w-5 shrink-0 text-[15px] font-medium tabular-nums leading-[1.45] text-[var(--text-muted)]">
                    {index + 1}.
                  </span>
                  <span className="min-w-0 break-words text-[15px] font-semibold leading-[1.45] text-[var(--text)]">
                    {z.title}
                  </span>
                </p>
                <p className="mt-0.5 break-words pl-7 text-[14px] leading-snug text-[var(--text-muted)]">
                  {audience === 'child'
                    ? `Тут часто спотыкаешься · ${z.errorCount}`
                    : `${z.sourceHint} · ${z.errorCount}`}
                </p>
                {quieter ? (
                  <p className="mt-1 break-words pl-7 text-[14px] leading-snug text-[var(--text-muted)]">
                    {copy.zonesAlreadyNow}
                  </p>
                ) : (
                  <button
                    type="button"
                    className={MY_PLAN_INSET_LAUNCH}
                    disabled={practiceBusy}
                    onClick={() => {
                      if (canPractice && z.lessonId) {
                        void runPractice({
                          lessonId: z.lessonId,
                          mode: 'balanced',
                          entrySource: 'my_plan',
                        })
                        return
                      }
                      onMarkOpenedFromMyPlan?.()
                      if (z.skillTagId) markTutorCardConsumed(z.skillTagId)
                      onOpenTutorChat?.({ prefill: `Разберём: ${z.title}` })
                    }}
                  >
                    {copy.zonesRepeat}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </MyPlanCard>
  )

  const programView = buildProgramCardView({
    audience,
    programStatus,
    programTask,
    unstartedCount,
  })

  const programCardBlock = (
    <MyPlanCard
      title={programView.headerTitle}
      footer={
        programView.footer ? (
          <MyPlanCardFooterButton
            variant={programView.footer.variant}
            label={programView.footer.label}
            ariaLabel={programView.footer.ariaLabel}
            disabled={practiceBusy}
            onClick={() => {
              trackMyPlanEvent('my_plan_program_cta', {
                audience,
                programStatus,
                anchorLevel,
                lessonId:
                  programTask?.action.kind === 'open_lesson' ? programTask.action.lessonId : undefined,
              })
              if (programStatus === 'active' && programTask) {
                void handleAction(programTask.action, 'secondary')
                return
              }
              openLessons()
            }}
          />
        ) : null
      }
    >
      <p className={MY_PLAN_CARD_BODY_TITLE}>{programView.bodyTitle}</p>
      <p className={MY_PLAN_CARD_BODY_REASON}>{programView.bodyReason}</p>
    </MyPlanCard>
  )

  const tutorBlock = featureFlags.tutorChatV1 ? (
    <MyPlanCard
      title={copy.sectionTutor}
      footer={
        resolvedTutorTasks.length === 0 ? (
          <MyPlanCardFooterButton
            variant="action"
            label={copy.sectionTutor}
            ariaLabel={copy.sectionTutor}
            onClick={() => {
              onMarkOpenedFromMyPlan?.()
              onOpenTutorChat?.()
            }}
          />
        ) : null
      }
    >
      {resolvedTutorTasks.length === 0 ? (
        <p className={MY_PLAN_CARD_BODY_REASON}>{copy.growthEmptyHint}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {resolvedTutorTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              className={MY_PLAN_TUTOR_CHIP}
              aria-label={task.ariaLabel}
              onClick={() => void handleAction(task.action, 'secondary')}
            >
              {task.title}
            </button>
          ))}
        </div>
      )}
    </MyPlanCard>
  ) : null

  const statusBlock = (
    <MyPlanCard
      title={copy.sectionStatus}
      footer={
        <MyPlanCardFooterButton
          variant="action"
          label={copy.statusLink}
          ariaLabel={copy.statusLink}
          onClick={openProgress}
        />
      }
    >
      <p className={MY_PLAN_CARD_BODY_TITLE}>
        {myPlanStreakLine(status?.dailyStreak ?? 0, audience)}
      </p>
      <p className={MY_PLAN_CARD_BODY_REASON}>
        {myPlanLevelLine(status?.level ?? 1, status?.totalXP, audience)}
      </p>
    </MyPlanCard>
  )

  const modesBlock = (
    <MyPlanCard
      title={copy.sectionModes}
      footer={
        <MyPlanCardFooterButton
          variant="expand"
          label={modesOpen ? copy.modesHide : copy.modesMore}
          ariaLabel={modesOpen ? copy.modesHide : copy.modesMore}
          onClick={() => setModesOpen((open) => !open)}
        />
      }
    >
      {modesOpen ? (
        <div className="space-y-2">
          {modeDoors.map((row) => (
            <MyPlanCardFooterButton
              key={row.id}
              variant="expand"
              label={row.label}
              ariaLabel={row.label}
              disabled={practiceBusy}
              onClick={() => void handleModeDoor(row.target)}
            />
          ))}
        </div>
      ) : (
        <p className={MY_PLAN_CARD_BODY_REASON}>{copy.modesHint}</p>
      )}
    </MyPlanCard>
  )

  const recView = buildRecommendationCardView({
    audience,
    dailyClosedToday,
    dayXOf7,
  })
  const recBlock = (
    <MyPlanCard title={recView.headerTitle}>
      <p className={MY_PLAN_CARD_BODY_TITLE}>{recView.bodyTitle}</p>
      <p className={MY_PLAN_CARD_BODY_REASON}>{recView.bodyReason}</p>
    </MyPlanCard>
  )

  return (
    <div className="w-full min-w-0 space-y-3">
      {nowBlock}
      {growthBlock}
      {programCardBlock}
      {tutorBlock}
      {statusBlock}
      {modesBlock}
      {recBlock}
      {debugLogBlock}
    </div>
  )
}
