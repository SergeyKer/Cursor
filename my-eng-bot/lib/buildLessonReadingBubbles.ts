import {
  formatIntroBlockBullets,
  resolveHowBlock,
  resolveTheoryBlock,
} from '@/lib/lessonIntroBlocks'
import { formatCommonMistakesList } from '@/lib/lessonExtraTips'
import {
  labelsForReadingMode,
  orderForReadingMode,
  type LessonReadingBubbleMode,
  type LessonReadingCardKey,
} from '@/lib/uiCopy/lessonReadingCards'
import type { Bubble, LessonIntro } from '@/types/lesson'

function formatList(items: string[]): string {
  return items.map((item) => `• ${item}`).join('\n')
}

function formatExamples(examples: LessonIntro['quick']['examples']): string {
  return examples.map((example) => `✓ ${example.en} → ${example.ru} (${example.note})`).join('\n')
}

export type BuildLessonReadingBubblesOptions = {
  /** Title line under essence card (usually intro.topic). */
  title?: string
  /** lesson = full set; lookup/cheatsheet = subset + reference labels. Default lesson. */
  mode?: LessonReadingBubbleMode
}

/**
 * Canonical reading cards for lesson intro and reference sheet.
 * Each bubble is `Label\nbody` for detached reading header/body split.
 * Empty optional cards (contrast / mistakes / selfCheck) are omitted.
 */
export function buildLessonReadingBubbles(
  intro: LessonIntro,
  options: BuildLessonReadingBubblesOptions = {}
): Bubble[] {
  const mode = options.mode ?? 'lesson'
  const labels = labelsForReadingMode(mode)
  const order = orderForReadingMode(mode)
  const title = (options.title ?? intro.topic).trim()
  const theoryBlock = resolveTheoryBlock(intro)
  const howBlock = resolveHowBlock(intro)

  const essenceBody = [title, intro.quick.takeaway.trim()].filter(Boolean).join('\n')
  const ruleBullets = theoryBlock ? formatIntroBlockBullets(theoryBlock) : formatList(intro.quick.why)
  const templateBullets = howBlock ? formatIntroBlockBullets(howBlock) : formatList(intro.quick.how)
  const examplesBody =
    intro.quick.examples.length > 0 ? formatExamples(intro.quick.examples) : ''
  const contrast = (intro.deepDive?.contrastNotes ?? []).map((item) => item.trim()).filter(Boolean)
  const mistakes = (intro.deepDive?.commonMistakes ?? []).map((item) => item.trim()).filter(Boolean)
  const selfCheck = intro.deepDive?.selfCheckRule?.trim() ?? ''

  const bodies: Partial<Record<LessonReadingCardKey, string>> = {
    essence: essenceBody,
    rule: ruleBullets.trim(),
    templates: templateBullets.trim(),
    examples: examplesBody.trim(),
    contrast: contrast.length > 0 ? formatList(contrast) : '',
    mistakes: mistakes.length > 0 ? formatCommonMistakesList(mistakes) : '',
    selfCheck,
  }

  const bubbleType: Record<LessonReadingCardKey, Bubble['type']> = {
    essence: 'info',
    rule: 'positive',
    templates: 'info',
    examples: 'task',
    contrast: 'info',
    mistakes: 'positive',
    selfCheck: 'task',
  }

  const bubbles: Bubble[] = []
  for (const key of order) {
    const body = bodies[key]?.trim() ?? ''
    if (!body) continue
    bubbles.push({
      type: bubbleType[key],
      content: `${labels[key]}\n${body}`,
    })
  }
  return bubbles
}
