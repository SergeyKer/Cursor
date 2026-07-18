import { describe, expect, it } from 'vitest'
import {
  PROGRESS_CHILD_BANNED_HERO_TERMS,
  progressCopy,
  progressOpportunityReason,
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
      c.daysShort,
      c.levelShort,
      c.goalShort,
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
    expect(line).toMatch(/кубок/i)
  })

  it('link to my plan exists', () => {
    expect(progressCopy('child').toMyPlan).toContain('сейчас')
  })
})
