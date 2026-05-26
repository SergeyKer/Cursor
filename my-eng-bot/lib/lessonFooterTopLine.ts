import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'

import { formatRewardTopLine } from '@/lib/footerTopLinePhrases'

export type LessonFooterMoment = 'checking' | 'error' | 'success_reward' | 'neutral'

export type LessonFooterTopLineInput = {
  audience: FooterCopyAudience
  globalDelta: number
  bestTotalXp: number
  combo: number
  comboMilestoneBlocked?: boolean
  isRepeatWithSavedMedal?: boolean
  voiceFallback: string | null
  moment?: LessonFooterMoment
}

export function resolveLessonFooterTopLine(input: LessonFooterTopLineInput): string | null {
  const globalDelta = Math.max(0, Math.floor(input.globalDelta))
  const bestTotalXp = Math.max(0, Math.floor(input.bestTotalXp))
  const combo = Math.max(0, Math.floor(input.combo))
  const moment = input.moment ?? 'neutral'

  if (moment === 'checking' || moment === 'error') {
    const voice = input.voiceFallback?.trim()
    if (voice) return voice
    return null
  }

  if (moment === 'success_reward' && globalDelta > 0) {
    return formatRewardTopLine({
      reason: 'lesson_xp_awarded',
      amount: globalDelta,
      audience: input.audience,
    })
  }

  if (input.comboMilestoneBlocked && combo >= 3) {
    return `COMBO ×${combo} — бонус к уровню позже.`
  }

  if (input.isRepeatWithSavedMedal) {
    return input.audience === 'child'
      ? 'Счёт идёт! К уровню — при новом рекорде.'
      : 'Счёт идёт. К уровню — при новом рекорде.'
  }

  const voice = input.voiceFallback?.trim()
  if (voice) return voice

  return input.audience === 'child'
    ? 'Верно! К уровню без изменений.'
    : 'Верно. К уровню без изменений.'
}
