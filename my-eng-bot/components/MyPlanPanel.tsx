'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { MENU_PRIMARY_CTA_CLASS } from '@/lib/homeCtaStyles'
import { pickQuickStartPracticeTopic, type LessonCatalogLevel } from '@/lib/lessonCatalog'
import type { AttentionZone } from '@/lib/learningMemory/types'
import type { LearningSignal } from '@/lib/learningMemory/types'
import {
  clearLearningSignals,
  clearSkillMasteryMap,
  listLearningSignals,
} from '@/lib/learningMemory/storage'
import { isLearningMemoryDebugEnabled } from '@/lib/learningMemory/debug'
import type { MyPlanAction, MyPlanRecommendation } from '@/lib/myPlan/types'
import { MY_PLAN_COPY } from '@/lib/uiCopy/myPlan'
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
        className="language-note-topic-chip w-fit max-w-full rounded-lg border px-2.5 py-1 text-left font-sans text-[13px] font-normal leading-snug text-[var(--text)]"
        onClick={() => onOpenLesson(zone.lessonId!)}
        aria-label={`${MY_PLAN_COPY.openLesson}: ${zone.title}`}
      >
        {label}
      </button>
    )
  }
  return (
    <div className="language-note-topic-chip w-fit max-w-full rounded-lg border px-2.5 py-1 font-sans text-[13px] font-normal leading-snug text-[var(--text)]">
      {label}
    </div>
  )
}

export interface MyPlanPanelProps {
  recommendations: MyPlanRecommendation[]
  attentionZones?: AttentionZone[]
  modeGap?: { skillTagId: string; title: string } | null
  settings: Settings
  onOpenLearningLesson?: (lessonId: string) => void
  onOpenPracticeSession?: (request: {
    lessonId?: string
    mode: PracticeMode
    entrySource: PracticeEntrySource
    customTopic?: string
    referenceExerciseType?: PracticeExerciseType
  }) => Promise<void> | void
  onOpenVocabularyWorlds?: () => void | Promise<void>
  onMenuViewChange?: (view: 'lessons') => void
}

export default function MyPlanPanel({
  recommendations,
  attentionZones = [],
  modeGap = null,
  settings,
  onOpenLearningLesson,
  onOpenPracticeSession,
  onOpenVocabularyWorlds,
  onMenuViewChange,
}: MyPlanPanelProps) {
  const [practiceBusy, setPracticeBusy] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugSignals, setDebugSignals] = useState<LearningSignal[]>([])
  const showDebug = isLearningMemoryDebugEnabled()

  const intro = useMemo(
    () => ({
      lead: 'У урока — бейдж с 3 ступенями. Полка — в Прогрессе. Кубок 🏆: золото урока + 5 челленджей 11/12.',
      hint: 'Выберите карточку ниже. Счётчик кубков и темы с 🏆 - в «Прогрессе».',
    }),
    []
  )

  const refreshDebug = useCallback(() => {
    setDebugSignals(listLearningSignals().slice(-40).reverse())
  }, [])

  const runPractice = useCallback(
    async (req: { lessonId?: string; mode: PracticeMode; entrySource: PracticeEntrySource }) => {
      if (!onOpenPracticeSession || practiceBusy) return
      setPracticeBusy(true)
      try {
        await onOpenPracticeSession(req)
      } finally {
        setPracticeBusy(false)
      }
    },
    [onOpenPracticeSession, practiceBusy]
  )

  const handleAction = useCallback(
    async (action: MyPlanAction) => {
      switch (action.kind) {
        case 'resume_lesson':
        case 'open_lesson':
          onOpenLearningLesson?.(action.lessonId)
          return
        case 'start_practice':
          await runPractice({
            lessonId: action.lessonId,
            mode: action.mode,
            entrySource: action.entrySource,
          })
          return
        case 'quick_practice': {
          const topic = pickQuickStartPracticeTopic(levelToCatalogLevel(settings.level))
          if (!topic) return
          await runPractice({
            lessonId: topic.id,
            mode: 'relaxed',
            entrySource: action.entrySource,
          })
          return
        }
        case 'weak_spot':
          if (action.target === 'vocabulary') {
            await onOpenVocabularyWorlds?.()
            return
          }
          {
            const topic = pickQuickStartPracticeTopic(levelToCatalogLevel(settings.level))
            if (!topic) return
            await runPractice({ lessonId: topic.id, mode: 'balanced', entrySource: 'quick_start' })
          }
          return
        default:
          return
      }
    },
    [onOpenLearningLesson, onOpenVocabularyWorlds, runPractice, settings.level]
  )

  const zonesBlock = (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
      <p className="text-[13px] font-medium text-[var(--text)]">{MY_PLAN_COPY.zonesTitle}</p>
      <p className="mt-1 text-[12px] leading-snug text-[var(--text-muted)]">{MY_PLAN_COPY.zonesLead}</p>
      {attentionZones.length === 0 ? (
        <div className="mt-2 space-y-1">
          <p className="text-[13px] text-[var(--text-muted)]">{MY_PLAN_COPY.zonesEmpty}</p>
          <p className="text-[12px] text-[var(--text-muted)]">{MY_PLAN_COPY.zonesEmptyHint}</p>
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-2.5">
          {attentionZones.map((zone) => (
            <li key={zone.skillTagId} className="space-y-1">
              <AttentionTopicChip zone={zone} onOpenLesson={onOpenLearningLesson} />
              <p className="text-[12px] leading-snug text-[var(--text-muted)]">{zone.sourceHint}</p>
              <p className="text-[12px] leading-snug text-[var(--text-muted)]">{zone.suggestionLine}</p>
            </li>
          ))}
        </ul>
      )}
      {modeGap ? (
        <div className="mt-3 border-t border-[var(--border)] pt-2">
          <p className="text-[13px] font-medium text-[var(--text)]">{MY_PLAN_COPY.gapTitle}</p>
          <p className="mt-1 text-[12px] leading-snug text-[var(--text-muted)]">
            {MY_PLAN_COPY.gapReason} ({modeGap.title})
          </p>
        </div>
      ) : null}
    </div>
  )

  const debugBlock =
    showDebug ? (
      <div className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2.5">
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

  if (recommendations.length === 0) {
    return (
      <div className="space-y-2">
        {zonesBlock}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
          <p className="text-[13px] font-medium text-[var(--text-muted)]">Мой план</p>
          <p className="mt-1 text-[14px] text-[var(--text)]">{intro.lead}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-muted)]">
            Пока нечего рекомендовать по вашим данным. Загляните в Уроки или начните с быстрой практики.
          </p>
        </div>
        {onMenuViewChange ? (
          <button type="button" className={MENU_PRIMARY_CTA_CLASS} onClick={() => onMenuViewChange('lessons')}>
            К разделу «Уроки»
          </button>
        ) : null}
        {debugBlock}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {zonesBlock}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
        <p className="text-[13px] font-medium text-[var(--text-muted)]">Мой план</p>
        <p className="mt-1 text-[12px] leading-snug text-[var(--text-muted)]">{intro.lead}</p>
        <p className="mt-1 text-[12px] leading-snug text-[var(--text-muted)]">{intro.hint}</p>
        <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
          Три шага с учётом ваших уроков и практики. Обновляется при каждом открытии.
        </p>
      </div>

      {recommendations.map((rec) => (
        <div
          key={rec.id}
          className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.07)]"
        >
          <p className="text-[15px] font-semibold leading-snug text-[var(--text)]">{rec.title}</p>
          {rec.subtitle ? (
            <p className="mt-0.5 text-[13px] font-medium leading-snug text-slate-700">{rec.subtitle}</p>
          ) : null}
          <p className="mt-1 text-[12px] leading-snug text-[var(--text-muted)]">{rec.reasonLine}</p>
          <div className="pt-2">
            <button
              type="button"
              disabled={practiceBusy}
              className={MENU_PRIMARY_CTA_CLASS}
              aria-label={rec.ariaLabel}
              onClick={() => void handleAction(rec.action)}
            >
              {practiceBusy ? 'Готовим…' : rec.buttonLabel}
            </button>
          </div>
        </div>
      ))}
      {debugBlock}
    </div>
  )
}
