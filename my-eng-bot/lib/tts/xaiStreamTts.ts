import WebSocket from 'ws'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { ENGVO_XAI_PCM_SAMPLE_RATE } from '@/lib/engvo/constants'

export const XAI_TTS_WS_BASE = 'wss://api.x.ai/v1/tts'
export const TTS_PCM_SAMPLE_RATE = ENGVO_XAI_PCM_SAMPLE_RATE
export const TTS_PCM_CONTENT_TYPE = `audio/L16;rate=${TTS_PCM_SAMPLE_RATE};channels=1`

export type XaiStreamTtsParams = {
  apiKey: string
  text: string
  voiceId: string
  speed: number
  replace?: Record<string, string>
}

function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const proxy =
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.http_proxy?.trim() ||
    ''
  if (!proxy) return undefined
  return new HttpsProxyAgent(proxy)
}

export function buildXaiTtsWsUrl(voiceId: string, speed: number): string {
  const url = new URL(XAI_TTS_WS_BASE)
  url.searchParams.set('language', 'en')
  url.searchParams.set('voice', voiceId)
  url.searchParams.set('codec', 'pcm')
  url.searchParams.set('sample_rate', String(TTS_PCM_SAMPLE_RATE))
  url.searchParams.set('optimize_streaming_latency', '2')
  url.searchParams.set('speed', String(speed))
  return url.toString()
}

function sendUtterance(ws: WebSocket, text: string): void {
  ws.send(JSON.stringify({ type: 'text.delta', delta: text }))
  ws.send(JSON.stringify({ type: 'text.done' }))
}

/**
 * Bidirectional xAI TTS WebSocket → raw PCM16 LE bytes.
 * Key stays on the server; browser never opens this socket.
 */
export function openXaiTtsPcmStream(params: XaiStreamTtsParams): ReadableStream<Uint8Array> {
  const { apiKey, text, voiceId, speed, replace } = params
  const hasReplace = Boolean(replace && Object.keys(replace).length > 0)

  let finish: (error?: Error) => void = () => {}

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let settled = false
      let utteranceSent = false
      let deltaCount = 0
      let replaceTimer: ReturnType<typeof setTimeout> | undefined
      const agent = getProxyAgent()
      const ws = new WebSocket(buildXaiTtsWsUrl(voiceId, speed), {
        headers: { Authorization: `Bearer ${apiKey}` },
        ...(agent ? { agent } : {}),
      })

      const finishInner = (error?: Error) => {
        if (settled) return
        settled = true
        if (replaceTimer) clearTimeout(replaceTimer)
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close()
          }
        } catch {
          // ignore
        }
        try {
          if (error) controller.error(error)
          else controller.close()
        } catch {
          // ignore
        }
      }

      finish = finishInner

      const beginUtterance = () => {
        if (utteranceSent || settled) return
        utteranceSent = true
        if (replaceTimer) clearTimeout(replaceTimer)
        sendUtterance(ws, text)
      }

      ws.on('open', () => {
        if (hasReplace && replace) {
          ws.send(JSON.stringify({ type: 'session.update', replace }))
          replaceTimer = setTimeout(beginUtterance, 1500)
          return
        }
        beginUtterance()
      })

      ws.on('message', (data) => {
        const raw = typeof data === 'string' ? data : data.toString()
        let msg: { type?: string; delta?: unknown; error?: unknown; message?: unknown }
        try {
          msg = JSON.parse(raw) as { type?: string; delta?: unknown; error?: unknown; message?: unknown }
        } catch {
          return
        }
        if (msg.type === 'session.updated') {
          beginUtterance()
          return
        }
        if (msg.type === 'audio.delta' && typeof msg.delta === 'string') {
          deltaCount += 1
          controller.enqueue(new Uint8Array(Buffer.from(msg.delta, 'base64')))
          return
        }
        if (msg.type === 'audio.done') {
          finish()
          return
        }
        if (msg.type === 'error') {
          const detail =
            typeof msg.message === 'string'
              ? msg.message
              : typeof msg.error === 'string'
                ? msg.error
                : 'xAI TTS websocket error'
          const err = new Error(detail)
          ;(err as Error & { status?: number }).status = 502
          finish(err)
        }
      })

      ws.on('error', (error) => {
        const err = error instanceof Error ? error : new Error('xAI TTS websocket failed')
        ;(err as Error & { status?: number }).status = 502
        finish(err)
      })

      ws.on('close', () => {
        finish(utteranceSent && deltaCount === 0 ? new Error('xAI TTS empty audio') : undefined)
      })
    },
    cancel() {
      finish()
    },
  })
}
