import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import { coreXpToGold, type LessonMedalTierOrNull } from '@/lib/lessonScore'

export const LESSON_GOLD_PERCENT_THRESHOLD = 90

const MEDAL_RANK: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
}

const RUN_MEDAL_LABEL: Record<NonNullable<LessonMedalTierOrNull>, Record<FooterCopyAudience, string>> = {
  gold: { child: 'Золото за этот проход.', adult: 'Золотая медаль за этот проход.' },
  silver: { child: 'Серебро за этот проход.', adult: 'Серебряная медаль за этот проход.' },
  bronze: { child: 'Бронза за этот проход.', adult: 'Бронзовая медаль за этот проход.' },
}

const PROFILE_MEDAL_LINE: Record<NonNullable<LessonMedalTierOrNull>, Record<FooterCopyAudience, string>> = {
  gold: {
    child: 'В профиле: золотая медаль сохраняется.',
    adult: 'В профиле: золотая медаль сохраняется.',
  },
  silver: {
    child: 'В профиле: серебряная медаль сохраняется.',
    adult: 'В профиле: серебряная медаль сохраняется.',
  },
  bronze: {
    child: 'В профиле: бронзовая медаль сохраняется.',
    adult: 'В профиле: бронзовая медаль сохраняется.',
  },
}

export function gapToGoldPercent(corePercent: number): number {
  return Math.max(0, LESSON_GOLD_PERCENT_THRESHOLD - corePercent)
}

export function isRunAtGoldLevel(corePercent: number): boolean {
  return corePercent >= LESSON_GOLD_PERCENT_THRESHOLD
}

export function hasGoldUnlocked(
  profileMedal: LessonMedalTierOrNull,
  runMedal: LessonMedalTierOrNull
): boolean {
  return profileMedal === 'gold' || runMedal === 'gold'
}

export function isProfileMedalHigher(
  profileMedal: LessonMedalTierOrNull,
  runMedal: LessonMedalTierOrNull
): boolean {
  if (!profileMedal || !runMedal) return false
  return (MEDAL_RANK[profileMedal] ?? 0) > (MEDAL_RANK[runMedal] ?? 0)
}

export function resolveXpStatsPraise(
  corePercent: number,
  audience: FooterCopyAudience
): string | null {
  if (corePercent >= 90) {
    return audience === 'child' ? 'Супер!' : 'Отлично.'
  }
  if (corePercent >= 50) {
    return audience === 'child' ? 'Хорошо!' : 'Хорошо.'
  }
  if (corePercent >= 25) {
    return audience === 'child' ? 'Неплохо!' : 'Неплохо.'
  }
  return null
}

export function formatLessonStatsLine(params: {
  coreXp: number
  maxCoreXp: number
  corePercent: number
  comboXp: number
  audience: FooterCopyAudience
}): string {
  const { coreXp, corePercent, comboXp, maxCoreXp, audience } = params
  const xpLabel = `${coreXp} XP`
  const praise = coreXp > 0 ? resolveXpStatsPraise(corePercent, audience) : null
  const head = praise ? `${praise} ${xpLabel}` : xpLabel
  const base = isRunAtGoldLevel(corePercent)
    ? `${head} · максимум`
    : (() => {
        const toGoldXp = coreXpToGold(coreXp, maxCoreXp)
        return `${head} · до золота ещё ${toGoldXp} XP`
      })()

  if (comboXp <= 0) return base
  if (audience === 'child') {
    return `${base} · +${comboXp} за серию`
  }
  return `${base} · +${comboXp} combo`
}

export function formatLessonVerdictLine(params: {
  corePercent: number
  previousCorePercent: number | null
  profileMedal: LessonMedalTierOrNull
  runMedal: LessonMedalTierOrNull
  audience: FooterCopyAudience
}): string {
  const { corePercent, previousCorePercent, runMedal, audience } = params

  if (previousCorePercent == null) {
    if (runMedal) {
      return RUN_MEDAL_LABEL[runMedal][audience]
    }
    return audience === 'child' ? 'Ты справился!' : 'Урок сдан.'
  }

  if (corePercent < previousCorePercent) {
    return audience === 'child' ? 'Немного ниже прошлого.' : 'Ниже прошлого прохода.'
  }

  if (corePercent > previousCorePercent) {
    return audience === 'child' ? 'Лучше, чем в прошлый раз!' : 'Лучше прошлого прохода.'
  }

  return audience === 'child' ? 'Как в прошлый раз.' : 'На том же уровне.'
}

export function formatLessonProfileLine(params: {
  profileMedal: LessonMedalTierOrNull
  runMedal: LessonMedalTierOrNull
  audience: FooterCopyAudience
}): string | null {
  const { profileMedal, runMedal, audience } = params
  if (!profileMedal || !isProfileMedalHigher(profileMedal, runMedal)) return null
  return PROFILE_MEDAL_LINE[profileMedal][audience]
}

export function formatLessonFirstTryLine(params: {
  firstTryCount: number
  totalScoredUnits: number
  audience: FooterCopyAudience
}): string | null {
  const { firstTryCount, totalScoredUnits, audience } = params
  if (firstTryCount <= 0 || totalScoredUnits <= 0) return null

  const n = firstTryCount
  const total = totalScoredUnits

  if (n === total) {
    return audience === 'child'
      ? 'Все ответы с первого раза - супер!'
      : 'Все ответы с первого раза - отлично!'
  }

  const ratio = n / total
  if (ratio >= 0.75) {
    return audience === 'child'
      ? `${n} из ${total} с первого раза - отлично!`
      : `${n} из ${total} с первого раза - отлично!`
  }
  if (ratio >= 0.5) {
    return audience === 'child'
      ? `${n} из ${total} с первого раза - неплохо!`
      : `${n} из ${total} с первого раза - неплохо!`
  }

  return audience === 'child'
    ? `${n} из ${total} с первого раза.`
    : `${n} из ${total} с первого раза.`
}

export function formatLessonFinaleGoalLine(params: {
  profileMedal: LessonMedalTierOrNull
  runMedal: LessonMedalTierOrNull
  audience: FooterCopyAudience
}): string {
  const { profileMedal, runMedal, audience } = params

  if (hasGoldUnlocked(profileMedal, runMedal)) {
    return audience === 'child'
      ? 'Жми «Практика». Раздел скоро - путь к кубку.'
      : 'Жми «Практика». Раздел скоро - следующий шаг к кубку.'
  }

  return audience === 'child'
    ? 'Хочешь медаль выше - жми «Новый вариант». Практика скоро.'
    : 'Для лучшей медали - новый вариант. Практика появится скоро.'
}

export function formatMedalFooterGapTitle(params: {
  currentLabel: string
  gapToGoldPercent: number
  toGoldXp: number
  almost: boolean
  repeatNote: string
}): string {
  const { currentLabel, gapToGoldPercent, toGoldXp, almost, repeatNote } = params
  if (almost) {
    return `${currentLabel}. До золота: ещё ~${gapToGoldPercent}%.${repeatNote}`
  }
  return `${currentLabel}. До золота: ещё ${gapToGoldPercent}% (${toGoldXp} очков).${repeatNote}`
}

export function formatMedalFooterMaxTitle(currentLabel: string, repeatNote: string): string {
  return `${currentLabel}. Лучший результат этого прохода.${repeatNote}`
}
