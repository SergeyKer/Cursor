import type { AccentAudience, AccentLesson, AccentMinimalPair, AccentSessionMode, AccentSessionPlan } from '@/types/accent'

export const ACCENT_SESSION_PLANS: Record<AccentSessionMode, AccentSessionPlan> = {
  mini: {
    mode: 'mini',
    label: 'Мини',
    timeLabel: '2-3 мин',
    wordCount: 8,
    pairCount: 4,
    progressiveLineCount: 3,
    includeProblemLoop: false,
  },
  quick: {
    mode: 'quick',
    label: 'Быстро',
    timeLabel: '3-4 мин',
    wordCount: 10,
    pairCount: 6,
    progressiveLineCount: 3,
    includeProblemLoop: false,
  },
  standard: {
    mode: 'standard',
    label: 'Стандарт',
    timeLabel: '5-7 мин',
    wordCount: 20,
    pairCount: 10,
    progressiveLineCount: 5,
    includeProblemLoop: false,
  },
  expert: {
    mode: 'expert',
    label: 'Эксперт',
    timeLabel: '8-12 мин',
    wordCount: 20,
    pairCount: 10,
    progressiveLineCount: 5,
    includeProblemLoop: true,
  },
  problem_only: {
    mode: 'problem_only',
    label: 'Только сложное',
    timeLabel: '1-2 мин',
    wordCount: 6,
    pairCount: 3,
    progressiveLineCount: 2,
    includeProblemLoop: true,
  },
}

export function getDefaultAccentMode(audience: AccentAudience): AccentSessionMode {
  return audience === 'child' ? 'mini' : 'quick'
}

function takeWithCycle<T>(items: T[], count: number): T[] {
  if (count <= 0 || items.length === 0) return []
  const result: T[] = []
  for (let i = 0; i < count; i += 1) {
    result.push(items[i % items.length])
  }
  return result
}

export function buildAccentLessonBlocks(lesson: AccentLesson, mode: AccentSessionMode) {
  const plan = ACCENT_SESSION_PLANS[mode]
  return {
    plan,
    words: takeWithCycle(lesson.words, plan.wordCount),
    pairs: takeWithCycle<AccentMinimalPair>(lesson.minimalPairs, plan.pairCount),
    progressiveLines: lesson.progressiveLines.slice(0, plan.progressiveLineCount),
  }
}
