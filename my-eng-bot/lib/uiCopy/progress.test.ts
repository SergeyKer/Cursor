import { describe, expect, it } from 'vitest'
import {
  PROGRESS_CHILD_BANNED_HERO_TERMS,
  formatAttentionZoneMeta,
  progressCopy,
  progressOpportunityReason,
  ruRazWord,
} from '@/lib/uiCopy/progress'

describe('progress copy', () => {
  it('child hero labels avoid banned jargon and Premium', () => {
    const c = progressCopy('child')
    const heroBlob = [
      c.awardsTitle,
      c.showShelf,
      c.todayTitle,
      c.aiTitle,
      c.dialogueCorrect,
      c.usageLabel,
      c.premiumCue,
      c.nearRewardTitle,
      c.emptyTitle,
      c.emptyBody,
      c.toMyPlan,
      c.streakShort,
      c.levelShort,
      c.xpShort,
      c.currentLevelLabel,
      c.saveStreak,
      c.weakZonesTitle,
      c.weakZonesCta,
      c.modesTranslation,
      c.modesDialogue,
      c.modesVocabulary,
      c.modesTutor,
      c.modesPronunciation,
      c.ritualTitle,
      c.ritualDailySoon,
      c.ritualStreakSoon,
      c.ritualRubySoon,
      c.ritualMilestonesSoon,
      c.ritualLaterTail,
      c.balanceRubySoon,
      c.balanceDiamondSoon,
    ].join(' ')
    for (const term of PROGRESS_CHILD_BANNED_HERO_TERMS) {
      expect(heroBlob.toLowerCase()).not.toContain(term.toLowerCase())
    }
  })

  it('adult premium cue mentions Premium', () => {
    expect(progressCopy('adult').premiumCue).toContain('Premium')
  })

  it('opportunity reasons stay child-friendly', () => {
    const line = progressOpportunityReason('gold_ring', 'child', true)
    expect(line.toLowerCase()).not.toContain('11/12')
    expect(line.toLowerCase()).not.toContain('путь')
    expect(line).toMatch(/кубок/i)
  })

  it('gold_ring without cups has no slogan path', () => {
    expect(progressOpportunityReason('gold_ring', 'adult', false).toLowerCase()).not.toContain('путь')
    expect(progressOpportunityReason('gold_ring', 'child', false).toLowerCase()).not.toContain('путь')
  })

  it('link to my plan exists', () => {
    expect(progressCopy('child').toMyPlan).toContain('сейчас')
  })

  it('weak zones cta is an action not a plan label', () => {
    expect(progressCopy('child').weakZonesTitle).toBe('Тут путаешься')
    expect(progressCopy('child').weakZonesCta).toBe('Исправить')
    expect(progressCopy('adult').weakZonesCta).toBe('К заданиям')
  })

  it('ruRazWord plural forms', () => {
    expect(ruRazWord(1)).toBe('раз')
    expect(ruRazWord(2)).toBe('раза')
    expect(ruRazWord(5)).toBe('раз')
    expect(ruRazWord(11)).toBe('раз')
    expect(ruRazWord(21)).toBe('раз')
    expect(ruRazWord(22)).toBe('раза')
  })

  it('ritual stubs have no fake 0/7 counters', () => {
    for (const audience of ['child', 'adult'] as const) {
      const c = progressCopy(audience)
      const blob = [c.ritualDailySoon, c.ritualStreakSoon, c.ritualRubySoon, c.ritualMilestonesSoon].join(' ')
      expect(blob).not.toMatch(/0\s*[/из]\s*7/)
      expect(blob.toLowerCase()).not.toContain('закрыт')
    }
  })

  it('formatAttentionZoneMeta joins hint and count', () => {
    expect(formatAttentionZoneMeta('В общении', 1)).toBe('В общении · 1 раз')
    expect(formatAttentionZoneMeta('У репетитора', 4)).toBe('У репетитора · 4 раза')
    expect(formatAttentionZoneMeta('В общении', 0)).toBe('В общении')
  })
})
