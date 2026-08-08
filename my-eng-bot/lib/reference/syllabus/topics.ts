import type { LessonCatalogLevel } from '@/lib/lessonCatalog'
import { sortSyllabusByCurriculum } from '@/lib/reference/syllabus/curriculumOrder'
import { SYLLABUS_TOPIC_META } from '@/lib/reference/syllabus/topicMeta'
import type {
  ReferenceSyllabusSource,
  ReferenceSyllabusStatus,
  ReferenceSyllabusTopic,
} from '@/lib/reference/syllabus/types'
import { hasStaticPrebuiltSheet } from '@/lib/reference/prebuiltStore'
import { listAllLocalFaq } from '@/lib/tutor/localFaq/catalog'
import type { LocalFaqLevel } from '@/lib/tutor/localFaq/types'

/** FAQ dump buckets — not browse themes. */
export const SYLLABUS_NOISE_TOPIC_KEYS = new Set([
  'mistakes',
  'functional',
  'common_errors_still_made_at_b1',
  'final_mixed_block',
  'more_grammar_points',
  'еще_полезные_микро_вопросы_a1',
])

/** topicKey → structured lesson id when intro sheet exists. */
export const SYLLABUS_LESSON_LINKS: Record<string, string> = {
  its_time_to: '1',
  weather_it: '1',
  вопросы_и_порядок_слов: '2',
  wh_subject_questions: '2',
  questions_do_does: '2',
  word_order: '3',
  reported_speech: '3',
  reported_statements: '3',
  present_simple: '4',
  to_be: '4',
}

const CEFR_GAP_KEYS = [
  'its_time_to',
  'be_going_to',
  'can_ability',
  'wh_subject_questions',
  'would_like',
  'possessive_s',
  'object_pronouns',
  'frequency_adverbs',
  'countable_uncountable',
  'zero_conditional',
  'first_conditional',
  'second_conditional',
  'present_perfect_experience',
  'should_advice',
  'must_have_to',
  'past_simple_irregular',
  'questions_do_does',
  'like_ing',
  'weather_it',
  'telling_time',
  'days_months',
  'comparative_as_as',
  'present_perfect_just_already',
  'past_vs_present_perfect',
  'passive_basic',
  'reported_statements',
  'get_become',
  'get_up',
] as const


const LEVEL_RANK: Record<LocalFaqLevel, number> = { a1: 1, a2: 2, b1: 3, b2: 4 }

function faqLevelToCatalog(level: LocalFaqLevel): LessonCatalogLevel {
  return level.toUpperCase() as LessonCatalogLevel
}

function humanizeKey(topicKey: string): { titleRu: string; titleEn: string; teaser: string } {
  const meta = SYLLABUS_TOPIC_META[topicKey]
  if (meta) {
    return { titleRu: meta.titleRu, titleEn: meta.titleEn, teaser: meta.teaser }
  }
  const spaced = topicKey.replace(/_/g, ' ').trim()
  const titleEn = spaced.replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    titleRu: titleEn,
    titleEn,
    teaser: `Тема: ${spaced}.`,
  }
}

function pickLevelForKey(
  topicKey: string,
  levelsSeen: Set<LocalFaqLevel>
): LessonCatalogLevel {
  const preferred = SYLLABUS_TOPIC_META[topicKey]?.level
  if (preferred) return preferred
  let best: LocalFaqLevel = 'a2'
  let bestRank = 99
  for (const lvl of levelsSeen) {
    const rank = LEVEL_RANK[lvl] ?? 99
    if (rank < bestRank) {
      bestRank = rank
      best = lvl
    }
  }
  return faqLevelToCatalog(best)
}

function statusForKey(topicKey: string): {
  status: ReferenceSyllabusStatus
  lessonId: string | null
} {
  const lessonId = SYLLABUS_LESSON_LINKS[topicKey] ?? null
  if (lessonId) return { status: 'lesson_ready', lessonId }
  if (hasStaticPrebuiltSheet(topicKey)) return { status: 'sheet_ready', lessonId: null }
  return { status: 'planned', lessonId: null }
}

function buildTopic(
  topicKey: string,
  level: LessonCatalogLevel,
  source: ReferenceSyllabusSource
): ReferenceSyllabusTopic {
  const copy = humanizeKey(topicKey)
  const meta = SYLLABUS_TOPIC_META[topicKey]
  const { status, lessonId } = statusForKey(topicKey)
  return {
    topicKey,
    level,
    titleRu: copy.titleRu,
    titleEn: copy.titleEn,
    teaser: copy.teaser,
    tags: [],
    lessonId,
    status,
    source,
    searchAliases: [...(meta?.aliases ?? [])],
  }
}

function collectFaqKeysByLowestLevel(): Map<string, Set<LocalFaqLevel>> {
  const map = new Map<string, Set<LocalFaqLevel>>()
  for (const entry of listAllLocalFaq()) {
    if (SYLLABUS_NOISE_TOPIC_KEYS.has(entry.topicKey)) continue
    let set = map.get(entry.topicKey)
    if (!set) {
      set = new Set()
      map.set(entry.topicKey, set)
    }
    set.add(entry.level)
  }
  return map
}

let cachedTopics: readonly ReferenceSyllabusTopic[] | null = null

/** Build once: FAQ keys − noise ∪ CEFR gaps, with lesson_ready where linked. */
export function getReferenceSyllabusTopics(): readonly ReferenceSyllabusTopic[] {
  if (cachedTopics) return cachedTopics

  const byKey = collectFaqKeysByLowestLevel()
  const out: ReferenceSyllabusTopic[] = []
  const seen = new Set<string>()

  for (const [topicKey, levels] of byKey) {
    seen.add(topicKey)
    out.push(buildTopic(topicKey, pickLevelForKey(topicKey, levels), 'faq'))
  }

  for (const gapKey of CEFR_GAP_KEYS) {
    if (seen.has(gapKey)) continue
    const meta = SYLLABUS_TOPIC_META[gapKey]
    out.push(buildTopic(gapKey, meta?.level ?? 'A2', 'cefr_gap'))
  }

  out.sort((a, b) => {
    const byLevel = a.level.localeCompare(b.level)
    if (byLevel !== 0) return byLevel
    return a.titleRu.localeCompare(b.titleRu, 'ru')
  })

  cachedTopics = out
  return out
}

/** Test helper. */
export function clearReferenceSyllabusCacheForTests(): void {
  cachedTopics = null
}

export function listSyllabusTopicsByLevel(
  level: LessonCatalogLevel
): ReferenceSyllabusTopic[] {
  return sortSyllabusByCurriculum(getReferenceSyllabusTopics().filter((t) => t.level === level))
}

export function getSyllabusTopicByKey(topicKey: string): ReferenceSyllabusTopic | null {
  const key = topicKey.trim()
  if (!key) return null
  return getReferenceSyllabusTopics().find((t) => t.topicKey === key) ?? null
}

export function listOpenableSyllabusTopics(): ReferenceSyllabusTopic[] {
  return getReferenceSyllabusTopics().filter((t) => {
    if (t.status === 'lesson_ready' && Boolean(t.lessonId)) return true
    if (t.status === 'sheet_ready') return true
    return hasStaticPrebuiltSheet(t.topicKey)
  })
}
