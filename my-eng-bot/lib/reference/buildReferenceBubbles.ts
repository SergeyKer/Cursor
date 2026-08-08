import { buildLessonReadingBubbles } from '@/lib/buildLessonReadingBubbles'
import type { ReferenceSheet } from '@/lib/reference/types'
import type { LessonReadingBubbleMode } from '@/lib/uiCopy/lessonReadingCards'
import type { Bubble, LessonIntro } from '@/types/lesson'

export type BuildReferenceBubblesOptions = {
  /** lookup = menu search; cheatsheet = tutor chip; default lookup for reference screens. */
  mode?: Exclude<LessonReadingBubbleMode, 'lesson'>
}

/** Reference sheet → same LessonIntro reading cards (mode filters subset + labels). */
export function buildReferenceBubbles(
  sheet: ReferenceSheet,
  options: BuildReferenceBubblesOptions = {}
): Bubble[] {
  const mode = options.mode ?? 'lookup'
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
      contrastNotes: sheet.contrast ?? [],
      selfCheckRule: sheet.selfCheck ?? '',
    },
  }
  return buildLessonReadingBubbles(intro, { title: sheet.title, mode })
}
