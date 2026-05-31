import { describe, expect, it } from 'vitest'
import {
  formatMedalProgressFooterText,
  FROZEN_LESSON_MEDAL_EMOJI,
  MEDAL_TIER_EMOJI,
  medalTierEmoji,
} from '@/lib/medalBadge'

describe('medalTierEmoji', () => {
  it('maps tiers to Unicode place medals', () => {
    expect(medalTierEmoji('gold')).toBe('🥇')
    expect(medalTierEmoji('silver')).toBe('🥈')
    expect(medalTierEmoji('bronze')).toBe('🥉')
  })

  it('exports stable code points', () => {
    expect([...MEDAL_TIER_EMOJI.gold]).toEqual(['🥇'])
    expect([...MEDAL_TIER_EMOJI.silver]).toEqual(['🥈'])
    expect([...MEDAL_TIER_EMOJI.bronze]).toEqual(['🥉'])
  })
})

describe('FROZEN_LESSON_MEDAL_EMOJI', () => {
  it('uses sports medal without place number', () => {
    expect(FROZEN_LESSON_MEDAL_EMOJI).toBe('🏅')
  })
})

describe('formatMedalProgressFooterText', () => {
  it('formats progress label for footer', () => {
    expect(formatMedalProgressFooterText('silver', 46)).toBe('До 🥈: 46%')
    expect(formatMedalProgressFooterText('gold', 12)).toBe('До 🥇: 12%')
  })
})
