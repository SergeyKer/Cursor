import {
  formatIntroBlockBullets,
  resolveHowBlock,
  resolveTheoryBlock,
} from '@/lib/lessonIntroBlocks'
import { LESSON_READING_CARD_LABELS } from '@/lib/uiCopy/lessonReadingCards'
import type { Bubble, LessonIntro } from '@/types/lesson'

function formatList(items: string[]): string {
  return items.map((item) => `• ${item}`).join('\n')
}

function formatExamples(examples: LessonIntro['quick']['examples']): string {
  return examples.map((example) => `✓ ${example.en} → ${example.ru} (${example.note})`).join('\n')
}

export type BuildLessonReadingBubblesOptions = {
  /** Title line under «Тема урока» (usually intro.topic). */
  title?: string
}

/**
 * Canonical 6 reading cards for lesson intro and reference sheet.
 * Each bubble is `Label\nbody` for detached reading header/body split.
 */
export function buildLessonReadingBubbles(
  intro: LessonIntro,
  options: BuildLessonReadingBubblesOptions = {}
): Bubble[] {
  const title = (options.title ?? intro.topic).trim()
  const theoryBlock = resolveTheoryBlock(intro)
  const howBlock = resolveHowBlock(intro)
  const bubbles: Bubble[] = []

  const essenceBody = [title, intro.quick.takeaway.trim()].filter(Boolean).join('\n')
  if (essenceBody) {
    bubbles.push({
      type: 'info',
      content: `${LESSON_READING_CARD_LABELS.essence}\n${essenceBody}`,
    })
  }

  const ruleBullets = theoryBlock ? formatIntroBlockBullets(theoryBlock) : formatList(intro.quick.why)
  if (ruleBullets.trim()) {
    bubbles.push({
      type: 'positive',
      content: `${LESSON_READING_CARD_LABELS.rule}\n${ruleBullets}`,
    })
  }

  const templateBullets = howBlock ? formatIntroBlockBullets(howBlock) : formatList(intro.quick.how)
  if (templateBullets.trim()) {
    bubbles.push({
      type: 'info',
      content: `${LESSON_READING_CARD_LABELS.templates}\n${templateBullets}`,
    })
  }

  if (intro.quick.examples.length > 0) {
    bubbles.push({
      type: 'task',
      content: `${LESSON_READING_CARD_LABELS.examples}\n${formatExamples(intro.quick.examples)}`,
    })
  }

  const mistakes = intro.deepDive?.commonMistakes?.map((item) => item.trim()).filter(Boolean) ?? []
  if (mistakes.length > 0) {
    bubbles.push({
      type: 'positive',
      content: `${LESSON_READING_CARD_LABELS.mistakes}\n${formatList(mistakes)}`,
    })
  }

  const selfCheck = intro.deepDive?.selfCheckRule?.trim() ?? ''
  if (selfCheck) {
    bubbles.push({
      type: 'task',
      content: `${LESSON_READING_CARD_LABELS.selfCheck}\n${selfCheck}`,
    })
  }

  return bubbles
}
