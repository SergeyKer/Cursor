import type { RawData } from 'ws'
import type WebSocket from 'ws'

export type WebSocketData = RawData

type UpgradeHandler = (ws: WebSocket) => void | Promise<void>

function loadUpgradeWebSocket():
  | ((handler: UpgradeHandler) => Response | Promise<Response>)
  | null {
  const candidates = ['@vercel/functions/websocket', '@vercel/functions']
  for (const name of candidates) {
    try {
      const mod = require(name) as {
        experimental_upgradeWebSocket?: (handler: UpgradeHandler) => Response | Promise<Response>
      }
      if (typeof mod.experimental_upgradeWebSocket === 'function') {
        return mod.experimental_upgradeWebSocket
      }
    } catch {
      // try next candidate
    }
  }
  return null
}

/** Vercel WebSocket upgrade (requires @vercel/functions >= 3.x at runtime). */
export async function experimental_upgradeWebSocket(handler: UpgradeHandler): Promise<Response> {
  const upgrade = loadUpgradeWebSocket()
  if (!upgrade) {
    return new Response('WebSocket relay is unavailable in this runtime', { status: 501 })
  }
  return await upgrade(handler)
}
