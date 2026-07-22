import { buildLessonReadingBubbles } from '@/lib/buildLessonReadingBubbles'
import type { ReferenceSheet } from '@/lib/reference/types'
import type { Bubble, LessonIntro } from '@/types/lesson'

/** Same 6-card reading set as lesson intro (no separate title-only bubble). */
export function buildReferenceBubbles(sheet: ReferenceSheet): Bubble[] {
  const intro: LessonIntro = {
    topic: sheet.title,
    kind: 'single_rule',
    complexity: 'simple',
    quick: {
      why: sheet.rule,
      how: sheet.formula,
      examples: sheet.examples,
      takeaway: sheet.hook ?? '',
    },
    deepDive: {
      commonMistakes: sheet.traps,
      contrastNotes: [],
      selfCheckRule: sheet.selfCheck ?? '',
    },
  }
  return buildLessonReadingBubbles(intro, { title: sheet.title })
}
