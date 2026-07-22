import { isValidLessonIntro } from '@/lib/lessonIntro'
import { isIntroSuitableForReference } from '@/lib/reference/buildReferenceSheet'
import type { LessonBlueprint } from '@/lib/lessonBlueprint'
import type { LearningLessonActionId } from '@/lib/learningLessons'
import type { LessonIntro } from '@/types/lesson'

const DEFAULT_ACTIONS: LessonBlueprint['actions'] = [
  { id: 'examples', label: 'Посмотри примеры' },
  { id: 'fill_phrase', label: 'Подставь слово' },
  { id: 'repeat_translate', label: 'Переведи на английский' },
  { id: 'write_own_sentence', label: 'Напиши своё предложение' },
]

function buildStubTheoryIntro(intro: LessonIntro): string {
  const examples = intro.quick.examples
    .slice(0, 3)
    .map((ex, i) => `${i + 1}) ${ex.en} - ${ex.ru}`)
    .join('\n')
  const why = intro.quick.why.map((line, i) => `${i + 1}) ${line}`).join('\n')
  const how = intro.quick.how.map((line, i) => `${i + 1}) ${line}`).join('\n')
  return [
    `**Урок:** ${intro.topic}`,
    `**Правило:**\n${why}`,
    `**Примеры:**\n${examples}`,
    `**Коротко:** ${intro.quick.takeaway}`,
    `**Шаблоны:**\n${how}`,
  ].join('\n')
}

function buildStubFollowups(intro: LessonIntro): LessonBlueprint['followups'] {
  const topic = intro.topic
  const first = intro.quick.examples[0]
  return {
    examples: `**Примеры по теме "${topic}":**\n${intro.quick.examples
      .map((ex, i) => `${i + 1}) ${ex.en} - ${ex.ru}`)
      .join('\n')}`,
    fill_phrase: `**Подставь слово:**\n1) ${first?.en ?? topic}\nВыбери форму по смыслу.`,
    repeat_translate: `**Переведи на английский:**\n${intro.quick.examples
      .slice(0, 3)
      .map((ex, i) => `${i + 1}) ${ex.ru}`)
      .join('\n')}`,
    write_own_sentence: `**Напиши своё предложение:**\nТема: ${topic}\nИспользуй шаблон из шпаргалки.`,
  }
}

function readFollowups(raw: unknown): LessonBlueprint['followups'] | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const required: LearningLessonActionId[] = [
    'examples',
    'fill_phrase',
    'repeat_translate',
    'write_own_sentence',
  ]
  if (!required.every((id) => typeof row[id] === 'string' && String(row[id]).trim())) return null
  return {
    examples: String(row.examples),
    fill_phrase: String(row.fill_phrase),
    repeat_translate: String(row.repeat_translate),
    write_own_sentence: String(row.write_own_sentence),
  }
}

/**
 * Review-chip MVP needs intro for ReferenceSheet.
 * Models often return intro-only JSON — coerce missing blueprint fields from intro.
 */
export function coerceReviewChipBlueprint(
  parsed: unknown,
  fallbackTopic: string
): LessonBlueprint | null {
  if (!parsed || typeof parsed !== 'object') return null
  const row = parsed as Record<string, unknown>
  if (!isValidLessonIntro(row.intro)) return null
  const intro = row.intro
  if (!isIntroSuitableForReference(intro)) return null

  const topic = intro.topic.trim() || fallbackTopic.trim() || 'шпаргалка'
  const title =
    typeof row.title === 'string' && row.title.trim() ? row.title.trim() : topic

  const theoryIntro =
    typeof row.theoryIntro === 'string' && row.theoryIntro.trim()
      ? row.theoryIntro
      : buildStubTheoryIntro(intro)

  const actions =
    Array.isArray(row.actions) && row.actions.length > 0
      ? (row.actions as LessonBlueprint['actions'])
      : DEFAULT_ACTIONS

  const followups = readFollowups(row.followups) ?? buildStubFollowups(intro)

  return {
    title,
    intro,
    theoryIntro,
    actions,
    followups,
  }
}
