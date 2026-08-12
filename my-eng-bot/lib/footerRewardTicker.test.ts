import { describe, expect, it } from 'vitest'
import {
  isRewardFooterTickerActive,
  msUntilRewardFooterTickerExpires,
  REWARD_FOOTER_TICKER_TTL_MS,
} from '@/lib/footerRewardTicker'

describe('footerRewardTicker', () => {
  const now = 1_700_000_000_000

  it('is active within TTL', () => {
    const rewardAt = new Date(now - 1_000).toISOString()
    expect(isRewardFooterTickerActive({ rewardAt, nowMs: now })).toBe(true)
  })

  it('expires after TTL', () => {
    const rewardAt = new Date(now - REWARD_FOOTER_TICKER_TTL_MS - 1).toISOString()
    expect(isRewardFooterTickerActive({ rewardAt, nowMs: now })).toBe(false)
  })

  it('suppresses rewards at or before suppressBeforeMs', () => {
    const rewardAt = new Date(now - 5_000).toISOString()
    expect(
      isRewardFooterTickerActive({
        rewardAt,
        nowMs: now,
        suppressBeforeMs: now - 1_000,
      })
    ).toBe(false)
  })

  it('shows newer rewards after suppress', () => {
    const rewardAt = new Date(now - 500).toISOString()
    expect(
      isRewardFooterTickerActive({
        rewardAt,
        nowMs: now,
        suppressBeforeMs: now - 5_000,
      })
    ).toBe(true)
  })

  it('returns null for missing or invalid at', () => {
    expect(isRewardFooterTickerActive({ rewardAt: null, nowMs: now })).toBe(false)
    expect(isRewardFooterTickerActive({ rewardAt: 'not-a-date', nowMs: now })).toBe(false)
  })

  it('msUntilRewardFooterTickerExpires returns remaining ttl', () => {
    const rewardAt = new Date(now - 10_000).toISOString()
    expect(msUntilRewardFooterTickerExpires({ rewardAt, nowMs: now })).toBe(
      REWARD_FOOTER_TICKER_TTL_MS - 10_000
    )
    expect(
      msUntilRewardFooterTickerExpires({
        rewardAt: new Date(now - REWARD_FOOTER_TICKER_TTL_MS - 1).toISOString(),
        nowMs: now,
      })
    ).toBeNull()
  })
})
