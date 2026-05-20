import type { MyPlanCatalogTopic, MyPlanInput, MyPlanLessonProgressSlice, MyPlanRecommendation } from '@/lib/myPlan/types'

function isLessonIncomplete(p: { lastCompleted: string; completedSteps: number[] }): boolean {
  return (!p.lastCompleted || !p.lastCompleted.trim()) && p.completedSteps.length > 0
}

function isTheoryCompleted(p: { lastCompleted: string }): boolean {
  return Boolean(p.lastCompleted?.trim())
}

function catalogOrder(catalog: MyPlanInput['catalog'], lessonId: string): number {
  const row = catalog.find((t) => t.id === lessonId)
  return row?.order ?? 9999
}

function pickIncompleteLesson(input: MyPlanInput): MyPlanLessonProgressSlice | null {
  const candidates = Object.values(input.lessons).filter(isLessonIncomplete)
  if (candidates.length === 0) return null
  candidates.sort((a, b) => catalogOrder(input.catalog, a.lessonId) - catalogOrder(input.catalog, b.lessonId))
  return candidates[0] ?? null
}

function pickLatestCompletedTheory(input: MyPlanInput): MyPlanLessonProgressSlice | null {
  const done = Object.values(input.lessons).filter((p) => isTheoryCompleted(p))
  if (done.length === 0) return null
  done.sort((a, b) => {
    const ta = Date.parse(a.lastCompleted) || 0
    const tb = Date.parse(b.lastCompleted) || 0
    return tb - ta
  })
  return done[0] ?? null
}

function hasPracticeAfterTheory(input: MyPlanInput, lessonId: string, theoryCompletedAtIso: string): boolean {
  const t0 = Date.parse(theoryCompletedAtIso)
  if (!Number.isFinite(t0)) return false
  return input.practiceCompleted.some((s) => {
    if (s.lessonId !== lessonId || s.status !== 'completed') return false
    const at = s.completedAt ?? 0
    return at >= t0
  })
}

function pickNextLessonInProgram(input: MyPlanInput): MyPlanCatalogTopic | null {
  const sorted = [...input.catalog].filter((t) => t.enabled && t.hasTheory).sort((a, b) => a.order - b.order)
  for (const topic of sorted) {
    const p = input.lessons[topic.id]
    if (!p || !isTheoryCompleted(p)) return topic
  }
  return null
}

function bothModeGoalsCompleted(input: MyPlanInput): boolean {
  return input.rewards.modeGoals.communication.completed && input.rewards.modeGoals.engvo.completed
}

/**
 * Детерминированные рекомендации (топ-3 после сортировки по priority).
 */
export function getMyPlanRecommendations(input: MyPlanInput): MyPlanRecommendation[] {
  const out: MyPlanRecommendation[] = []

  const incomplete = pickIncompleteLesson(input)
  if (incomplete) {
    const title = incomplete.topic?.trim() || `Урок ${incomplete.lessonId}`
    out.push({
      id: 'continue-lesson',
      priority: 1,
      title: `Продолжить: ${title}`,
      subtitle: 'Теория',
      reasonLine: 'Урок начат и сохранён — можно продолжить с того же места.',
      action: { kind: 'resume_lesson', lessonId: incomplete.lessonId },
      buttonLabel: 'Продолжить урок',
      ariaLabel: `Продолжить урок: ${title}`,
    })
  }

  const streak = input.rewards.dailyStreak
  const activeToday = input.rewards.lastActiveDate === input.todayDate
  if (streak > 0 && (!activeToday || !bothModeGoalsCompleted(input))) {
    out.push({
      id: 'streak-today',
      priority: 2,
      title: 'Серия дней и цель дня',
      subtitle: streak > 0 ? `Серия дней: ${streak} дн.` : '',
      reasonLine: activeToday
        ? 'Закройте цели режимов сегодня или сделайте короткую практику.'
        : 'Зайдите сегодня, чтобы не потерять импульс.',
      action: { kind: 'quick_practice', entrySource: 'quick_start' },
      buttonLabel: 'Короткая практика сегодня',
      ariaLabel: 'Запустить короткую практику на сегодня',
    })
  }

  const latestTheory = pickLatestCompletedTheory(input)
  const latestCatalog = latestTheory ? input.catalog.find((t) => t.id === latestTheory.lessonId) : null
  if (latestTheory && latestCatalog?.hasPractice) {
    const topic = latestTheory.topic?.trim() || `Урок ${latestTheory.lessonId}`
    if (!hasPracticeAfterTheory(input, latestTheory.lessonId, latestTheory.lastCompleted)) {
      out.push({
        id: 'practice-after-theory',
        priority: 3,
        title: `Закрепить: ${topic}`,
        subtitle: 'Практика по теме урока',
        reasonLine: 'После завершённой теории полезно сделать короткую практику.',
        action: {
          kind: 'start_practice',
          lessonId: latestTheory.lessonId,
          mode: 'relaxed',
          entrySource: 'after_lesson',
        },
        buttonLabel: 'Запустить практику (~5 мин)',
        ariaLabel: `Запустить практику по уроку ${topic}`,
      })
    }
  }

  const spot = input.weakSpots[0]
  if (spot) {
    const target: 'vocabulary' | 'practice' = spot.id === 'vocab-errors' ? 'vocabulary' : 'practice'
    out.push({
      id: `weak-${spot.id}`,
      priority: 4,
      title: 'Закрепить слабое место',
      subtitle: spot.label,
      reasonLine: 'Система заметила зону, где чаще ошибки — можно закрепить отдельным шагом.',
      action: { kind: 'weak_spot', spotId: spot.id, target },
      buttonLabel: target === 'vocabulary' ? 'Открыть слова' : 'Практика по ошибкам',
      ariaLabel: target === 'vocabulary' ? 'Открыть раздел словаря для закрепления' : 'Запустить практику для закрепления ошибок',
    })
  }

  const next = pickNextLessonInProgram(input)
  if (next) {
    out.push({
      id: `next-lesson-${next.id}`,
      priority: 6,
      title: `Следующий урок: ${next.title}`,
      subtitle: 'По программе',
      reasonLine: 'Логичный следующий шаг в каталоге теории.',
      action: { kind: 'open_lesson', lessonId: next.id },
      buttonLabel: 'Открыть урок',
      ariaLabel: `Открыть урок ${next.title}`,
    })
  }

  const days = input.daysSinceLastActive
  const hasQuickPracticeCard = out.some((r) => r.action.kind === 'quick_practice')
  if (days != null && days > 2 && !hasQuickPracticeCard) {
    out.push({
      id: 'return-after-break',
      priority: 7,
      title: 'С возвращением',
      subtitle: 'Давно не было занятий',
      reasonLine: 'Начните с короткого шага — без давления.',
      action: { kind: 'quick_practice', entrySource: 'quick_start' },
      buttonLabel: 'Лёгкая практика',
      ariaLabel: 'Запустить лёгкую практику после перерыва',
    })
  }

  return out.sort((a, b) => a.priority - b.priority).slice(0, 3)
}
