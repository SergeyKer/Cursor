/** Shared TTL for footer reward / streak-applied celebrate lines. */
export const REWARD_FOOTER_TICKER_TTL_MS = 35_000

export function isRewardFooterTickerActive(params: {
  rewardAt: string | null | undefined
  nowMs?: number
  suppressBeforeMs?: number | null
}): boolean {
  if (!params.rewardAt) return false
  const timestamp = new Date(params.rewardAt).getTime()
  if (Number.isNaN(timestamp)) return false
  const nowMs = params.nowMs ?? Date.now()
  if (nowMs - timestamp > REWARD_FOOTER_TICKER_TTL_MS) return false
  const suppressBeforeMs = params.suppressBeforeMs
  if (typeof suppressBeforeMs === 'number' && timestamp <= suppressBeforeMs) return false
  return true
}

/** Ms until ticker should expire, or null if already inactive. */
export function msUntilRewardFooterTickerExpires(params: {
  rewardAt: string | null | undefined
  nowMs?: number
  suppressBeforeMs?: number | null
}): number | null {
  if (!isRewardFooterTickerActive(params)) return null
  const timestamp = new Date(params.rewardAt!).getTime()
  const nowMs = params.nowMs ?? Date.now()
  return Math.max(0, REWARD_FOOTER_TICKER_TTL_MS - (nowMs - timestamp))
}
