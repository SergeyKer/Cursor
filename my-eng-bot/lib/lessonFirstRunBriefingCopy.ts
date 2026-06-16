import type { FlowInfoCardVariant } from '@/lib/lessonMedalRevealCopy'
import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import type { LessonCoinIntroContext } from '@/lib/lessonCoinIntroCopy'
import type { LessonReturnBriefingCopy } from '@/lib/lessonReturnBriefingCopy'

function buildCoinLine(
  audience: FooterCopyAudience,
  coinIntroContext?: LessonCoinIntroContext | null
): string {
  if (coinIntroContext?.isGeneratedVariantRun) {
    return audience === 'child'
      ? '🪙 В новом варианте снова можно получить золото и монету.'
      : '🪙 В сгенерированном варианте снова доступны золото и монета за тему.'
  }
  if (coinIntroContext?.lessonCoinClaimed) {
    return audience === 'child'
      ? '🪙 Монета за тему уже есть — можно улучшить медаль.'
      : '🪙 Монета за эту тему уже получена — можно улучшить медаль.'
  }
  return audience === 'child'
    ? '🪙 +1 монета за золото (90%+) на первом проходе темы.'
    : '🪙 +1 монета за золото (90%+) на первом проходе этой темы.'
}

function buildForgivenessLine(audience: FooterCopyAudience): string {
  return audience === 'child'
    ? '💡 На шагах 4–7 одну ошибку можно снять за 1 🪙 (1 раз за проход).'
    : '💡 На шагах 4–7 одну ошибку можно снять за 1 🪙 (один раз за проход).'
}

export function buildLessonFirstRunBriefingCopy(params: {
  audience: FooterCopyAudience
  coinIntroContext?: LessonCoinIntroContext | null
}): LessonReturnBriefingCopy {
  const { audience, coinIntroContext } = params
  const coreLines =
    audience === 'child'
      ? [
          'Семь коротких шагов: читай подсказку и отвечай текстом или кнопкой.',
          '⭐ Очки и COMBO — за верные ответы подряд.',
          '🏅 В конце — медаль по результату прохода.',
        ]
      : [
          'Семь коротких шагов: подсказка в задании, ответ текстом или выбором варианта.',
          '⭐ Очки урока и COMBO — за верные ответы подряд.',
          '🏅 В финале — медаль по результату этого прохода.',
        ]

  return {
    variant: 'info' satisfies FlowInfoCardVariant,
    title: audience === 'child' ? 'Как пройти урок' : 'Как устроен урок',
    statsLine: '',
    message: [...coreLines, buildCoinLine(audience, coinIntroContext)].join('\n'),
    secondaryMessage: buildForgivenessLine(audience),
  }
}
