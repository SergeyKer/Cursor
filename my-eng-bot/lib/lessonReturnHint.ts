import type { LessonMedalTier } from '@/lib/lessonScore'
import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'

export type LessonReturnHintContext = 'menu_reopen' | 'post_lesson_repeat'

const MEDAL_PRESERVED_LINE: Record<LessonMedalTier, Record<FooterCopyAudience, string>> = {
  gold: {
    adult: 'Золотая медаль уже в вашем профиле - она сохраняется.',
    child: 'Золото уже в профиле - оно остаётся!',
  },
  silver: {
    adult: 'Серебряная медаль уже в профиле - она сохраняется.',
    child: 'Серебро уже в профиле - оно остаётся!',
  },
  bronze: {
    adult: 'Бронзовая медаль уже в профиле - она сохраняется.',
    child: 'Бронза уже в профиле - она остаётся!',
  },
}

const XP_RECORD_LINE: Record<FooterCopyAudience, string> = {
  adult:
    'Делайте урок как обычно. XP к уровню засчитается только если итоговый счёт урока (шаги + COMBO) побьёт ваш рекорд - сейчас {bestTotalXp} XP.',
  child: 'Урок как обычно! XP к уровню - только если счёт побьёт рекорд: {bestTotalXp} XP.',
}

const REPEAT_CAP_LINE: Record<LessonMedalTier, Record<FooterCopyAudience, string>> = {
  gold: {
    adult:
      'За этот повтор - максимум серебро. Новое золото - только в сгенерированном варианте урока.',
    child: 'На этом повторе - максимум серебро. Золото - в новом варианте урока!',
  },
  silver: {
    adult: 'За этот повтор - до серебра; золото - в сгенерированном варианте урока.',
    child: 'На повторе - до серебра. Золото - в новом варианте!',
  },
  bronze: {
    adult: 'За этот повтор - до серебра; золото - в сгенерированном варианте урока.',
    child: 'На повторе - до серебра. Золото - в новом варианте!',
  },
}

export function buildLessonReturnHint(params: {
  medal: LessonMedalTier
  audience: FooterCopyAudience
  context: LessonReturnHintContext
  bestTotalXp: number
  cycle1Closed?: boolean
  silverCapThisRun?: boolean
}): string {
  const { medal, audience, context, bestTotalXp } = params
  const lines = [
    MEDAL_PRESERVED_LINE[medal][audience],
    XP_RECORD_LINE[audience].replace('{bestTotalXp}', String(Math.max(0, Math.floor(bestTotalXp)))),
  ]
  if (params.silverCapThisRun && params.cycle1Closed && context === 'menu_reopen') {
    lines.push(REPEAT_CAP_LINE[medal][audience])
  } else if (context === 'post_lesson_repeat') {
    lines.push(REPEAT_CAP_LINE[medal][audience])
  }
  return lines.join('\n')
}
