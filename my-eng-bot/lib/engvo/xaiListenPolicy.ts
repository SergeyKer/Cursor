import {
  ENGVO_INTERRUPT_DEBOUNCE_MS,
  ENGVO_XAI_FREE_CALL_SILENCE_DURATION_MS,
  ENGVO_XAI_FREE_CALL_VAD_THRESHOLD,
  ENGVO_XAI_TEACHER_INTERRUPT_DEBOUNCE_MS,
  ENGVO_XAI_TEACHER_SILENCE_DURATION_MS,
  ENGVO_XAI_TEACHER_VAD_THRESHOLD,
} from '@/lib/engvo/constants'
import type { EngvoTeacherPhase, EngvoVoiceSessionKind } from '@/lib/engvo/sessionKind'
import { normalizeEngvoUserTranscriptForCompare } from '@/lib/engvo/userTranscriptCoalesce'

export const ENGVO_XAI_UNCLEAR_AUDIO_APPENDIX =
  'Unclear-audio policy (xAI): ask the learner to repeat only when audio is empty, filler-only, or unintelligible noise. If they produced any English or Russian lexical attempt, treat it as an attempt — never pretend you did not hear it.'

const ENGVO_XAI_KEYTERM_HELPERS = [
  'a',
  'an',
  'the',
  'is',
  'are',
  'do',
  'does',
  'did',
  'going',
  'to',
  'I',
  'you',
  'he',
  'she',
  'we',
] as const

export function resolveEngvoXaiLanguageHint(params: {
  kind: EngvoVoiceSessionKind
  teacherPhase?: EngvoTeacherPhase | null
}): 'ru' | 'en' {
  if (params.kind !== 'teacher') return 'ru'
  if (params.teacherPhase === 'drill') return 'en'
  return 'ru'
}

export function resolveEngvoXaiVadTurnDetection(params: {
  kind: EngvoVoiceSessionKind
  createResponse: boolean
}): {
  type: 'server_vad'
  threshold: number
  prefix_padding_ms: number
  silence_duration_ms: number
  create_response: boolean
  interrupt_response: false
} {
  const teacher = params.kind === 'teacher'
  return {
    type: 'server_vad',
    threshold: teacher ? ENGVO_XAI_TEACHER_VAD_THRESHOLD : ENGVO_XAI_FREE_CALL_VAD_THRESHOLD,
    prefix_padding_ms: 300,
    silence_duration_ms: teacher
      ? ENGVO_XAI_TEACHER_SILENCE_DURATION_MS
      : ENGVO_XAI_FREE_CALL_SILENCE_DURATION_MS,
    create_response: params.createResponse,
    interrupt_response: false,
  }
}

/** Debounce before barge-in cancel. OpenAI callers should keep using ENGVO_INTERRUPT_DEBOUNCE_MS. */
export function getEngvoXaiInterruptDebounceMs(kind: EngvoVoiceSessionKind): number {
  return kind === 'teacher' ? ENGVO_XAI_TEACHER_INTERRUPT_DEBOUNCE_MS : ENGVO_INTERRUPT_DEBOUNCE_MS
}

export function appendEngvoXaiUnclearAudioRule(instructions: string): string {
  const base = instructions.trim()
  if (!base) return ENGVO_XAI_UNCLEAR_AUDIO_APPENDIX
  if (base.includes('Unclear-audio policy (xAI):')) return base
  return `${base} ${ENGVO_XAI_UNCLEAR_AUDIO_APPENDIX}`
}

/**
 * Allow updating last user bubble only when next is near-equal or a prefix extension of prev.
 * Reject unrelated rewrites (Grok partial→unrelated final).
 */
export function shouldReplaceEngvoUserTranscript(prev: string, next: string): boolean {
  const a = normalizeEngvoUserTranscriptForCompare(prev)
  const b = normalizeEngvoUserTranscriptForCompare(next)
  if (!a || !b) return false
  if (a === b) return true
  if (b.startsWith(a) || a.startsWith(b)) return true
  return false
}

export function buildEngvoTeacherKeyterms(params: {
  canonicalEnglish?: string | null
}): string[] {
  const terms: string[] = []
  const seen = new Set<string>()
  const push = (raw: string) => {
    const t = raw.trim()
    if (!t || t.length > 50) return
    const key = t.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    terms.push(t)
  }

  const canonical = params.canonicalEnglish?.trim()
  if (canonical) {
    push(canonical)
    for (const word of canonical.split(/\s+/)) {
      const cleaned = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
      if (cleaned.length >= 2) push(cleaned)
      if (terms.length >= 15) break
    }
  }

  for (const helper of ENGVO_XAI_KEYTERM_HELPERS) {
    if (terms.length >= 15) break
    push(helper)
  }

  return terms.slice(0, 15)
}
