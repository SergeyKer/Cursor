import { NextRequest, NextResponse } from 'next/server'
import { experimental_upgradeWebSocket } from '@vercel/functions'
import {
  resolveEngvoXaiTransportModeServer,
  serverHasXaiProxyEnv,
  type EngvoXaiTransportMode,
} from '@/lib/engvo/xaiTransportMode'

export const runtime = 'nodejs'

function hasXaiApiKey(): boolean {
  return Boolean((process.env.XAI_API_KEY ?? '').replace(/^["'\s]+|["'\s]+$/g, ''))
}

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const hostname = host.split(':')[0] || 'localhost'
  const hasServerProxyEnv = serverHasXaiProxyEnv()
  const mode: EngvoXaiTransportMode = resolveEngvoXaiTransportModeServer({
    hostname,
    hasServerProxyEnv,
    envOverride: process.env.NEXT_PUBLIC_ENGVO_XAI_TRANSPORT,
  })

  return NextResponse.json({
    mode,
    hostname,
    hasServerProxyEnv,
    relayUpgradeAvailable: typeof experimental_upgradeWebSocket === 'function',
    hasXaiApiKey: hasXaiApiKey(),
  })
}
