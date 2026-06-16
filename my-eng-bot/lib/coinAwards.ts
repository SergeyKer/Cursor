import type { LessonMedalTierOrNull } from '@/lib/lessonScore'

export const COIN_LESSON_GOLD_AWARD = 1

export type LessonCoinAwardReason =
  | 'lesson_gold'
  | 'lesson_gold_already_claimed'
  | 'lesson_not_gold'

export type LessonCoinAward = {
  amount: number
  reason: LessonCoinAwardReason
}

export type ResolveLessonCoinAwardParams = {
  lessonId: string
  coreMedal: LessonMedalTierOrNull
  lessonGoldClaimed: Record<string, true>
}

export function resolveLessonCoinAward(params: ResolveLessonCoinAwardParams): LessonCoinAward {
  const lessonId = params.lessonId.trim()
  if (!lessonId) {
    return { amount: 0, reason: 'lesson_not_gold' }
  }

  if (params.coreMedal !== 'gold') {
    return { amount: 0, reason: 'lesson_not_gold' }
  }

  if (params.lessonGoldClaimed[lessonId]) {
    return { amount: 0, reason: 'lesson_gold_already_claimed' }
  }

  return { amount: COIN_LESSON_GOLD_AWARD, reason: 'lesson_gold' }
}
