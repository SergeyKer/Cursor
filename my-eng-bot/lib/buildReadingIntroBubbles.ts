import { buildLessonReadingBubbles } from '@/lib/buildLessonReadingBubbles'
import type { Audience } from '@/lib/types'
import type { Bubble, LessonIntro } from '@/types/lesson'

/**
 * Lesson intro reading document: shared card set via buildLessonReadingBubbles
 * (Тема урока / Правило / Шаблоны / Примеры / Не путать? / Ошибки / Самопроверка).
 * `audience` kept for call-site compatibility; cards no longer use menu long-copy.
 */
export function buildReadingIntroBubbles(intro: LessonIntro, _audience: Audience): Bubble[] {
  return buildLessonReadingBubbles(intro, { title: intro.topic, mode: 'lesson' })
}
