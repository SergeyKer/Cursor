/**
 * Simple in-memory IP rate limiter for API routes.
 * Not durable across serverless instances — best-effort abuse brake.
 */

export type IpRateLimitBucket = { count: number; resetAt: number }

export function checkIpRateLimit(params: {
  buckets: Map<string, IpRateLimitBucket>
  ip: string
  windowMs: number
  max: number
  now?: number
}): boolean {
  const now = params.now ?? Date.now()
  const bucket = params.buckets.get(params.ip)
  if (!bucket || now >= bucket.resetAt) {
    params.buckets.set(params.ip, { count: 1, resetAt: now + params.windowMs })
    return true
  }
  if (bucket.count >= params.max) return false
  bucket.count += 1
  return true
}

export function clientIpFromRequest(headers: {
  get(name: string): string | null
}): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
