import { NextResponse } from 'next/server'

interface AccentVoteRequest {
  templateId?: string
  deviceId?: string
  vote?: 'like' | 'dislike'
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AccentVoteRequest
  const hasRequiredFields = Boolean(body.templateId && body.deviceId && (body.vote === 'like' || body.vote === 'dislike'))

  return NextResponse.json({
    accepted: hasRequiredFields,
    stored: false,
    note: hasRequiredFields
      ? 'Vote contract accepted. Persistent anonymous storage will be enabled with the server catalog.'
      : 'Vote ignored: templateId, deviceId and vote are required.',
  })
}
