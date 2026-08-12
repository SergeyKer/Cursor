import { concatUint8 } from '@/lib/tts/pcmFrames'

const inflightByKey = new Map<string, Promise<ArrayBuffer>>()

export async function fetchTtsPcmResponse(
  url: string,
  body: { text: string; voice_id: string; speed: number },
  signal: AbortSignal
): Promise<Response> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) {
    throw new Error(`tts ${response.status}`)
  }
  return response
}

export async function readStreamToBuffer(stream: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  const reader = stream.getReader()
  const chunks: Uint8Array<ArrayBufferLike>[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value?.byteLength) chunks.push(value)
  }
  return concatUint8(chunks)
}

export function getPcmInflight(cacheKey: string): Promise<ArrayBuffer> | undefined {
  return inflightByKey.get(cacheKey)
}

export function runPcmInflight(cacheKey: string, load: () => Promise<ArrayBuffer>): Promise<ArrayBuffer> {
  const existing = inflightByKey.get(cacheKey)
  if (existing) return existing
  const pending = load().finally(() => {
    inflightByKey.delete(cacheKey)
  })
  inflightByKey.set(cacheKey, pending)
  return pending
}

export function loadPcmThroughCache(params: {
  cacheKey: string
  getCached: () => ArrayBuffer | null
  setCached: (bytes: ArrayBuffer) => void
  load: () => Promise<ArrayBuffer>
}): Promise<ArrayBuffer> {
  const cached = params.getCached()
  if (cached) return Promise.resolve(cached)
  return runPcmInflight(params.cacheKey, async () => {
    const bytes = await params.load()
    params.setCached(bytes)
    return bytes
  })
}
