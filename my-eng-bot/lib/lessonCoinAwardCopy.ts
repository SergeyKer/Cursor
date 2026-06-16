import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import type { LessonCoinAward, LessonCoinAwardReason } from '@/lib/coinAwards'

export function formatLessonCoinAwardLine(params: {
  coinAward: LessonCoinAward
  audience: FooterCopyAudience
}): string | null {
  const { coinAward, audience } = params
  return formatLessonCoinAwardReasonLine(coinAward.reason, audience)
}

export function formatLessonCoinAwardReasonLine(
  reason: LessonCoinAwardReason,
  audience: FooterCopyAudience
): string | null {
  if (audience === 'child') {
    switch (reason) {
      case 'lesson_gold':
        return '+1 🪙!'
      case 'lesson_gold_already_claimed':
        return 'Монета уже была.'
      case 'lesson_not_gold':
        return 'Нужно золото для монеты.'
      default:
        return null
    }
  }

  switch (reason) {
    case 'lesson_gold':
      return '+1 🪙 за золотую медаль.'
    case 'lesson_gold_already_claimed':
      return 'Монета за эту тему уже получена.'
    case 'lesson_not_gold':
      return 'До монеты: золото (90%+ по уроку).'
    default:
      return null
  }
}
