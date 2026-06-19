import type { LessonIntro, LessonIntroBlock } from '@/types/lesson'

export const LESSON_INTRO_THEORY_LABEL = 'Правило'
export const LESSON_INTRO_HOW_LABEL = 'Шаблоны'

function normalizeBullets(items: string[] | undefined): string[] {
  if (!items?.length) return []
  return items.map((item) => item.trim()).filter(Boolean)
}

function buildBlock(label: string, bullets: string[]): LessonIntroBlock | null {
  const normalized = normalizeBullets(bullets)
  if (normalized.length === 0) return null
  return { label, bullets: normalized }
}

export function resolveTheoryBlock(intro: LessonIntro | null | undefined): LessonIntroBlock | null {
  if (!intro) return null
  const override = intro.grammarRule
  if (override?.bullets?.length) {
    return buildBlock(override.label?.trim() || LESSON_INTRO_THEORY_LABEL, override.bullets)
  }
  return buildBlock(LESSON_INTRO_THEORY_LABEL, intro.quick.why)
}

export function resolveHowBlock(intro: LessonIntro | null | undefined): LessonIntroBlock | null {
  if (!intro) return null
  const override = intro.howGuide
  if (override?.bullets?.length) {
    return buildBlock(override.label?.trim() || LESSON_INTRO_HOW_LABEL, override.bullets)
  }
  return buildBlock(LESSON_INTRO_HOW_LABEL, intro.quick.how)
}

export function resolveLessonIntroBlocks(intro: LessonIntro | null | undefined): {
  theory: LessonIntroBlock | null
  how: LessonIntroBlock | null
} {
  return {
    theory: resolveTheoryBlock(intro),
    how: resolveHowBlock(intro),
  }
}

export function formatIntroBlockBullets(block: LessonIntroBlock): string {
  return block.bullets.map((item) => `• ${item}`).join('\n')
}

export function resolveIntroChipLabel(
  panel: 'theory' | 'how',
  isOpen: boolean
): string {
  if (panel === 'theory') {
    return isOpen ? 'Скрыть правило' : LESSON_INTRO_THEORY_LABEL
  }
  return isOpen ? 'Скрыть шаблоны' : LESSON_INTRO_HOW_LABEL
}
