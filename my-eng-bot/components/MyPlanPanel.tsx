'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { featureFlags } from '@/lib/featureFlags'
import { isReferenceLessonId } from '@/lib/reference/getReferenceLessonTopics'
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
import type {
  MyPlanAction,
  MyPlanRecommendation,
  MyPlanStatusSlice,
  ProgramStatus,
} from '@/lib/myPlan/types'
import {
  MY_PLAN_COPY,
  buildNowCardView,
  buildProgramCardView,
  myPlanCopy,
  myPlanLevelLine,
  myPlanStreakLine,
} from '@/lib/uiCopy/myPlan'
import MyPlanCard from '@/components/myPlan/MyPlanCard'
import MyPlanCardFooterButton from '@/components/myPlan/MyPlanCardFooterButton'
import {
  MY_PLAN_CARD_BODY_REASON,
  MY_PLAN_CARD_BODY_TITLE,
} from '@/lib/myPlan/cardStyles'
import { recordSoftFocusShown } from '@/lib/myPlan/softFocusRotation'
import type { PracticeEntrySource, PracticeExerciseType, PracticeMode } from '@/types/practice'
import type { Settings } from '@/lib/types'

function levelToCatalogLevel(level: Settings['level']): LessonCatalogLevel {
  const id = (level || 'a2').toLowerCase()
  if (id === 'a1' || id === 'a2' || id === 'b1' || id === 'b2' || id === 'c1' || id === 'c2') {
    return id.toUpperCase() as LessonCatalogLevel
  }
  return 'A2'
}

const CHIP_CLASS =
  'language-note-topic-chip w-fit max-w-full min-w-0 rounded-lg border px-2.5 py-1.5 text-left font-sans text-[13px] font-normal leading-snug break-words text-[var(--text)]'

const REFERENCE_LINK_CLASS =
  'mt-1 break-words text-left text-[13px] font-medium text-[var(--text-muted)] underline decoration-[var(--border)] underline-offset-2 touch-manipulation hover:text-[var(--text)] hover:decoration-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60'

function AttentionTopicChip({
  zone,
  onOpenLesson,
}: {
  zone: AttentionZone
  onOpenLesson?: (lessonId: string) => void
}) {
  const label = `${zone.title} · ${zone.errorCount}`
  if (zone.chipActive && zone.lessonId && onOpenLesson) {
    return (
      <button
        type="button"
        className={`${CHIP_CLASS} language-note-topic-chip--button touch-manipulation`}
        onClick={() => onOpenLesson(zone.lessonId!)}
        aria-label={`${MY_PLAN_COPY.openLesson}: ${zone.title}`}
      >
        {label}
      </button>
    )
  }
  return <div className={CHIP_CLASS}>{label}</div>
}

function referenceLessonIdFromAction(action: MyPlanAction): string | null {
  if (
    action.kind === 'resume_lesson' ||
    action.kind === 'open_lesson' ||
    action.kind === 'start_practice' ||
    action.kind === 'reinforce_skill' ||
    action.kind === 'open_reference'
  ) {
    return action.lessonId ?? null
  }
  return null
}

export interface MyPlanPanelProps {
  mainTask?: MyPlanRecommendation | null
  secondary?: MyPlanRecommendation[]
  /** Legacy flat list when flag off. */
  recommendations?: MyPlanRecommendation[]
  status?: MyPlanStatusSlice
  programTask?: MyPlanRecommendation | null
  programStatus?: ProgramStatus
  unstartedCount?: number
  anchorLevel?: string
  attentionZones?: AttentionZone[]
  modeGap?: { skillTagId: string; title: string } | null
  settings: Settings
  nowGoalLayout?: boolean
  showAdultPaywallHint?: boolean
  onOpenLearningLesson?: (lessonId: string) => void
  onOpenReferenceTopic?: (lessonId: string) => void
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
  onMenuViewChange?: (view: 'lessons' | 'progress' | 'myPlan') => void
  onOpenProgressSpace?: () => void
  onMarkOpenedFromMyPlan?: () => void
}

export default function MyPlanPanel({
  mainTask = null,
  secondary = [],
  recommendations,
  status,
  programTask = null,
  programStatus = 'no_catalog',
  unstartedCount = 0,
  anchorLevel,
  attentionZones = [],
  modeGap = null,
  settings,
  nowGoalLayout = true,
  showAdultPaywallHint = false,
  onOpenLearningLesson,
  onOpenReferenceTopic,
  onOpenPracticeSession,
  onGeneratePracticeSession,
  onOpenVocabularyWorlds,
  onMenuViewChange,
  onOpenProgressSpace,
  onMarkOpenedFromMyPlan,
}: MyPlanPanelProps) {
  const [practiceBusy, setPracticeBusy] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugSignals, setDebugSignals] = useState<LearningSignal[]>([])
  const showDebug = isLearningMemoryDebugEnabled()
  const audience = settings.audience === 'child' ? 'child' : 'adult'
  const copy = myPlanCopy(audience)

  const legacyList = !nowGoalLayout && recommendations ? recommendations : null
  const resolvedMain = legacyList ? legacyList[0] ?? null : mainTask
  const resolvedSecondary = legacyList ? legacyList.slice(1, 3) : secondary

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
            await onOpenVocabularyWorlds?.()
            return
          }
          {
            const topic = pickQuickStartPracticeTopic(levelToCatalogLevel(settings.level))
            if (!topic) return
            await runPractice({ lessonId: topic.id, mode: 'balanced', entrySource: 'my_plan' })
          }
          return
        default:
          return
      }
    },
    [
      audience,
      onMarkOpenedFromMyPlan,
      onOpenLearningLesson,
      onOpenReferenceTopic,
      onOpenVocabularyWorlds,
      resolvedMain?.goalType,
      runPractice,
      settings.level,
    ]
  )

  const zonesBlock = (
    <div className="w-full min-w-0 rounded-xl border border-[var(--border)]/60 bg-[var(--menu-card-bg)] px-3 py-2.5 opacity-75">
      <p className="text-[13px] font-medium text-[var(--text-muted)]">{MY_PLAN_COPY.zonesTitle}</p>
      <p className="mt-1 break-words text-[12px] leading-snug text-[var(--text-muted)]">
        {MY_PLAN_COPY.zonesLead}
      </p>
      {attentionZones.length === 0 ? (
        <div className="mt-2 space-y-1">
          <p className="break-words text-[13px] text-[var(--text-muted)]">{MY_PLAN_COPY.zonesEmpty}</p>
          <p className="break-words text-[12px] text-[var(--text-muted)]">{MY_PLAN_COPY.zonesEmptyHint}</p>
        </div>
      ) : (
        <ul className="mt-2 flex min-w-0 flex-col gap-2">
          {attentionZones.map((z) => (
            <li key={z.skillTagId} className="min-w-0 space-y-0.5">
              <AttentionTopicChip zone={z} onOpenLesson={onOpenLearningLesson} />
              <p className="break-words text-[12px] leading-snug text-[var(--text-muted)]">{z.sourceHint}</p>
            </li>
          ))}
        </ul>
      )}
      {modeGap ? (
        <div className="mt-2 border-t border-[var(--border)]/60 pt-2">
          <p className="text-[13px] font-medium text-[var(--text-muted)]">{MY_PLAN_COPY.gapTitle}</p>
          <p className="mt-1 break-words text-[12px] leading-snug text-[var(--text-muted)]">
            {MY_PLAN_COPY.gapReason} ({modeGap.title})
          </p>
        </div>
      ) : null}
    </div>
  )

  const debugLogBlock =
    showDebug ? (
      <div className="w-full min-w-0 rounded-lg border border-dashed border-[var(--border)] px-3 py-2.5 opacity-80">
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

  const statusBlock =
    status ? (
      <div className="w-full min-w-0 py-0.5">
        <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">
          {myPlanStreakLine(status.dailyStreak, audience)}
          {' · '}
          {myPlanLevelLine(status.level, status.totalXP, audience)}
        </p>
        {onMenuViewChange || onOpenProgressSpace ? (
          <button
            type="button"
            className="mt-1 min-h-[40px] py-1 text-left text-[15px] font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--text)]"
            onClick={() => {
              trackMyPlanEvent('my_plan_progress_link', { audience })
              if (onOpenProgressSpace) {
                onOpenProgressSpace()
                return
              }
              onMenuViewChange?.('progress')
            }}
          >
            {copy.statusLink}
          </button>
        ) : null}
      </div>
    ) : null

  const secondaryBlock =
    resolvedSecondary.length > 0 ? (
      <div className="w-full min-w-0 space-y-3">
        {resolvedSecondary.map((rec) => {
          const view = buildNowCardView({
            audience,
            task: {
              title: rec.title,
              reasonLine: rec.reasonLine,
              buttonLabel: rec.buttonLabel,
              ariaLabel: rec.ariaLabel,
              timeLabel: rec.timeLabel,
            },
          })
          return (
            <MyPlanCard
              key={rec.id}
              title={copy.sectionMore}
              footer={
                view.footer ? (
                  <MyPlanCardFooterButton
                    variant={view.footer.variant}
                    label={view.footer.label}
                    ariaLabel={view.footer.ariaLabel}
                    disabled={practiceBusy}
                    onClick={() => void handleAction(rec.action, 'secondary')}
                  />
                ) : null
              }
            >
              <p className={MY_PLAN_CARD_BODY_TITLE}>{view.bodyTitle}</p>
              <p className={MY_PLAN_CARD_BODY_REASON}>{view.bodyReason}</p>
            </MyPlanCard>
          )
        })}
      </div>
    ) : null

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
                  programTask?.action.kind === 'open_lesson'
                    ? programTask.action.lessonId
                    : undefined,
              })
              if (programStatus === 'active' && programTask) {
                void handleAction(programTask.action, 'secondary')
                return
              }
              if (programStatus === 'level_complete') {
                onMenuViewChange?.('lessons')
              }
            }}
          />
        ) : null
      }
    >
      <p className={MY_PLAN_CARD_BODY_TITLE}>{programView.bodyTitle}</p>
      <p className={MY_PLAN_CARD_BODY_REASON}>{programView.bodyReason}</p>
    </MyPlanCard>
  )

  const showEmptyMainFallback = !resolvedMain && programStatus === 'no_catalog'

  const nowCardFromTask = (task: MyPlanRecommendation, source: 'main' | 'secondary') => {
    const view = buildNowCardView({
      audience,
      task: {
        title: task.title,
        reasonLine: task.reasonLine,
        buttonLabel: task.buttonLabel,
        ariaLabel: task.ariaLabel,
        timeLabel: task.timeLabel,
      },
    })
    const refId =
      source === 'main' && featureFlags.referenceV1 && onOpenReferenceTopic
        ? (() => {
            const lessonId = referenceLessonIdFromAction(task.action)
            return lessonId && isReferenceLessonId(lessonId) ? lessonId : null
          })()
        : null
    const showPaywallHint =
      source === 'main' &&
      showAdultPaywallHint &&
      audience === 'adult' &&
      task.goalType === 'reinforce' &&
      !canUseAiReinforce()

    return (
      <MyPlanCard
        title={view.headerTitle}
        footer={
          view.footer ? (
            <MyPlanCardFooterButton
              variant={view.footer.variant}
              label={view.footer.label}
              ariaLabel={view.footer.ariaLabel}
              disabled={practiceBusy}
              onClick={() => void handleAction(task.action, source)}
            />
          ) : null
        }
      >
        <p className={MY_PLAN_CARD_BODY_TITLE}>{view.bodyTitle}</p>
        <p className={MY_PLAN_CARD_BODY_REASON}>{view.bodyReason}</p>
        {showPaywallHint ? (
          <p className="break-words text-[12px] leading-snug text-[var(--text-muted)]">
            {MY_PLAN_COPY.adultPaywallLead} {MY_PLAN_COPY.adultPaywallLocal}.
          </p>
        ) : null}
        {practiceBusy && source === 'main' ? (
          <p className="break-words text-[13px] text-[var(--text-muted)]">{copy.busy}</p>
        ) : null}
        {refId ? (
          <button
            type="button"
            disabled={practiceBusy}
            className={REFERENCE_LINK_CLASS}
            aria-label={copy.referenceLink}
            onClick={() => void handleAction({ kind: 'open_reference', lessonId: refId }, 'secondary')}
          >
            {copy.referenceLink}
          </button>
        ) : null}
      </MyPlanCard>
    )
  }

  if (showEmptyMainFallback) {
    const emptyView = buildNowCardView({ audience, task: null })
    return (
      <div className="w-full min-w-0 space-y-3">
        <MyPlanCard
          title={emptyView.headerTitle}
          footer={
            emptyView.footer && onMenuViewChange ? (
              <MyPlanCardFooterButton
                variant={emptyView.footer.variant}
                label={emptyView.footer.label}
                ariaLabel={emptyView.footer.ariaLabel}
                onClick={() => onMenuViewChange('lessons')}
              />
            ) : null
          }
        >
          <p className={MY_PLAN_CARD_BODY_TITLE}>{emptyView.bodyTitle}</p>
          <p className={MY_PLAN_CARD_BODY_REASON}>{emptyView.bodyReason}</p>
        </MyPlanCard>
        {programCardBlock}
        {statusBlock}
        {zonesBlock}
        {debugLogBlock}
      </div>
    )
  }

  if (!resolvedMain) {
    return (
      <div className="w-full min-w-0 space-y-3">
        {programCardBlock}
        {secondaryBlock}
        {statusBlock}
        {zonesBlock}
        {debugLogBlock}
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      {nowCardFromTask(resolvedMain, 'main')}
      {programCardBlock}
      {secondaryBlock}
      {statusBlock}
      {zonesBlock}
      {debugLogBlock}
    </div>
  )
}
