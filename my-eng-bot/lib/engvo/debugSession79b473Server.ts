const DEBUG_INGEST_URL = 'http://127.0.0.1:7359/ingest/af82526e-4aca-4df7-8f6b-d839f48f8a8e'
const DEBUG_SESSION_ID = '79b473'

export function engvoServerDebugLog(params: {
  location: string
  message: string
  data?: Record<string, unknown>
  hypothesisId: string
  runId?: string
}) {
  const payload = {
    sessionId: DEBUG_SESSION_ID,
    location: params.location,
    message: params.message,
    data: params.data ?? {},
    timestamp: Date.now(),
    hypothesisId: params.hypothesisId,
    runId: params.runId ?? 'pre-fix',
  }
  console.info('[engvo][debug-79b473]', JSON.stringify(payload))
  // #region agent log
  fetch(DEBUG_INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION_ID,
    },
    body: JSON.stringify(payload),
  }).catch(() => {})
  // #endregion
}
