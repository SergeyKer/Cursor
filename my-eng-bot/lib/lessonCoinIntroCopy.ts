import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import type { Bubble } from '@/types/lesson'

export type LessonCoinIntroContext = {
  audience: FooterCopyAudience
  lessonCoinClaimed: boolean
  isGeneratedVariantRun: boolean
  profileMedal: LessonMedalTierOrNull
  runMedalCapSilver?: boolean
}

export function buildLessonCoinIntroBubble(context: LessonCoinIntroContext): Bubble | null {
  if (context.isGeneratedVariantRun) return null
  if (context.lessonCoinClaimed) {
    return {
      type: 'info',
      content:
        context.audience === 'child'
          ? '🪙 Монета за тему уже есть. Медаль можно улучшить.'
          : '🪙 Монета за эту тему уже получена. Медаль в профиле можно улучшить.',
    }
  }

  return {
    type: 'info',
    content:
      context.audience === 'child'
        ? '🪙 +1 монета за золото (90%+) на первом проходе.\n💡 Ошибку на шагах 4–7 — снять за 1 🪙 (1 раз за проход).'
        : '🪙 +1 монета за золото (90%+) на первом проходе темы.\n💡 Ошибку на шагах 4–7 — снять за 1 🪙 (1 раз за проход).',
  }
}
