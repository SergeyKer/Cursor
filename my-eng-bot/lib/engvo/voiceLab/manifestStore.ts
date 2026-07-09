import fs from 'node:fs'
import path from 'node:path'
import {
  isEngvoCustomVoiceIdFormat,
  listEngvoCustomVoices,
  type EngvoCustomVoiceEntry,
  type EngvoCustomVoicesManifest,
} from '@/lib/engvo/voiceLab/customVoicesManifest'

const MANIFEST_REL = path.join('data', 'engvo-custom-voices.json')

export function getCustomVoicesManifestPath(): string {
  return path.join(process.cwd(), MANIFEST_REL)
}

export function canWriteCustomVoicesManifest(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ENGVO_VOICE_LAB_ALLOW_FS_WRITE === 'true'
}

export function readCustomVoicesManifestFile(): EngvoCustomVoicesManifest {
  try {
    const raw = fs.readFileSync(getCustomVoicesManifestPath(), 'utf8')
    const parsed = JSON.parse(raw) as EngvoCustomVoicesManifest
    if (!parsed || !Array.isArray(parsed.voices)) return { voices: [] }
    return {
      voices: parsed.voices.filter(
        (v) =>
          v &&
          typeof v.voiceId === 'string' &&
          typeof v.name === 'string' &&
          isEngvoCustomVoiceIdFormat(v.voiceId)
      ),
    }
  } catch {
    return { voices: [...listEngvoCustomVoices()] }
  }
}

export function upsertCustomVoiceInManifest(entry: EngvoCustomVoiceEntry): {
  wrote: boolean
  voices: EngvoCustomVoiceEntry[]
} {
  const current = readCustomVoicesManifestFile()
  const nextVoices = [...current.voices.filter((v) => v.voiceId !== entry.voiceId), entry]
  const wrote = writeCustomVoicesManifest({ voices: nextVoices })
  return { wrote, voices: nextVoices }
}

export function removeCustomVoiceFromManifest(voiceId: string): {
  wrote: boolean
  voices: EngvoCustomVoiceEntry[]
} {
  const current = readCustomVoicesManifestFile()
  const nextVoices = current.voices.filter((v) => v.voiceId !== voiceId)
  const wrote = writeCustomVoicesManifest({ voices: nextVoices })
  return { wrote, voices: nextVoices }
}

function writeCustomVoicesManifest(manifest: EngvoCustomVoicesManifest): boolean {
  if (!canWriteCustomVoicesManifest()) return false
  try {
    const filePath = getCustomVoicesManifestPath()
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    return true
  } catch {
    return false
  }
}
