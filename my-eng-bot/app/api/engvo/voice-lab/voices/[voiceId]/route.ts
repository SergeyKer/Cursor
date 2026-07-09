import { NextRequest, NextResponse } from 'next/server'
import { isValidVoiceLabPassword } from '@/lib/engvo/voiceLab/gatePassword'
import { isEngvoCustomVoiceIdFormat } from '@/lib/engvo/voiceLab/customVoicesManifest'
import { removeCustomVoiceFromManifest } from '@/lib/engvo/voiceLab/manifestStore'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'

export const runtime = 'nodejs'

function normalizeKey(raw: string): string {
  return raw.replace(/^["'\s]+|["'\s]+$/g, '')
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ voiceId: string }> }
) {
  const password = req.headers.get('x-voice-lab-password')?.trim() ?? ''
  if (!isValidVoiceLabPassword(password)) {
    return NextResponse.json({ error: 'unauthorized', userMessage: 'Неверный пароль.' }, { status: 401 })
  }

  const { voiceId: rawId } = await context.params
  const voiceId = rawId?.trim() ?? ''
  if (!isEngvoCustomVoiceIdFormat(voiceId)) {
    return NextResponse.json({ error: 'invalid_voice_id', userMessage: 'Некорректный voice_id.' }, { status: 400 })
  }

  const key = normalizeKey(process.env.XAI_API_KEY ?? '')
  let xaiDeleted = false
  let xaiStatus: number | null = null
  if (key) {
    const upstream = await fetchWithProxyFallback(`https://api.x.ai/v1/custom-voices/${voiceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${key}` },
    })
    xaiStatus = upstream.status
    xaiDeleted = upstream.ok || upstream.status === 404
  }

  const { wrote, voices } = removeCustomVoiceFromManifest(voiceId)
  return NextResponse.json({
    deleted: true,
    xaiDeleted,
    xaiStatus,
    wroteToDisk: wrote,
    voices,
    manifestSnippet: JSON.stringify({ voices }, null, 2),
    hint: wrote
      ? null
      : 'На production обновите data/engvo-custom-voices.json вручную и задеплойте.',
  })
}
