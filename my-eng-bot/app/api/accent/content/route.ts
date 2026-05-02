import { NextResponse } from 'next/server'
import { ALL_ACCENT_LESSONS } from '@/lib/accent/staticContent'

interface AccentContentRequest {
  sound?: string
  type?: string
  difficulty?: string
  forceNew?: boolean
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AccentContentRequest
  const sound = typeof body.sound === 'string' ? body.sound.trim().toLowerCase() : ''

  const lessons = sound
    ? ALL_ACCENT_LESSONS.filter((lesson) => {
        const haystack = `${lesson.id} ${lesson.title} ${lesson.shortTitle} ${lesson.targetSound} ${lesson.sectionId}`.toLowerCase()
        return haystack.includes(sound)
      })
    : ALL_ACCENT_LESSONS.slice(0, 12)

  return NextResponse.json({
    source: 'local_catalog',
    generated: false,
    lessons: lessons.length > 0 ? lessons : ALL_ACCENT_LESSONS.slice(0, 12),
    note: body.forceNew
      ? 'AI generation is intentionally disabled until the local trainer is stable.'
      : 'Local catalog response. Pronunciation training never sends audio to this route.',
  })
}
