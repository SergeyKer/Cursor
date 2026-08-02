import { featureFlags } from '@/lib/featureFlags'
import { gateReferenceSheetIntro } from '@/lib/reference/sheetOutputGate'
import { matchTutorGate } from '@/lib/tutor/tutorGate'
import type { AiProvider, Audience, LevelId } from '@/lib/types'
import type { LessonIntro } from '@/types/lesson'
import type { ReferenceSheet } from '@/lib/reference/types'
import { trackReferenceEvent } from '@/lib/reference/analytics'

export type GenerateReferenceSheetParams = {
  query: string
  level?: LevelId | string
  audience?: Audience | string
  provider?: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  fetcher?: typeof fetch
}

export type GenerateReferenceSheetResult =
  | { kind: 'generated'; sheet: ReferenceSheet }
  | { kind: 'rejected'; reason: 'generate_disabled' | 'short_token' | 'input_gate' | 'output_gate' | 'http' }

function isShortToken(query: string): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean)
  return query.trim().length <= 3 || (words.length === 1 && words[0]!.length <= 12)
}

function levelFromInput(level?: string): ReferenceSheet['level'] {
  const normalized = (level ?? '').toLowerCase()
  if (normalized === 'a1' || normalized === 'starter') return 'A1'
  if (normalized === 'b1') return 'B1'
  if (normalized === 'b2') return 'B2'
  if (normalized === 'c1') return 'C1'
  return 'A2'
}

export function buildReferenceSheetFromGeneratedIntro(params: {
  query: string
  intro: LessonIntro
  level?: string
}): ReferenceSheet {
  const intro = params.intro
  const rule = intro.grammarRule?.bullets ?? intro.quick.why
  const formula = intro.howGuide?.bullets ?? intro.quick.how
  return {
    id: `generated:${params.query.trim().toLowerCase().replace(/\s+/g, '-')}`,
    title: intro.topic.trim() || params.query.trim(),
    teaser: intro.quick.takeaway.trim() || rule[0] || formula[0] || params.query.trim(),
    level: levelFromInput(params.level),
    hasPractice: false,
    hook: intro.quick.takeaway.trim() || null,
    rule: rule.map((item) => item.trim()).filter(Boolean),
    formula: formula.map((item) => item.trim()).filter(Boolean),
    traps: (intro.deepDive?.commonMistakes ?? []).map((item) => item.trim()).filter(Boolean),
    examples: (intro.quick.examples ?? []).filter((example) => example.en.trim()),
    selfCheck: intro.deepDive?.selfCheckRule?.trim() || null,
    relatedLessonId: null,
  }
}

export async function generateReferenceSheet(
  params: GenerateReferenceSheetParams
): Promise<GenerateReferenceSheetResult> {
  const query = params.query.trim()
  if (!query || isShortToken(query)) {
    trackReferenceEvent('reference_reject', { reason: 'short_token' })
    return { kind: 'rejected', reason: 'short_token' }
  }
  trackReferenceEvent('reference_generate')
  if (!featureFlags.referenceGenerate) {
    trackReferenceEvent('reference_reject', { reason: 'generate_disabled' })
    return { kind: 'rejected', reason: 'generate_disabled' }
  }
  if (matchTutorGate(query)) {
    trackReferenceEvent('reference_reject', { reason: 'input_gate' })
    return { kind: 'rejected', reason: 'input_gate' }
  }

  try {
    const response = await (params.fetcher ?? fetch)('/api/reference-sheet-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        level: params.level,
        audience: params.audience,
        provider: params.provider,
        openAiChatPreset: params.openAiChatPreset,
      }),
    })
    const data = (await response.json()) as { intro?: LessonIntro; error?: string }
    if (!response.ok || !data.intro) {
      const reason = response.ok ? 'output_gate' : 'http'
      trackReferenceEvent('reference_reject', { reason })
      return { kind: 'rejected', reason }
    }
    const gate = gateReferenceSheetIntro({
      ok: true,
      intro: data.intro,
      lessonTitle: data.intro.topic,
      enAnchor: query,
    })
    if (gate.reject) {
      trackReferenceEvent('reference_reject', { reason: 'output_gate' })
      return { kind: 'rejected', reason: 'output_gate' }
    }
    return {
      kind: 'generated',
      sheet: buildReferenceSheetFromGeneratedIntro({
        query,
        intro: gate.intro,
        level: params.level,
      }),
    }
  } catch {
    trackReferenceEvent('reference_reject', { reason: 'http' })
    return { kind: 'rejected', reason: 'http' }
  }
}
