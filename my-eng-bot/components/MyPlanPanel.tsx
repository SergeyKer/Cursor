'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { MENU_PRIMARY_CTA_CLASS } from '@/lib/homeCtaStyles'
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
import type { MyPlanAction, MyPlanRecommendation, MyPlanStatusSlice } from '@/lib/myPlan/types'
import {
  MY_PLAN_COPY,
  myPlanCopy,
  myPlanLevelLine,
  myPlanStreakLine,
} from '@/lib/uiCopy/myPlan'
import type { PracticeEntrySource, PracticeExerciseType, PracticeMode } from '@/types/practice'
import type { Settings } from '@/lib/types'

function levelToCatalogLevel(level: Settings['level']): LessonCatalogLevel {
  const id = (level || 'a2').toLowerCase()
  if (id === 'a1' || id === 'a2' || id === 'b1' || id === 'b2' || id === 'c1' || id === 'c2') {
    return id.toUpperCase() as LessonCatalogLevel
  }
  return 'A2'
}

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
        className="language-note-topic-chip w-fit max-w-full rounded-lg border px-2.5 py-1 text-left font-sans text-[12px] font-normal leading-snug text-[var(--text-muted)]"
        onClick={() => onOpenLesson(zone.lessonId!)}
        aria-label={`${MY_PLAN_COPY.openLesson}: ${zone.title}`}
      >
        {label}
      </button>
    )
  }
  return (
    <div className="language-note-topic-chip w-fit max-w-full rounded-lg border px-2.5 py-1 font-sans text-[12px] font-normal leading-snug text-[var(--text-muted)]">
      {label}
    </div>
  )
}

export interface MyPlanPanelProps {
  mainTask?: MyPlanRecommendation | null
  secondary?: MyPlanRecommendation[]
  /** Legacy flat list when flag off. */
  recommendations?: MyPlanRecommendation[]
  status?: MyPlanStatusSlice
  attentionZones?: AttentionZone[]
  modeGap?: { skillTagId: string; title: string } | null
  settings: Settings
  nowGoalLayout?: boolean
  showAdultPaywallHint?: boolean
  onOpenLearningLesson?: (lessonId: string) => void
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
  onMarkOpenedFromMyPlan?: () => void
}

export default function MyPlanPanel({
  mainTask = null,
  secondary = [],
  recommendations,
  status,
  attentionZones = [],
  modeGap = null,
  settings,
  nowGoalLayout = true,
  showAdultPaywallHint = false,
  onOpenLearningLesson,
  onOpenPracticeSession,
  onGeneratePracticeSession,
  onOpenVocabularyWorlds,
  onMenuViewChange,
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
    trackMyPlanEvent('my_plan_viewed', {
      audience,
      hasMain: Boolean(resolvedMain),
      mainType: resolvedMain?.goalType,
    })
  }, [audience, resolvedMain])

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
          action.kind === 'reinforce_skill'
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
      onOpenVocabularyWorlds,
      resolvedMain?.goalType,
      runPractice,
      settings.level,
    ]
  )

  const debugZonesBlock = (
    <div className="rounded-lg border border-[var(--border)]/60 bg-[var(--menu-card-bg)] px-3 py-2 opacity-80">
      <p className="text-[12px] font-medium text-[var(--text-muted)]">{MY_PLAN_COPY.zonesTitle}</p>
      <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">{MY_PLAN_COPY.zonesLead}</p>
      {attentionZones.length === 0 ? (
        <div className="mt-2 space-y-1">
          <p className="text-[12px] text-[var(--text-muted)]">{MY_PLAN_COPY.zonesEmpty}</p>
          <p className="text-[11px] text-[var(--text-muted)]">{MY_PLAN_COPY.zonesEmptyHint}</p>
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {attentionZones.map((z) => (
            <li key={z.skillTagId} className="space-y-0.5">
              <AttentionTopicChip zone={z} onOpenLesson={onOpenLearningLesson} />
              <p className="text-[11px] leading-snug text-[var(--text-muted)]">{z.sourceHint}</p>
            </li>
          ))}
        </ul>
      )}
      {modeGap ? (
        <div className="mt-2 border-t border-[var(--border)]/60 pt-2">
          <p className="text-[12px] font-medium text-[var(--text-muted)]">{MY_PLAN_COPY.gapTitle}</p>
          <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
            {MY_PLAN_COPY.gapReason} ({modeGap.title})
          </p>
        </div>
      ) : null}
    </div>
  )

  const debugLogBlock =
    showDebug ? (
      <div className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2.5 opacity-80">
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
                  <li key={s.id} className="border-b border-[var(--border)] pb-1">
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
      <div className="px-1 py-1">
        <p className="text-[13px] text-[var(--text-muted)]">
          {myPlanStreakLine(status.dailyStreak, audience)}
          {' · '}
          {myPlanLevelLine(status.level, status.totalXP, audience)}
        </p>
        {onMenuViewChange ? (
          <button
            type="button"
            className="mt-1 text-left text-[13px] text-[var(--text)] underline-offset-2 hover:underline"
            onClick={() => {
              trackMyPlanEvent('my_plan_progress_link', { audience })
              onMenuViewChange('progress')
            }}
          >
            {copy.statusLink}
          </button>
        ) : null}
      </div>
    ) : null

  if (!resolvedMain) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
          <p className="text-[13px] font-medium text-[var(--text-muted)]">{copy.sectionNow}</p>
          <p className="mt-1 text-[16px] font-semibold text-[var(--text)]">{copy.emptyTitle}</p>
          <p className="mt-1 text-[14px] leading-snug text-[var(--text-muted)]">{copy.emptyBody}</p>
          {onMenuViewChange ? (
            <button
              type="button"
              className={`${MENU_PRIMARY_CTA_CLASS} mt-3 w-full min-h-[48px]`}
              onClick={() => onMenuViewChange('lessons')}
            >
              {copy.emptyCta}
            </button>
          ) : null}
        </div>
        {statusBlock}
        {debugZonesBlock}
        {debugLogBlock}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <p className="text-[13px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {copy.sectionNow}
        </p>
        <p className="mt-1 text-[18px] font-semibold leading-snug text-[var(--text)]">{resolvedMain.title}</p>
        <p className="mt-2 text-[14px] leading-snug text-[var(--text-muted)]">{resolvedMain.reasonLine}</p>
        {resolvedMain.timeLabel ? (
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">{resolvedMain.timeLabel}</p>
        ) : null}
        {showAdultPaywallHint &&
        audience === 'adult' &&
        resolvedMain.goalType === 'reinforce' &&
        !canUseAiReinforce() ? (
          <p className="mt-2 text-[12px] leading-snug text-[var(--text-muted)]">
            {MY_PLAN_COPY.adultPaywallLead} {MY_PLAN_COPY.adultPaywallLocal}.
          </p>
        ) : null}
        <div className="pt-3">
          <button
            type="button"
            disabled={practiceBusy}
            className={`${MENU_PRIMARY_CTA_CLASS} w-full min-h-[48px]`}
            aria-label={resolvedMain.ariaLabel}
            onClick={() => void handleAction(resolvedMain.action, 'main')}
          >
            {practiceBusy ? copy.busy : resolvedMain.buttonLabel}
          </button>
        </div>
      </div>

      {resolvedSecondary.length > 0 ? (
        <div className="space-y-1.5">
          <p className="px-1 text-[13px] font-medium text-[var(--text-muted)]">{copy.sectionMore}</p>
          {resolvedSecondary.map((rec) => (
            <button
              key={rec.id}
              type="button"
              disabled={practiceBusy}
              className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5 text-left"
              aria-label={rec.ariaLabel}
              onClick={() => void handleAction(rec.action, 'secondary')}
            >
              <span className="text-[14px] font-medium leading-snug text-[var(--text)]">{rec.title}</span>
              <span className="shrink-0 text-[var(--text-muted)]" aria-hidden>
                →
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {statusBlock}
      {debugZonesBlock}
      {debugLogBlock}
    </div>
  )
}
