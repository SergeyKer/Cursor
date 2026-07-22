import { isIntroSuitableForReference } from '@/lib/reference/buildReferenceSheet'
import type { LessonIntro, LessonIntroExample } from '@/types/lesson'

const GENERIC_FALLBACK_MARKERS = [
  'думай так: сначала смысл',
  'помогает точнее выразить мысль',
] as const

function hasDoubleColon(value: string | null | undefined): boolean {
  return Boolean(value && value.includes('::'))
}

function looksLikeGenericFallback(text: string): boolean {
  const lower = text.toLowerCase()
  return GENERIC_FALLBACK_MARKERS.some((marker) => lower.includes(marker))
}

function stripDoubleColonLines(items: string[] | undefined): string[] {
  if (!items?.length) return []
  return items.map((item) => item.trim()).filter((item) => item && !item.includes('::'))
}

function sanitizeExamples(examples: LessonIntroExample[] | undefined): LessonIntroExample[] {
  if (!examples?.length) return []
  return examples
    .map((ex) => ({
      en: ex.en?.trim() ?? '',
      ru: ex.ru?.trim() ?? '',
      note: ex.note?.trim() ?? '',
    }))
    .filter((ex) => ex.en && !ex.en.includes('::') && !ex.ru.includes('::') && !ex.note.includes('::'))
}

export type ReviewChipReferenceRejectReason =
  | 'http'
  | 'fallback'
  | 'no_intro'
  | 'unsuitable'
  | 'poison_marker'
  | 'generic_fallback'

export function shouldRejectReviewChipLesson(params: {
  ok: boolean
  fallback?: boolean
  intro?: LessonIntro | null
  lessonTitle?: string | null
}): { reject: true; reason: ReviewChipReferenceRejectReason } | { reject: false } {
  if (!params.ok) return { reject: true, reason: 'http' }
  if (params.fallback) return { reject: true, reason: 'fallback' }
  const intro = params.intro
  if (!intro) return { reject: true, reason: 'no_intro' }
  if (!isIntroSuitableForReference(intro)) return { reject: true, reason: 'unsuitable' }

  if (
    hasDoubleColon(intro.topic) ||
    hasDoubleColon(params.lessonTitle) ||
    hasDoubleColon(intro.quick?.takeaway)
  ) {
    return { reject: true, reason: 'poison_marker' }
  }

  const whyHow = [...(intro.quick?.why ?? []), ...(intro.quick?.how ?? [])]
  if (
    looksLikeGenericFallback(intro.quick?.takeaway ?? '') ||
    whyHow.some((line) => looksLikeGenericFallback(line))
  ) {
    return { reject: true, reason: 'generic_fallback' }
  }

  return { reject: false }
}

/** Pin EN-anchor and strip :: leakage from intro fields. */
export function prepareReviewChipIntroForReference(
  intro: LessonIntro,
  enAnchor: string
): LessonIntro {
  const topic = enAnchor.trim() || intro.topic
  const takeaway = (intro.quick?.takeaway ?? '').trim()
  return {
    ...intro,
    topic,
    quick: {
      why: stripDoubleColonLines(intro.quick?.why),
      how: stripDoubleColonLines(intro.quick?.how),
      examples: sanitizeExamples(intro.quick?.examples),
      takeaway: takeaway.includes('::') ? '' : takeaway,
    },
    deepDive: intro.deepDive
      ? {
          ...intro.deepDive,
          commonMistakes: stripDoubleColonLines(intro.deepDive.commonMistakes),
          contrastNotes: stripDoubleColonLines(intro.deepDive.contrastNotes),
          selfCheckRule: (intro.deepDive.selfCheckRule ?? '').includes('::')
            ? ''
            : intro.deepDive.selfCheckRule,
        }
      : intro.deepDive,
  }
}

export function buildReviewChipRuntimeLessonId(enAnchor: string, cacheTopicKey: string): string {
  const hash = cacheTopicKey.includes('::')
    ? cacheTopicKey.slice(cacheTopicKey.lastIndexOf('::') + 2)
    : '0'
  const slug = enAnchor
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `review-chip-${slug || 'topic'}-${hash}`
}
