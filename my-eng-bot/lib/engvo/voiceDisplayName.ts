import { isEngvoXaiVoice } from '@/lib/engvo/constants'
import { findEngvoCustomVoice } from '@/lib/engvo/voiceLab/customVoicesManifest'

/** Capitalize built-in voice ids (`eve` → `Eve`); custom voices keep manifest name. */
export function formatEngvoVoiceDisplayName(voiceId: string): string {
  const id = voiceId.trim()
  if (!id) return ''
  const custom = findEngvoCustomVoice(id)
  if (custom?.name?.trim()) return custom.name.trim()
  if (isEngvoXaiVoice(id) || /^[a-z][a-z0-9_-]*$/i.test(id)) {
    return id.charAt(0).toUpperCase() + id.slice(1).toLowerCase()
  }
  return id
}
