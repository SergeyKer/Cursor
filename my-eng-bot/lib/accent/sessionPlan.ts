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
  return takeWithOffset(items, count, 0)
}

function takeWithOffset<T>(items: T[], count: number, startOffset: number): T[] {
  if (count <= 0 || items.length === 0) return []
  const result: T[] = []
  const normalizedOffset = ((startOffset % items.length) + items.length) % items.length
  for (let i = 0; i < count; i += 1) {
    result.push(items[(normalizedOffset + i) % items.length])
  }
  return result
}

function hashSeed(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function buildOffset(lessonId: string, blockType: 'words' | 'pairs' | 'progressive', variantSeed: number, length: number): number {
  if (variantSeed <= 0 || length <= 0) return 0
  return hashSeed(`${lessonId}:${blockType}:${variantSeed}`) % length
}

export function buildAccentLessonBlocks(
  lesson: AccentLesson,
  mode: AccentSessionMode,
  options?: { variantSeed?: number }
) {
  const plan = ACCENT_SESSION_PLANS[mode]
  const variantSeed = options?.variantSeed ?? 0
  const wordsOffset = buildOffset(lesson.id, 'words', variantSeed, lesson.words.length)
  const pairsOffset = buildOffset(lesson.id, 'pairs', variantSeed, lesson.minimalPairs.length)
  const progressiveOffset = buildOffset(lesson.id, 'progressive', variantSeed, lesson.progressiveLines.length)
  return {
    plan,
    words: takeWithOffset(lesson.words, plan.wordCount, wordsOffset),
    pairs: takeWithOffset<AccentMinimalPair>(lesson.minimalPairs, plan.pairCount, pairsOffset),
    progressiveLines: takeWithOffset(lesson.progressiveLines, plan.progressiveLineCount, progressiveOffset),
  }
}
