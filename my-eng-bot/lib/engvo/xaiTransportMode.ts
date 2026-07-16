export type EngvoXaiTransportMode = 'relay' | 'direct'

export function resolveEngvoXaiTransportModeServer(params: {
  hostname: string
  hasServerProxyEnv: boolean
  envOverride?: string | null
}): EngvoXaiTransportMode {
  const flag = params.envOverride?.trim().toLowerCase()
  if (flag === 'relay') return 'relay'
  if (flag === 'direct') return 'direct'

  const hostname = params.hostname.trim().toLowerCase()
  const isLocal =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  if (!isLocal) return 'relay'
  // next dev cannot WebSocket-upgrade relay; token via HTTPS_PROXY uses direct on localhost.
  void params.hasServerProxyEnv
  return 'direct'
}

/** Client fallback when transport-mode API is unavailable. */
export function resolveEngvoXaiTransportMode(
  locationLike?: Pick<Location, 'hostname'>
): EngvoXaiTransportMode {
  return resolveEngvoXaiTransportModeServer({
    hostname:
      locationLike?.hostname ??
      (typeof window !== 'undefined' ? window.location.hostname : ''),
    hasServerProxyEnv: false,
    envOverride: process.env.NEXT_PUBLIC_ENGVO_XAI_TRANSPORT,
  })
}

export function serverHasXaiProxyEnv(): boolean {
  return Boolean(
    process.env.HTTPS_PROXY?.trim() ||
      process.env.https_proxy?.trim() ||
      process.env.HTTP_PROXY?.trim() ||
      process.env.http_proxy?.trim() ||
      process.env.ALL_PROXY?.trim() ||
      process.env.all_proxy?.trim()
  )
}
