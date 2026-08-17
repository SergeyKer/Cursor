import { describe, expect, it } from 'vitest'
import { buildCompactGreeting } from '@/lib/homeGreeting'

describe('buildCompactGreeting', () => {
  it('asks audience before the door', () => {
    const text = buildCompactGreeting({ audienceChosen: false })
    expect(text).toContain('ребёнок или взрослый')
    expect(text).not.toContain('Уроки, Практика')
  })

  it('invites play for child and start for adult', () => {
    expect(buildCompactGreeting({ audienceChosen: true, audience: 'child' })).toContain('Играть')
    expect(buildCompactGreeting({ audienceChosen: true, audience: 'adult' })).toContain('Начать')
  })
})
