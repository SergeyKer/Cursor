import { featureFlags } from '@/lib/featureFlags'
import { canOpenLocalReferenceLesson } from '@/lib/reference/canOpenLocalReference'
import { buildReferenceSheetByLessonId } from '@/lib/reference/buildReferenceSheet'
import { findReferenceTopicCandidates, pickStrongReferenceHit } from '@/lib/reference/findReferenceTopicCandidates'
import { getPrebuiltSheet } from '@/lib/reference/prebuiltStore'
import { findSyllabusTopicCandidates } from '@/lib/reference/syllabus/search'
import { matchTutorGate } from '@/lib/tutor/tutorGate'
import { isTutorNoise } from '@/lib/tutor/tutorIntent'
import { normalizeFaqText } from '@/lib/tutor/localFaq/normalizeFaq'
import type { Audience } from '@/lib/types'
import type { ReferenceSheet } from '@/lib/reference/types'
import type { TutorExplainAnswer } from '@/lib/tutor/types'

export type ReferenceOpenContext = {
  title?: string
  canonicalKey?: string
  lessonIdHint?: string | null
  paragraphs?: string[]
  answerKind?: string
}

export type ReferenceOpenRequest = {
  rawQuery: string
  context?: ReferenceOpenContext
  /** From lastExplain when opening cheatsheet. */
  explain?: TutorExplainAnswer | null
  audience?: Audience
}

export type ReferenceCandidate = {
  id: string
  title: string
  whyRu: string
  openKind: 'local_lesson' | 'prebuilt' | 'generate'
  lessonId?: string
  topicKey?: string
  generateQuery: string
  sheet?: ReferenceSheet
}

export type ReferenceResolveResult =
  | { kind: 'open'; candidate: ReferenceCandidate }
  | { kind: 'choose'; candidates: ReferenceCandidate[] }
  | { kind: 'reject'; reason: 'noise' | 'gate' | 'unclear' | 'miss'; message: string }
  | { kind: 'needs_llm'; query: string }

const REJECT_NOISE = 'Не похоже на тему для справочника. Напиши правило или слово: have got, Present Continuous…'
const REJECT_GATE = 'Сейчас лучше спросить правило или «как сказать…» — не этот запрос.'
const REJECT_UNCLEAR = 'Уточни тему: например Present Perfect, get tired, It’s time to.'

/** Preset disambiguation before LLM (school-core). */
function presetCandidates(norm: string): ReferenceCandidate[] {
  if (!norm) return []

  if (
    /^(get|getting)$/.test(norm) ||
    norm === 'get up' ||
    norm.includes('get tired') ||
    norm.includes('get angry')
  ) {
    if (norm.includes('up') || norm === 'get up') {
      return [candidateFromTopicKey('get_up', 'Вставать с кровати')]
    }
    if (norm.includes('tired') || norm.includes('angry') || norm.includes('become')) {
      return [candidateFromTopicKey('get_become', 'Становиться каким-то (get tired)')]
    }
    if (norm === 'get' || norm === 'getting') {
      return [
        candidateFromTopicKey('get_become', 'get + прилагательное: устать / разозлиться'),
        candidateFromTopicKey('get_up', 'get up: вставать'),
      ].filter((c): c is ReferenceCandidate => Boolean(c))
    }
  }

  if (
    norm.includes('present perfect continuous') ||
    norm.includes('have been doing') ||
    norm.includes('has been doing') ||
    norm.includes('been doing')
  ) {
    return [candidateFromTopicKey('present_perfect_continuous', 'have been + V-ing')]
  }

  if (
    norm.includes('present continuous') ||
    /^(is|am|are) doing$/.test(norm) ||
    norm === 'is doing' ||
    norm === 'i am doing'
  ) {
    return [candidateFromTopicKey('present_continuous', 'am/is/are + V-ing сейчас')]
  }

  if (
    norm === 'a lot' ||
    norm === 'alot' ||
    norm.includes('a lot of') ||
    norm === 'much' ||
    norm === 'many' ||
    (norm.includes('much') && norm.includes('many'))
  ) {
    return [candidateFromTopicKey('quantifiers', 'much / many / a lot of')]
  }

  if (
    norm === 'present perfect' ||
    norm === 'present_perfect' ||
    (norm.includes('present') && norm.includes('perfect') && !norm.includes('continuous'))
  ) {
    return [
      candidateFromTopicKey('present_perfect_experience', 'опыт: have you ever…'),
      candidateFromTopicKey('past_vs_present_perfect', 'Past Simple vs Present Perfect'),
      candidateFromTopicKey('present_perfect_just_already', 'just / already / yet'),
    ].filter((c): c is ReferenceCandidate => Boolean(c))
  }

  if (
    /^(was|were)$/.test(norm) ||
    norm.includes('я был') ||
    norm.includes('i was') ||
    (norm.includes('почему') && norm.includes('was'))
  ) {
    return [candidateFromTopicKey('past_simple', 'was / were и Past Simple')]
  }

  if (norm === 'cars' || norm === 'car') {
    return [
      candidateFromTopicKey('articles', 'a car / the car'),
      candidateFromTopicKey('plurals', 'car → cars'),
      candidateFromTopicKey('countable_uncountable', 'считаем или нет'),
    ].filter((c): c is ReferenceCandidate => Boolean(c))
  }

  return []
}

function candidateFromTopicKey(topicKey: string, whyRu: string): ReferenceCandidate | null {
  const sheet = getPrebuiltSheet(topicKey)
  if (sheet) {
    const lessonId = sheet.relatedLessonId?.trim()
    if (lessonId && canOpenLocalReferenceLesson(lessonId)) {
      return {
        id: `lesson:${lessonId}`,
        title: sheet.title,
        whyRu,
        openKind: 'local_lesson',
        lessonId,
        topicKey,
        generateQuery: sheet.title,
        sheet: buildReferenceSheetByLessonId(lessonId) ?? sheet,
      }
    }
    return {
      id: `prebuilt:${topicKey}`,
      title: sheet.title,
      whyRu,
      openKind: 'prebuilt',
      topicKey,
      generateQuery: sheet.title,
      sheet,
    }
  }
  // Planned / no sheet yet — still offer as generate candidate when flag on
  return {
    id: `gen:${topicKey}`,
    title: topicKey.replace(/_/g, ' '),
    whyRu,
    openKind: 'generate',
    topicKey,
    generateQuery: `${topicKey.replace(/_/g, ' ')} — ${whyRu}`,
  }
}

function openLessonCandidate(lessonId: string, whyRu: string): ReferenceCandidate | null {
  if (!canOpenLocalReferenceLesson(lessonId)) return null
  const sheet = buildReferenceSheetByLessonId(lessonId)
  if (!sheet) return null
  return {
    id: `lesson:${lessonId}`,
    title: sheet.title,
    whyRu,
    openKind: 'local_lesson',
    lessonId,
    generateQuery: sheet.title,
    sheet,
  }
}

function dedupeCandidates(items: ReferenceCandidate[]): ReferenceCandidate[] {
  const seen = new Set<string>()
  const out: ReferenceCandidate[] = []
  for (const c of items) {
    const key = c.id
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
    if (out.length >= 5) break
  }
  return out
}

/**
 * Sync gold-first resolve for menu search and tutor cheatsheet.
 * LLM disambiguation is `needs_llm` — caller invokes API only if referenceGenerate.
 */
export function resolveReferenceOpen(params: ReferenceOpenRequest): ReferenceResolveResult {
  const raw = (params.rawQuery || params.context?.title || params.explain?.title || '').trim()
  const explain = params.explain
  const ctx = params.context
  const audience = params.audience ?? 'adult'

  if (!raw && !ctx?.lessonIdHint && !ctx?.canonicalKey && !explain?.topicAnchor.lessonIdHint) {
    return { kind: 'reject', reason: 'unclear', message: REJECT_UNCLEAR }
  }

  const gateQuery = raw || ctx?.title || ''
  if (gateQuery && isTutorNoise(gateQuery)) {
    return { kind: 'reject', reason: 'noise', message: REJECT_NOISE }
  }
  if (gateQuery && matchTutorGate(gateQuery)) {
    return { kind: 'reject', reason: 'gate', message: REJECT_GATE }
  }

  const hint =
    explain?.topicAnchor.lessonIdHint?.trim() ||
    ctx?.lessonIdHint?.trim() ||
    ''
  if (hint) {
    const opened = openLessonCandidate(hint, 'Тема из ответа репетитора')
    if (opened) return { kind: 'open', candidate: opened }
  }

  const canonical =
    explain?.topicAnchor.canonicalKey?.trim() ||
    ctx?.canonicalKey?.trim() ||
    ''
  if (canonical) {
    const fromKey = candidateFromTopicKey(canonical, 'Тема по ключу')
    if (fromKey && fromKey.openKind !== 'generate') {
      return { kind: 'open', candidate: fromKey }
    }
  }

  const norm = normalizeFaqText(raw)
  const presets = presetCandidates(norm).filter((c) => c.openKind !== 'generate' || featureFlags.referenceGenerate)
  if (presets.length === 1 && presets[0] && presets[0].openKind !== 'generate') {
    return { kind: 'open', candidate: presets[0] }
  }
  if (presets.length > 1) {
    return { kind: 'choose', candidates: dedupeCandidates(presets) }
  }
  if (presets.length === 1 && presets[0]?.openKind === 'generate') {
    if (featureFlags.referenceGenerate) {
      return { kind: 'choose', candidates: presets }
    }
  }

  const lessonHits = findReferenceTopicCandidates(raw, audience, 5)
  const strong = pickStrongReferenceHit(lessonHits)
  if (strong) {
    const opened = openLessonCandidate(strong.lessonId, strong.reason || 'Найден урок')
    if (opened) return { kind: 'open', candidate: opened }
  }

  const syllabusHits = findSyllabusTopicCandidates(raw, 6)
  const openable: ReferenceCandidate[] = []
  for (const hit of syllabusHits) {
    if (hit.score < 70) continue
    const c = candidateFromTopicKey(hit.topic.topicKey, hit.topic.teaser)
    if (c && c.openKind !== 'generate') openable.push(c)
  }
  const unique = dedupeCandidates(openable)
  if (unique.length === 1 && unique[0]) {
    return { kind: 'open', candidate: unique[0] }
  }
  if (unique.length > 1) {
    const top = unique[0]!
    const second = unique[1]!
    // Strong leader
    if (
      syllabusHits[0] &&
      syllabusHits[1] &&
      syllabusHits[0].score >= 100 &&
      syllabusHits[0].score - syllabusHits[1].score >= 20
    ) {
      return { kind: 'open', candidate: top }
    }
    return { kind: 'choose', candidates: unique }
  }

  if (featureFlags.referenceGenerate && raw.trim().length > 3) {
    return { kind: 'needs_llm', query: raw.trim() }
  }

  return { kind: 'reject', reason: 'miss', message: REJECT_UNCLEAR }
}

/** Apply user-chosen candidate → open sheet or signal generate. */
export function materializeReferenceCandidate(
  candidate: ReferenceCandidate
): { kind: 'open'; sheet: ReferenceSheet } | { kind: 'generate'; query: string } | { kind: 'miss' } {
  if (candidate.openKind === 'generate') {
    return { kind: 'generate', query: candidate.generateQuery }
  }
  if (candidate.sheet) {
    return { kind: 'open', sheet: candidate.sheet }
  }
  if (candidate.lessonId) {
    const sheet = buildReferenceSheetByLessonId(candidate.lessonId)
    if (sheet) return { kind: 'open', sheet }
  }
  if (candidate.topicKey) {
    const sheet = getPrebuiltSheet(candidate.topicKey)
    if (sheet) return { kind: 'open', sheet }
  }
  return { kind: 'miss' }
}
