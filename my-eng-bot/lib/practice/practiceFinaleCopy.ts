import type { PracticeGlobalXpReason } from '@/lib/practice/practiceGlobalXpAward'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { FlowInfoCardVariant } from '@/lib/lessonMedalRevealCopy'
import type { PracticeMode } from '@/types/practice'

export type PracticeFinaleSummaryParams = {
  mode: PracticeMode
  masteryScore: number
  effectiveMasteryScore: number
  correctedCount: number
  plannedLength: number
  sessionXp: number
  tier: PracticeEconomyTier
  globalAmount: number
  globalReason: PracticeGlobalXpReason | 'legacy_flat_30'
  ringCount: number
  ringIncremented: boolean
  coinsAwarded: number
  cupAwarded: number
  pendingPracticeCoins: number
  pendingCup: boolean
  baseBadgeAwarded: boolean
  baseBadgeClaimed: boolean
  forgivenessUsed: boolean
}

export type PracticeFinaleSummary = {
  title: string
  statsLine: string
  starsLine: string
  levelLine: string
  specialLine?: string
  variant: FlowInfoCardVariant
}

export function resolvePracticeFinaleCardVariant(
  params: Pick<
    PracticeFinaleSummaryParams,
    | 'tier'
    | 'globalReason'
    | 'masteryScore'
    | 'plannedLength'
    | 'ringIncremented'
    | 'coinsAwarded'
    | 'cupAwarded'
    | 'baseBadgeAwarded'
    | 'pendingPracticeCoins'
    | 'pendingCup'
  >
): FlowInfoCardVariant {
  if (
    params.cupAwarded > 0 ||
    params.coinsAwarded > 0 ||
    params.ringIncremented ||
    params.baseBadgeAwarded
  ) {
    return 'praise'
  }
  if (params.pendingPracticeCoins > 0 || params.pendingCup) return 'info'
  if (params.tier === 0) return 'info'
  if (params.globalReason === 'mastery_below_50') return 'info'
  if (params.plannedLength > 0 && params.masteryScore * 2 < params.plannedLength) return 'info'
  return 'neutral'
}

function buildLevelLine(params: PracticeFinaleSummaryParams): string {
  if (params.mode === 'reference') return '⭐ К уровню в Эталоне не входит.'
  if (params.globalAmount > 0) return `⭐ +${params.globalAmount} к уровню.`
  if (params.tier === 0) return '⭐ Без медали урока к уровню не идёт.'
  if (params.globalReason === 'daily_cap_reached') {
    return '⭐ На сегодня XP из практики уже набран.'
  }
  if (params.globalReason === 'mastery_below_50') {
    return '⭐ К уровню нужно больше половины с первой попытки.'
  }
  if (
    params.globalReason === 'same_fingerprint_repeat' ||
    params.globalReason === 'repeat_tier'
  ) {
    return '⭐ Этот вариант уже был — к уровню мало.'
  }
  return '⭐ К уровню без изменений.'
}

function buildSpecialLine(params: PracticeFinaleSummaryParams): string | undefined {
  if (params.mode === 'reference') return '⚡ Упражнение проверено.'
  if (params.mode === 'relaxed') return '🌱 Разминка — зачёта нет.'
  if (params.mode === 'balanced') {
    if (params.baseBadgeAwarded) return '📌 База получена!'
    if (params.baseBadgeClaimed) return '📌 База уже была.'
    return undefined
  }

  if (params.cupAwarded > 0) return '🏆 Тема сдана!'
  if (params.coinsAwarded > 0) {
    const milestone = params.ringCount >= 5 ? '5-й' : '3-й'
    return `🪙 +${params.coinsAwarded} за ${milestone} зачёт.`
  }
  if (params.ringIncremented) return `📝 Зачёт! ${Math.min(5, params.ringCount)}/5.`
  if (params.pendingPracticeCoins > 0 || params.pendingCup) {
    return '🪙 Монеты и кубок ждут золотую медаль урока.'
  }
  if (params.masteryScore === 10 && params.plannedLength === 12) {
    return '📝 Почти: 10 из 12 — ещё одна с первой попытки!'
  }
  if (params.forgivenessUsed) return '💡 1 ошибку не учли за монету.'
  return undefined
}

export function buildPracticeFinaleSummary(
  params: PracticeFinaleSummaryParams
): PracticeFinaleSummary {
  const corrected =
    params.correctedCount > 0 ? ` · поправили ${params.correctedCount}` : ''
  return {
    title: params.mode === 'reference' ? 'Эталон пройден' : 'Практика завершена',
    statsLine: `С первой попытки ${params.masteryScore}/${params.plannedLength}${corrected}`,
    starsLine: `⭐ ${params.sessionXp} звёзд за проход.`,
    levelLine: buildLevelLine(params),
    specialLine: buildSpecialLine(params),
    variant: resolvePracticeFinaleCardVariant(params),
  }
}
