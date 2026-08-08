import { describe, expect, it } from 'vitest'
import {
  APP_BTN_TERTIARY_BACK,
  APP_BTN_TERTIARY_BACK_SKIN,
  BLUE_CTA_TEXT,
  BLUE_SECONDARY_SKIN,
  PAGE_HOME_BACK_TO_AUDIENCE_BUTTON_CLASS,
} from '@/lib/homeCtaStyles'

/** Frozen snapshots — accidental tertiary/home-back accent drift must fail. */
const BLUE_CTA_TEXT_FROZEN = 'text-[#2563eb]'
const BLUE_SECONDARY_SKIN_FROZEN =
  'border border-[#3b82f6] bg-gradient-to-b from-[#60a5fa] to-[#2563eb] text-white hover:brightness-105 active:brightness-95'

describe('homeCtaStyles nav tertiary', () => {
  it('keeps BLUE_CTA_TEXT fixed blue (anti-regression)', () => {
    expect(BLUE_CTA_TEXT).toBe(BLUE_CTA_TEXT_FROZEN)
  })

  it('keeps BLUE_SECONDARY_SKIN unchanged (anti-regression)', () => {
    expect(BLUE_SECONDARY_SKIN).toBe(BLUE_SECONDARY_SKIN_FROZEN)
  })

  it('tertiary back and home back use BLUE_CTA_TEXT, not theme accent', () => {
    expect(APP_BTN_TERTIARY_BACK_SKIN).toContain(BLUE_CTA_TEXT_FROZEN)
    expect(APP_BTN_TERTIARY_BACK_SKIN).not.toContain('text-[var(--accent)]')
    expect(APP_BTN_TERTIARY_BACK).toContain(BLUE_CTA_TEXT_FROZEN)
    expect(APP_BTN_TERTIARY_BACK).not.toContain('text-[var(--accent)]')
    expect(PAGE_HOME_BACK_TO_AUDIENCE_BUTTON_CLASS).toContain(BLUE_CTA_TEXT_FROZEN)
    expect(PAGE_HOME_BACK_TO_AUDIENCE_BUTTON_CLASS).not.toContain('text-[var(--accent)]')
  })
})
