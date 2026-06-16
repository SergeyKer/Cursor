import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import type { LessonReturnHintContext } from '@/lib/lessonReturnHint'

export type LessonRepeatBriefingThesisParams = {
  audience: FooterCopyAudience
  lessonCoinClaimed: boolean
  isGeneratedVariantRun: boolean
  silverCapThisRun: boolean
  context: LessonReturnHintContext
  bestTotalXp: number
}

function formatRecordXp(bestTotalXp: number): string {
  return String(Math.max(0, Math.floor(bestTotalXp)))
}

function buildCoinLine(params: LessonRepeatBriefingThesisParams): string {
  if (params.lessonCoinClaimed) {
    return params.audience === 'child'
      ? '🪙 Монета за тему уже есть.'
      : '🪙 Монета за эту тему уже получена.'
  }

  return '🪙 За золото награда +1 монета.'
}

function buildComboLine(): string {
  return '🔥 Комбо 3/5/7 правильных ответов подряд прибавит очков опыта XP.'
}

function buildXpLine(params: LessonRepeatBriefingThesisParams): string {
  const recordXp = formatRecordXp(params.bestTotalXp)
  return `⭐ За новый рекорд правильных ответов прибавим XP, сейчас рекорд ${recordXp} XP.`
}

function buildForgivenessLine(): string {
  return '💡 1 ошибку за урок можно пропустить за монету.'
}

function buildGoldInGeneratedLine(): string {
  return '🥇 Нужно золото? Жми Новый вариант.'
}

export function buildLessonRepeatBriefingThesisLines(
  params: LessonRepeatBriefingThesisParams
): string[] {
  const lines: string[] = []

  if (params.isGeneratedVariantRun) {
    lines.push(
      params.audience === 'child'
        ? '🥇 На этом проходе - можно золото.'
        : '🥇 Этот проход - можно золото.'
    )
  } else if (params.context === 'menu_reopen' && params.silverCapThisRun) {
    lines.push('🥈 Этот проход - максимум серебро.')
    lines.push(buildGoldInGeneratedLine())
  } else {
    lines.push(buildGoldInGeneratedLine())
  }

  lines.push(buildCoinLine(params))
  lines.push(buildComboLine())
  lines.push(buildXpLine(params))
  lines.push(buildForgivenessLine())

  return lines
}

export function shouldOfferGenerateVariantOnReturnBriefing(
  params: Pick<
    LessonRepeatBriefingThesisParams,
    'context' | 'silverCapThisRun' | 'isGeneratedVariantRun'
  >
): boolean {
  return (
    params.context === 'menu_reopen' &&
    params.silverCapThisRun &&
    !params.isGeneratedVariantRun
  )
}
