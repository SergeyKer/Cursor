import { truncateLanguageNoteInput, canShowLanguageNoteInfo } from '@/lib/languageNote/eligibility'
import type { LanguageNote, LanguageNoteMode } from '@/lib/languageNote/types'
import type { Audience, CommunicationVoiceInputMode } from '@/lib/types'
import { featureFlags } from '@/lib/featureFlags'
import { hashUtterance } from '@/lib/learningMemory/hash'
import { shouldSaveLanguageNoteSignal } from '@/lib/learningMemory/filter'
import { listLearningSignals } from '@/lib/learningMemory/storage'
import { recordSilentAssessSignal } from '@/lib/learningMemory/record'

const SILENT_TIMEOUT_MS = 10_000

type NoteProvider = 'openrouter' | 'openai'

export type SilentAssessParams = {
  text: string
  provider: NoteProvider
  openAiChatPreset?: string
  audience: Audience
  mode: LanguageNoteMode
  source: 'chat' | 'call'
  communicationVoiceInputMode?: CommunicationVoiceInputMode | null
  recentAssistantText?: string | null
  signal?: AbortSignal
  /** Skip if this utterance was already assessed / noted. */
  skipIfHashKnown?: boolean
  /**
   * Optional callback after a saveable note (needs_fix + same gates as memory).
   * Invoked only when !aborted — for call-review session buffer.
   */
  onNote?: (note: LanguageNote) => void
}

export type SilentAssessResult =
  | { ok: true; note: LanguageNote; skipped?: false }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; error: string; aborted?: boolean }

/**
 * One-shot Language Note fetch for silent memory. No retries, short timeout.
 * Never throw — callers fire-and-forget.
 */
export async function requestSilentLanguageNote(
  params: SilentAssessParams
): Promise<SilentAssessResult> {
  if (!featureFlags.silentAssessV1) {
    return { ok: false, skipped: true, reason: 'flag_off' }
  }

  const trimmed = truncateLanguageNoteInput(params.text)
  if (!trimmed || !canShowLanguageNoteInfo(trimmed, { voiceMode: params.communicationVoiceInputMode })) {
    return { ok: false, skipped: true, reason: 'ineligible' }
  }

  const utteranceHash = hashUtterance(trimmed)
  if (params.skipIfHashKnown !== false) {
    const known = listLearningSignals().some((s) => s.utteranceHash === utteranceHash)
    if (known) return { ok: false, skipped: true, reason: 'hash_known' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SILENT_TIMEOUT_MS)
  const onExternalAbort = () => controller.abort()
  params.signal?.addEventListener('abort', onExternalAbort)

  try {
    const res = await fetch('/api/language-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: trimmed,
        provider: params.provider,
        openAiChatPreset: params.openAiChatPreset,
        audience: params.audience,
        mode: params.mode,
        communicationVoiceInputMode: params.communicationVoiceInputMode ?? null,
        recentAssistantText: params.recentAssistantText ?? null,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    let data: { note?: LanguageNote; error?: string }
    try {
      data = (await res.json()) as { note?: LanguageNote; error?: string }
    } catch {
      return { ok: false, error: 'bad_json' }
    }
    if (!res.ok || !data.note) {
      return { ok: false, error: data.error || 'upstream' }
    }
    return { ok: true, note: data.note }
  } catch (e) {
    clearTimeout(timeoutId)
    const aborted =
      (e instanceof Error && e.name === 'AbortError') || Boolean(params.signal?.aborted)
    return { ok: false, error: aborted ? 'aborted' : 'network', aborted }
  } finally {
    params.signal?.removeEventListener('abort', onExternalAbort)
  }
}

let inFlightAbort: AbortController | null = null

/** Fire-and-forget silent assess. Max 1 in-flight; new call aborts previous. */
export function scheduleSilentAssess(params: Omit<SilentAssessParams, 'signal'>): void {
  if (typeof window === 'undefined') return
  if (!featureFlags.silentAssessV1) return

  try {
    inFlightAbort?.abort()
  } catch {
    /* ignore */
  }
  const controller = new AbortController()
  inFlightAbort = controller

  void (async () => {
    try {
      const result = await requestSilentLanguageNote({ ...params, signal: controller.signal })
      if (!result.ok || !('note' in result) || !result.note) return
      if (controller.signal.aborted) return
      const note = result.note
      recordSilentAssessSignal({
        note,
        source: params.source,
        voiceMode: params.communicationVoiceInputMode,
      })
      if (
        params.onNote &&
        shouldSaveLanguageNoteSignal(note.status, note.original, params.communicationVoiceInputMode)
      ) {
        try {
          params.onNote(note)
        } catch {
          /* never break UX */
        }
      }
    } catch {
      /* never break UX */
    } finally {
      if (inFlightAbort === controller) inFlightAbort = null
    }
  })()
}

export function abortSilentAssessInFlight(): void {
  try {
    inFlightAbort?.abort()
  } catch {
    /* ignore */
  }
  inFlightAbort = null
}

/** Test helper: timeout constant. */
export const SILENT_ASSESS_TIMEOUT_MS = SILENT_TIMEOUT_MS
