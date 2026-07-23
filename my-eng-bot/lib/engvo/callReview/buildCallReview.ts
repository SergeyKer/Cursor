import type { LanguageNote } from '@/lib/languageNote/types'
import { formatCallReviewSummaryLine } from '@/lib/uiCopy/callReview'
import { dedupeReviewTopics } from '@/lib/engvo/callReview/dedupeReviewTopics'
import {
  CALL_REVIEW_MAX_CARDS,
  CALL_REVIEW_MAX_TOPICS,
  type CallReviewBufferItem,
  type CallReviewCard,
  type CallReviewKind,
  type CallReviewSession,
  type CallReviewTopicEntry,
} from '@/lib/engvo/callReview/types'

function phrasesEqualLoose(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s']/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
  return norm(a) === norm(b)
}

function buildSyntheticNote(card: CallReviewCard): LanguageNote {
  if (card.sourceNote) return card.sourceNote
  return {
    status: 'needs_fix',
    original: card.original,
    correct: card.correct,
    correctHighlights: [],
    correctReasons: card.reason ? [card.reason] : [],
    better: card.better,
    betterHighlights: [],
    betterReasons: [],
    betterAlternatives: [],
    reviewTopics: card.reviewTopics,
    lessonId: card.lessonId,
    lessonTitle: null,
    teacherEtalon: card.teacherEtalon || undefined,
  }
}

function bufferItemToCard(item: CallReviewBufferItem, kind: CallReviewKind): CallReviewCard | null {
  const original = item.original.trim()
  const correct = item.correct.trim()
  if (!original || !correct) return null

  const reason =
    kind === 'free_call' && item.reason?.trim() ? item.reason.trim() : null
  const betterRaw = kind === 'free_call' && item.better?.trim() ? item.better.trim() : null
  const better =
    betterRaw && !phrasesEqualLoose(betterRaw, correct) ? betterRaw : null

  return {
    id: `${item.utteranceHash}-${item.seq}`,
    utteranceHash: item.utteranceHash,
    original,
    correct,
    reason,
    better,
    teacherEtalon: kind === 'teacher' || Boolean(item.teacherEtalon),
    reviewTopics: item.reviewTopics ?? [],
    lessonId: item.lessonId ?? item.sourceNote?.lessonId ?? null,
    sourceNote: item.sourceNote ?? null,
  }
}

/**
 * Build session for the post-call sheet from the in-call buffer.
 * - Dedupe by utteranceHash (keep latest seq).
 * - Keep last CALL_REVIEW_MAX_CARDS chronologically.
 * - Dedupe topics across cards (max CALL_REVIEW_MAX_TOPICS).
 */
export function buildCallReview(
  kind: CallReviewKind,
  items: readonly CallReviewBufferItem[]
): CallReviewSession {
  const byHash = new Map<string, CallReviewBufferItem>()
  for (const item of items) {
    const prev = byHash.get(item.utteranceHash)
    if (!prev || item.seq >= prev.seq) byHash.set(item.utteranceHash, item)
  }

  const ordered = [...byHash.values()].sort((a, b) => a.seq - b.seq)
  const sliced =
    ordered.length > CALL_REVIEW_MAX_CARDS
      ? ordered.slice(ordered.length - CALL_REVIEW_MAX_CARDS)
      : ordered

  const cards: CallReviewCard[] = []
  for (const item of sliced) {
    const card = bufferItemToCard(item, kind)
    if (card) cards.push(card)
  }

  const flatTopics = cards.flatMap((c) => c.reviewTopics)
  const uniqueTopics = dedupeReviewTopics(flatTopics, CALL_REVIEW_MAX_TOPICS)

  const topics: CallReviewTopicEntry[] = []
  for (const topic of uniqueTopics) {
    const card = cards.find((c) =>
      c.reviewTopics.some(
        (t) => t.id === topic.id || t.title.trim() === topic.title.trim()
      )
    )
    if (!card) continue
    topics.push({
      topic,
      representativeNote: buildSyntheticNote(card),
    })
  }

  return {
    kind,
    cards,
    topics,
    summaryLine: formatCallReviewSummaryLine(kind, cards.length),
  }
}

export function callReviewCardFromLanguageNote(
  note: LanguageNote,
  utteranceHash: string,
  seq: number
): CallReviewBufferItem | null {
  if (note.status !== 'needs_fix') return null
  const original = note.original.trim()
  const correct = note.correct.trim()
  if (!original || !correct) return null
  return {
    utteranceHash,
    original,
    correct,
    reason: note.correctReasons[0]?.trim() || null,
    better: note.better,
    teacherEtalon: Boolean(note.teacherEtalon),
    reviewTopics: note.reviewTopics,
    lessonId: note.lessonId,
    sourceNote: note,
    seq,
  }
}
