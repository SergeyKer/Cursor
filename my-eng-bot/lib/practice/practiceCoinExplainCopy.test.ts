import { describe, expect, it } from 'vitest'
import {
  buildChallengeBriefingCoinLine,
  buildNonChallengeNoCoinsLine,
  buildPracticeModeEconomyBlurb,
  canShowChallengeBriefingCoinLine,
} from '@/lib/practice/practiceCoinExplainCopy'

const base = {
  tier: 2 as const,
  ringCount: 0,
  lastQualifyingDayKey: null as string | null,
  todayKey: '2026-08-08',
  pendingPracticeCoins: 0,
  pendingCup: false,
  audience: 'adult' as const,
  cupsEnabled: true,
}

describe('buildPracticeModeEconomyBlurb', () => {
  it('states no coins for relaxed balanced reference', () => {
    expect(buildPracticeModeEconomyBlurb('relaxed')).toMatch(/монет/)
    expect(buildPracticeModeEconomyBlurb('relaxed')).toMatch(/нет/)
    expect(buildPracticeModeEconomyBlurb('balanced')).toMatch(/Монет и кубка нет/)
    expect(buildPracticeModeEconomyBlurb('reference')).toMatch(/монетам не ведёт/)
  })

  it('mentions 3rd and 5th for challenge; cups optional', () => {
    const withCups = buildPracticeModeEconomyBlurb('challenge', { cupsEnabled: true })
    expect(withCups).toContain('3-й')
    expect(withCups).toContain('5-й')
    expect(withCups).toContain('кубок')
    expect(withCups).toContain('золото')

    const noCups = buildPracticeModeEconomyBlurb('challenge', { cupsEnabled: false })
    expect(noCups).toContain('3-й')
    expect(noCups).not.toContain('кубок')
  })
})

describe('buildNonChallengeNoCoinsLine', () => {
  it('points relaxed and balanced to Challenge', () => {
    expect(buildNonChallengeNoCoinsLine('relaxed', 'adult')).toContain('Челлендж')
    expect(buildNonChallengeNoCoinsLine('balanced', 'adult')).toContain('Челлендж')
    expect(buildNonChallengeNoCoinsLine('reference', 'adult')).toContain('Без монет')
  })
})

describe('canShowChallengeBriefingCoinLine', () => {
  it('blocks tier0 day-lock and full rings', () => {
    expect(canShowChallengeBriefingCoinLine({ ...base, tier: 0 })).toBe(false)
    expect(
      canShowChallengeBriefingCoinLine({
        ...base,
        lastQualifyingDayKey: base.todayKey,
      })
    ).toBe(false)
    expect(canShowChallengeBriefingCoinLine({ ...base, ringCount: 5 })).toBe(false)
    expect(canShowChallengeBriefingCoinLine(base)).toBe(true)
  })
})

describe('buildChallengeBriefingCoinLine', () => {
  it('returns null when ring not available today', () => {
    expect(buildChallengeBriefingCoinLine({ ...base, tier: 0 })).toBeNull()
    expect(
      buildChallengeBriefingCoinLine({
        ...base,
        lastQualifyingDayKey: base.todayKey,
      })
    ).toBeNull()
  })

  it('prefers pending over ladder', () => {
    const line = buildChallengeBriefingCoinLine({
      ...base,
      pendingPracticeCoins: 1,
      ringCount: 2,
    })
    expect(line).toContain('ждут')
    expect(line).not.toContain('+1')
  })

  it('tier1 never promises immediate coins', () => {
    const line = buildChallengeBriefingCoinLine({ ...base, tier: 1, ringCount: 2 })
    expect(line).toContain('после золота')
    expect(line).not.toContain('+1 монета')
  })

  it('tier2 ladder by ring count', () => {
    expect(buildChallengeBriefingCoinLine({ ...base, ringCount: 0 })).toContain('3-й зачёт +1')
    expect(buildChallengeBriefingCoinLine({ ...base, ringCount: 1 })).toContain('3-й зачёт +1')

    const at2 = buildChallengeBriefingCoinLine({ ...base, ringCount: 2 })
    expect(at2).toContain('Если 11/12')
    expect(at2).toContain('+1')

    const at3 = buildChallengeBriefingCoinLine({ ...base, ringCount: 3 })
    expect(at3).toContain('ещё 2 зачёта')
    expect(at3).not.toMatch(/Если 11\/12 — \+2/)

    const at4Cups = buildChallengeBriefingCoinLine({ ...base, ringCount: 4, cupsEnabled: true })
    expect(at4Cups).toContain('Если 11/12')
    expect(at4Cups).toContain('+2')
    expect(at4Cups).toContain('кубок')

    const at4NoCups = buildChallengeBriefingCoinLine({
      ...base,
      ringCount: 4,
      cupsEnabled: false,
    })
    expect(at4NoCups).toContain('+2')
    expect(at4NoCups).not.toContain('кубок')
  })
})
