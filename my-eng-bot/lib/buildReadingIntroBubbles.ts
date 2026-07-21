import { getMenuTopicCopyByIntroTopic } from '@/lib/lessonCatalog'
import {
  formatIntroBlockBullets,
  resolveHowBlock,
  resolveTheoryBlock,
} from '@/lib/lessonIntroBlocks'
import type { Audience } from '@/lib/types'
import type { Bubble, LessonIntro } from '@/types/lesson'

function formatList(items: string[]): string {
  return items.map((item) => `• ${item}`).join('\n')
}

function formatExamples(examples: LessonIntro['quick']['examples']): string {
  return examples.map((example) => `✓ ${example.en} → ${example.ru} (${example.note})`).join('\n')
}

function formatPracticeMission(intro: LessonIntro): string {
  const goal = intro.learningPlan?.firstPracticeGoal ?? intro.quick.takeaway
  const example = intro.details?.examples?.[0] ?? intro.quick.examples[0]
  const trap = intro.deepDive?.commonMistakes[0]
  const lines = [`🎯 Миссия: ${goal}`]

  if (example) {
    lines.push(`🧭 Ориентир: ${example.en} (${example.note})`)
  }

  if (trap) {
    lines.push(`⚠️ Ловушка: ${trap}`)
  }

  return lines.join('\n')
}

function buildQuickBubbles(intro: LessonIntro): [Bubble, Bubble, Bubble] {
  const theoryBlock = resolveTheoryBlock(intro)
  const howBlock = resolveHowBlock(intro)
  return [
    {
      type: 'positive',
      content: `🟡 ТЕОРИЯ\n${theoryBlock ? formatIntroBlockBullets(theoryBlock) : formatList(intro.quick.why)}`,
    },
    {
      type: 'info',
      content: `⚪ ШАБЛОНЫ\n${howBlock ? formatIntroBlockBullets(howBlock) : formatList(intro.quick.how)}`,
    },
    {
      type: 'task',
      content: `🟢 ПРИМЕРЫ И ВЫВОД\n${formatExamples(intro.quick.examples)}\n\n${intro.quick.takeaway}`,
    },
  ]
}

function buildMenuEntryBubble(intro: LessonIntro, audience: Audience): Bubble {
  const copy = getMenuTopicCopyByIntroTopic(intro.topic, audience, {
    long: intro.quick.takeaway,
  })
  const detailsLine = copy.short ? `• ${copy.short}: ${copy.long}` : `• ${copy.long}`
  return {
    type: 'info',
    content: `📘 ТЕМА УРОКА - ${copy.title}\n${detailsLine}`,
  }
}

function buildDetailsBubbles(intro: LessonIntro): Bubble[] {
  if (!intro.details) return []
  return [
    {
      type: 'positive',
      content: `🔎 ПОЧЕМУ ТАК\n${formatList(intro.details.points)}`,
    },
    {
      type: 'info',
      content: intro.details.examples?.length
        ? `⚪ ЕЩЕ ПРИМЕРЫ\n${formatExamples(intro.details.examples)}`
        : '⚪ ЕЩЕ ПРИМЕРЫ\nПосмотрите на правило в коротких фразах, не в длинной таблице.',
    },
    {
      type: 'task',
      content: `🟢 МИНИ-МИССИЯ\n${formatPracticeMission(intro)}`,
    },
  ]
}

function buildDeepDiveBubbles(intro: LessonIntro): Bubble[] {
  if (!intro.deepDive) return []
  return [
    {
      type: 'positive',
      content: `🔬 ЧАСТЫЕ ОШИБКИ\n${formatList(intro.deepDive.commonMistakes)}`,
    },
    {
      type: 'info',
      content: intro.deepDive.contrastNotes?.length
        ? `⚪ НЮАНСЫ\n${formatList(intro.deepDive.contrastNotes)}`
        : '⚪ НЮАНСЫ\nСравнивайте похожие формы по смыслу, а не только по внешнему виду.',
    },
    {
      type: 'task',
      content: `🟢 САМОПРОВЕРКА\n${intro.deepDive.selfCheckRule}`,
    },
  ]
}

/** Full reading intro document: quick + details + deepDive (no chat depth gate). */
export function buildReadingIntroBubbles(intro: LessonIntro, audience: Audience): Bubble[] {
  return [
    buildMenuEntryBubble(intro, audience),
    ...buildQuickBubbles(intro),
    ...buildDetailsBubbles(intro),
    ...buildDeepDiveBubbles(intro),
  ]
}
