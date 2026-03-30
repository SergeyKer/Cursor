import { NextRequest, NextResponse } from 'next/server'
import { SttError, transcribeWithOpenAI } from '@/lib/stt'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const audio = form.get('audio')
    const rawLang = (form.get('lang') ?? '').toString().trim()
    const language =
      rawLang === '' || rawLang.toLowerCase() === 'auto' ? undefined : rawLang

    if (!(audio instanceof Blob)) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    if (audio.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio is too large' }, { status: 413 })
    }

    const text = await transcribeWithOpenAI({
      audioBlob: audio,
      fileName: audio instanceof File && audio.name ? audio.name : 'speech.webm',
      ...(language != null ? { language } : {}),
    })

    return NextResponse.json({ text })
  } catch (e) {
    if (e instanceof SttError) {
      const safeError =
        e.code === 'missing_key'
          ? 'STT is not configured on server'
          : e.code === 'timeout'
            ? 'Speech recognition timed out'
            : 'Speech recognition failed'
      return NextResponse.json({ error: safeError }, { status: e.status })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
