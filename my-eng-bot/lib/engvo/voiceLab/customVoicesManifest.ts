import manifestJson from '@/data/engvo-custom-voices.json'

export type EngvoCustomVoiceEntry = {
  voiceId: string
  name: string
  createdAt?: string
}

export type EngvoCustomVoicesManifest = {
  voices: EngvoCustomVoiceEntry[]
}

const CUSTOM_VOICE_ID_RE = /^[a-z0-9]{8,16}$/

export function isEngvoCustomVoiceIdFormat(value: string): boolean {
  return CUSTOM_VOICE_ID_RE.test(value.trim())
}

function parseEnvOverride(): EngvoCustomVoiceEntry[] {
  const raw = process.env.ENGVO_CUSTOM_VOICES_JSON?.trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as EngvoCustomVoicesManifest | EngvoCustomVoiceEntry[]
    const list = Array.isArray(parsed) ? parsed : parsed.voices
    if (!Array.isArray(list)) return []
    return list.filter(
      (v): v is EngvoCustomVoiceEntry =>
        Boolean(v) &&
        typeof v === 'object' &&
        typeof (v as EngvoCustomVoiceEntry).voiceId === 'string' &&
        typeof (v as EngvoCustomVoiceEntry).name === 'string' &&
        isEngvoCustomVoiceIdFormat((v as EngvoCustomVoiceEntry).voiceId)
    )
  } catch {
    return []
  }
}

function readFileManifest(): EngvoCustomVoiceEntry[] {
  const voices = (manifestJson as EngvoCustomVoicesManifest)?.voices
  if (!Array.isArray(voices)) return []
  return voices.filter(
    (v) =>
      v &&
      typeof v.voiceId === 'string' &&
      typeof v.name === 'string' &&
      isEngvoCustomVoiceIdFormat(v.voiceId)
  )
}

/** Merged list: file manifest + env override (env wins on same voiceId). */
export function listEngvoCustomVoices(): EngvoCustomVoiceEntry[] {
  const fromFile = readFileManifest()
  const fromEnv = parseEnvOverride()
  if (fromEnv.length === 0) return fromFile
  const map = new Map<string, EngvoCustomVoiceEntry>()
  for (const v of fromFile) map.set(v.voiceId, v)
  for (const v of fromEnv) map.set(v.voiceId, v)
  return [...map.values()]
}

export function getEngvoCustomVoiceIds(): readonly string[] {
  return listEngvoCustomVoices().map((v) => v.voiceId)
}

export function isEngvoCustomVoiceId(value: string): boolean {
  const id = value.trim()
  if (!isEngvoCustomVoiceIdFormat(id)) return false
  return getEngvoCustomVoiceIds().includes(id)
}

export function findEngvoCustomVoice(voiceId: string): EngvoCustomVoiceEntry | undefined {
  const id = voiceId.trim()
  return listEngvoCustomVoices().find((v) => v.voiceId === id)
}
