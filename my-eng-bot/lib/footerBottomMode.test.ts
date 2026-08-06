import { describe, expect, it } from 'vitest'
import { resolveFooterBottomMode } from '@/lib/footerBottomMode'

describe('resolveFooterBottomMode', () => {
  it('prefers lesson segments over sessionMeter', () => {
    expect(
      resolveFooterBottomMode({
        lessonFooterSegments: [{ kind: 'xp' }, { kind: 'medal' }],
        sessionMeter: { target: 8 },
        staticText: 'a | b',
      })
    ).toBe('lesson')
  })

  it('uses sessionMeter when segments are missing', () => {
    expect(
      resolveFooterBottomMode({
        lessonFooterSegments: null,
        sessionMeter: { target: 8 },
        staticText: 'a | b',
      })
    ).toBe('sessionMeter')
  })

  it('treats target <= 0 as no sessionMeter', () => {
    expect(
      resolveFooterBottomMode({
        lessonFooterSegments: null,
        sessionMeter: { target: 0 },
        staticText: 'Теория | 0 XP',
      })
    ).toBe('static')
  })

  it('treats empty segments as no lesson mode', () => {
    expect(
      resolveFooterBottomMode({
        lessonFooterSegments: [],
        sessionMeter: { target: 8 },
        staticText: null,
      })
    ).toBe('sessionMeter')
  })

  it('falls back to static then empty', () => {
    expect(
      resolveFooterBottomMode({
        lessonFooterSegments: null,
        sessionMeter: null,
        staticText: 'Шаг 1/7',
      })
    ).toBe('static')
    expect(
      resolveFooterBottomMode({
        lessonFooterSegments: null,
        sessionMeter: null,
        staticText: '   ',
      })
    ).toBe('empty')
  })
})
