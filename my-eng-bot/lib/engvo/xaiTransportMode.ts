export type EngvoXaiTransportMode = 'relay' | 'direct'

/** Relay needs Vercel WebSocket upgrade; plain next dev on localhost uses direct+token. */
export function resolveEngvoXaiTransportMode(
  locationLike?: Pick<Location, 'hostname'>
): EngvoXaiTransportMode {
  const flag = process.env.NEXT_PUBLIC_ENGVO_XAI_TRANSPORT?.trim().toLowerCase()
  if (flag === 'relay') return 'relay'
  if (flag === 'direct') return 'direct'

  const hostname =
    locationLike?.hostname ??
    (typeof window !== 'undefined' ? window.location.hostname : '')
  const isLocal =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  return isLocal ? 'direct' : 'relay'
}
