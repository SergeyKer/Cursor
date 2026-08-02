import type { LessonCatalogLevel } from '@/lib/lessonCatalog'
import type { ReferenceSyllabusTopic } from '@/lib/reference/syllabus/types'

/** Discovery order within a CEFR level (mass-core first). */
const CURRICULUM_ORDER: Record<string, number> = {
  to_be: 10,
  weather_it: 15,
  its_time_to: 16,
  articles: 20,
  pronouns: 25,
  object_pronouns: 26,
  possessive_s: 27,
  plurals: 30,
  there_is: 35,
  have_got: 40,
  present_simple: 50,
  questions_do_does: 55,
  вопросы_и_порядок_слов: 56,
  wh_subject_questions: 57,
  отрицания_и_краткие_ответы: 58,
  can_ability: 60,
  like_ing: 65,
  would_like: 66,
  imperative: 70,
  time_numbers: 75,
  telling_time: 76,
  days_months: 77,
  adverbs_time: 80,
  frequency_adverbs: 81,
  предлоги: 85,
  adjectives: 90,
  present_continuous: 100,
  past_simple: 110,
  past_simple_irregular: 111,
  past_continuous: 120,
  future: 130,
  be_going_to: 131,
  present_perfect: 140,
  present_perfect_experience: 141,
  present_perfect_just_already: 142,
  modals: 150,
  should_advice: 151,
  must_have_to: 152,
  comparatives: 160,
  comparative_as_as: 161,
  quantifiers: 170,
  countable_uncountable: 171,
  conditionals: 180,
  zero_conditional: 181,
  first_conditional: 182,
  second_conditional: 183,
  word_order: 190,
  reported_speech: 200,
  reported_statements: 201,
  relative_clauses: 210,
  gerunds_infinitives: 220,
  phrasal_verbs: 230,
  used_to: 240,
  too_enough: 250,
  indefinites: 260,
  connectors: 270,
  agreement: 280,
  prepositions: 290,
  passive_causative: 300,
  passive_basic: 301,
  past_perfect: 310,
  present_perfect_continuous: 320,
  past_vs_present_perfect: 330,
  so_such: 340,
  time_reason_clauses: 350,
  collocations: 400,
  verb_patterns: 410,
}

export function curriculumRank(topicKey: string): number {
  return CURRICULUM_ORDER[topicKey] ?? 900
}

export function sortSyllabusByCurriculum(
  topics: readonly ReferenceSyllabusTopic[]
): ReferenceSyllabusTopic[] {
  return [...topics].sort((a, b) => {
    const byRank = curriculumRank(a.topicKey) - curriculumRank(b.topicKey)
    if (byRank !== 0) return byRank
    return a.titleRu.localeCompare(b.titleRu, 'ru')
  })
}

export function syllabusLevelsWithTopics(
  topics: readonly ReferenceSyllabusTopic[]
): LessonCatalogLevel[] {
  const present = new Set(topics.map((t) => t.level))
  return (['A1', 'A2', 'B1', 'B2'] as LessonCatalogLevel[]).filter((l) => present.has(l))
}
