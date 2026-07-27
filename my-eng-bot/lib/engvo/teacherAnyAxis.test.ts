import { describe, expect, it } from 'vitest'
import { advanceTeacherAnyAxes, resolveTeacherAnyAxes } from './teacherAnyAxis'

describe('teacherAnyAxis', () => {
  it('picks current and different next for A2', () => {
    const axes = resolveTeacherAnyAxes({
      level: 'a2',
      audience: 'adult',
      seed: 's1',
      usedTensesRaw: [],
    })
    expect(axes.current).not.toBe('all')
    expect(axes.next).not.toBe('all')
    expect(axes.usedTenses).toContain(axes.current)
    if (axes.current !== axes.next) {
      expect(axes.next).not.toBe(axes.current)
    }
  })

  it('advance moves previous next to current', () => {
    const first = resolveTeacherAnyAxes({
      level: 'b1',
      audience: 'adult',
      seed: 's2',
      usedTensesRaw: [],
    })
    const advanced = advanceTeacherAnyAxes({
      level: 'b1',
      audience: 'adult',
      usedTenses: first.usedTenses,
      previousNext: first.next,
      seed: 's2|2',
    })
    expect(advanced.current).toBe(first.next)
    expect(advanced.usedTenses).toContain(advanced.current)
  })
})
