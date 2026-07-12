import { describe, expect, it } from 'vitest'
import { buildPracticeFinaleSummary } from '@/lib/practice/practiceFinaleCopy'

const base = {
  mode: 'challenge' as const,
  masteryScore: 10,
  effectiveMasteryScore: 10,
  correctedCount: 1,
  plannedLength: 12,
  sessionXp: 75,
  tier: 2 as const,
  globalAmount: 32,
  globalReason: 'new_fingerprint_slot' as const,
  ringCount: 2,
  ringIncremented: false,
  coinsAwarded: 0,
  cupAwarded: 0,
  pendingPracticeCoins: 0,
  pendingCup: false,
  baseBadgeAwarded: false,
  baseBadgeClaimed: false,
  forgivenessUsed: false,
}

describe('buildPracticeFinaleSummary', () => {
  it('leads with first-try mastery and shows a 10/12 near miss', () => {
    const summary = buildPracticeFinaleSummary(base)
    expect(summary.statsLine).toBe('С первой попытки 10/12 · поправили 1')
    expect(summary.starsLine).toContain('75 звёзд')
    expect(summary.levelLine).toContain('+32 к уровню')
    expect(summary.specialLine).toContain('Почти: 10 из 12')
    expect(summary.statsLine).not.toContain('верно')
  })

  it('uses mode-specific special lines', () => {
    expect(
      buildPracticeFinaleSummary({
        ...base,
        mode: 'reference',
        globalAmount: 0,
        globalReason: 'reference_mode',
      }).levelLine
    ).toContain('Эталоне')
    expect(
      buildPracticeFinaleSummary({ ...base, mode: 'relaxed' }).specialLine
    ).toContain('Разминка')
    expect(
      buildPracticeFinaleSummary({
        ...base,
        mode: 'balanced',
        plannedLength: 9,
        masteryScore: 8,
        baseBadgeAwarded: true,
      }).specialLine
    ).toContain('База получена')
  })

  it('prioritizes cup, coins and ring over near-miss copy', () => {
    expect(buildPracticeFinaleSummary({ ...base, cupAwarded: 1 }).specialLine).toContain('Тема сдана')
    expect(buildPracticeFinaleSummary({ ...base, coinsAwarded: 1 }).specialLine).toContain('+1')
    expect(buildPracticeFinaleSummary({ ...base, ringIncremented: true }).specialLine).toContain('Зачёт')
  })
})
