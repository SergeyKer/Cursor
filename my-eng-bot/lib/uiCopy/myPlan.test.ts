import { describe, expect, it } from 'vitest'
import {
  myPlanButton,
  myPlanCopy,
  myPlanLevelLine,
  myPlanStreakLine,
  myPlanTimeLabel,
  myPlanWhy,
} from '@/lib/uiCopy/myPlan'

describe('myPlan copy dictionary', () => {
  it('child sections are short', () => {
    const c = myPlanCopy('child')
    expect(c.sectionNow).toBe('Сейчас')
    expect(c.statusLink).toContain('сделал')
    expect(c.emptyCta).toBe('К урокам')
  })

  it('why is one short phrase', () => {
    expect(myPlanWhy('incomplete', 'child').includes('\n')).toBe(false)
    expect(myPlanWhy('reinforce', 'adult')).toMatch(/ошиб/)
  })

  it('buttons differ by audience', () => {
    expect(myPlanButton('incomplete', 'child')).toBe('Продолжить')
    expect(myPlanButton('incomplete', 'adult')).toBe('Продолжить урок')
  })

  it('time unknown is null', () => {
    expect(myPlanTimeLabel('unknown', 'child')).toBeNull()
    expect(myPlanTimeLabel('short', 'child')).toBe('Коротко')
  })

  it('status lines', () => {
    expect(myPlanStreakLine(5, 'child')).toContain('5')
    expect(myPlanLevelLine(3, 120, 'adult')).toContain('XP')
  })
})
