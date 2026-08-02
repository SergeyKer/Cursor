import { isIntroSuitableForReference } from '@/lib/reference/buildReferenceSheet'
import {
  prepareReviewChipIntroForReference,
  shouldRejectReviewChipLesson,
} from '@/lib/lessonGenerate/reviewChipReferenceGate'
import type { LessonIntro } from '@/types/lesson'

const LEAK_PATTERNS = [
  /::/,
  /system prompt/i,
  /you are (a |an )?методист/i,
  /anti-leak/i,
  /НЕ цитируй/i,
  /tool names/i,
  /\bsystem\s*:/i,
  /\byou are\b/i,
  /\bcanonicalKey\b/i,
  /\breview-chip[-_]/i,
  /\b(?:hook|rule|formula)\s*:/i,
  /"?(?:system|user|assistant)"?\s*:/i,
  /```/,
  /openai/i,
  /chatgpt/i,
  /as an ai/i,
]

export type SheetGateRejectReason =
  | 'http'
  | 'fallback'
  | 'no_intro'
  | 'unsuitable'
  | 'poison_marker'
  | 'generic_fallback'
  | 'prompt_leak'

function textBlob(intro: LessonIntro): string {
  const parts = [
    intro.topic,
    intro.quick?.takeaway,
    ...(intro.quick?.why ?? []),
    ...(intro.quick?.how ?? []),
    ...(intro.deepDive?.commonMistakes ?? []),
    intro.deepDive?.selfCheckRule ?? '',
  ]
  return parts.filter(Boolean).join('\n')
}

export function hasReferencePromptLeak(text: string): boolean {
  return LEAK_PATTERNS.some((re) => re.test(text))
}

export function gateReferenceSheetIntro(params: {
  ok: boolean
  fallback?: boolean
  intro?: LessonIntro | null
  lessonTitle?: string | null
  enAnchor?: string
}): { reject: true; reason: SheetGateRejectReason } | { reject: false; intro: LessonIntro } {
  const base = shouldRejectReviewChipLesson({
    ok: params.ok,
    fallback: params.fallback,
    intro: params.intro,
    lessonTitle: params.lessonTitle,
  })
  if (base.reject) return base

  const raw = params.intro!
  const anchor = (params.enAnchor || raw.topic || '').trim()
  const intro = prepareReviewChipIntroForReference(raw, anchor)
  if (!isIntroSuitableForReference(intro)) {
    return { reject: true, reason: 'unsuitable' }
  }
  if (hasReferencePromptLeak(textBlob(intro))) {
    return { reject: true, reason: 'prompt_leak' }
  }
  return { reject: false, intro }
}
