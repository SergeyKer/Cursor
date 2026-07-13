'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { MENU_PRIMARY_CTA_CLASS } from '@/lib/homeCtaStyles'
import { pickQuickStartPracticeTopic, type LessonCatalogLevel } from '@/lib/lessonCatalog'
import type { MyPlanAction, MyPlanRecommendation } from '@/lib/myPlan/types'
import type { PracticeEntrySource, PracticeExerciseType, PracticeMode } from '@/types/practice'
import type { Settings } from '@/lib/types'

function levelToCatalogLevel(level: Settings['level']): LessonCatalogLevel {
  const id = (level || 'a2').toLowerCase()
  if (id === 'a1' || id === 'a2' || id === 'b1' || id === 'b2' || id === 'c1' || id === 'c2') {
    return id.toUpperCase() as LessonCatalogLevel
  }
  return 'A2'
}

export interface MyPlanPanelProps {
  recommendations: MyPlanRecommendation[]
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
  settings,
  onOpenLearningLesson,
  onOpenPracticeSession,
  onOpenVocabularyWorlds,
  onMenuViewChange,
}: MyPlanPanelProps) {
  const [practiceBusy, setPracticeBusy] = useState(false)

  const intro = useMemo(
    () => ({
      lead: 'У урока — бейдж с 3 ступенями. Полка — в Прогрессе. Кубок 🏆: золото урока + 5 челленджей 11/12.',
      hint: 'Выберите карточку ниже. Счётчик кубков и темы с 🏆 - в «Прогрессе».',
    }),
    []
  )

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

  if (recommendations.length === 0) {
    return (
      <div className="space-y-2">
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
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
        <p className="text-[13px] font-medium text-[var(--text-muted)]">Мой план</p>
        <p className="mt-1 text-[12px] leading-snug text-[var(--text-muted)]">{intro.lead}</p>
        <p className="mt-1 text-[12px] leading-snug text-[var(--text-muted)]">{intro.hint}</p>
        <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
          Три шага с учётом ваших уроков и практики. Обновляется при каждом открытии.
        </p>
      </div>

      {recommendations.map((rec) => (
        <div key={rec.id} className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
          <p className="text-[15px] font-semibold leading-snug text-[var(--text)]">{rec.title}</p>
          {rec.subtitle ? <p className="mt-0.5 text-[13px] font-medium leading-snug text-slate-700">{rec.subtitle}</p> : null}
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
    </div>
  )
}
