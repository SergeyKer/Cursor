import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import type { LessonReturnHintContext } from '@/lib/lessonReturnHint'

export type LessonBriefingKind = 'medal_repeat' | 'cycle1' | 'first_run'

export type LessonRepeatBriefingThesisParams = {
  audience: FooterCopyAudience
  briefingKind: LessonBriefingKind
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

function buildGoldGoalLine(audience: FooterCopyAudience): string {
  return audience === 'child'
    ? '🥇 Золото - если отличный результат!'
    : '🥇 Золото - при отличном результате.'
}

function buildGoldInGeneratedVariantLine(audience: FooterCopyAudience): string {
  return audience === 'child'
    ? '🥇 В новом варианте золото снова в цели!'
    : '🥇 В новом варианте золото снова в цели.'
}

function buildGoldInNewVariantCtaLine(): string {
  return '🥇 Нужно золото? Жми Новый вариант.'
}

export function buildLessonRepeatBriefingThesisLines(
  params: LessonRepeatBriefingThesisParams
): string[] {
  const lines: string[] = []

  if (params.briefingKind === 'first_run') {
    lines.push(buildGoldGoalLine(params.audience))
  } else if (params.isGeneratedVariantRun) {
    lines.push(buildGoldInGeneratedVariantLine(params.audience))
  } else if (params.context === 'menu_reopen' && params.silverCapThisRun) {
    lines.push('🥈 Этот проход - максимум серебро.')
    lines.push(buildGoldInNewVariantCtaLine())
  } else {
    lines.push(buildGoldInNewVariantCtaLine())
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
