import { describe, expect, it } from 'vitest'
import {
  diffEnglishFragments,
  ensureTeacherErrorMicroReason,
  hasTeacherErrorFragmentContrast,
  isBareSoftLeadIn,
} from '@/lib/engvo/teacherErrorMicroReason'

describe('teacherErrorMicroReason', () => {
  it('detects paired fragment contrast only', () => {
    expect(hasTeacherErrorFragmentContrast('Почти — так: went — не так: go.')).toBe(true)
    expect(hasTeacherErrorFragmentContrast('Close — so: a cat — not: cat.')).toBe(true)
    expect(hasTeacherErrorFragmentContrast('Close — do not skip this.')).toBe(false)
    expect(hasTeacherErrorFragmentContrast('Чуть иначе.')).toBe(false)
  })

  it('recognizes bare soft lead-ins', () => {
    expect(isBareSoftLeadIn('')).toBe(true)
    expect(isBareSoftLeadIn('Чуть иначе.')).toBe(true)
    expect(isBareSoftLeadIn('Почти')).toBe(true)
    expect(isBareSoftLeadIn('Close —')).toBe(true)
    expect(isBareSoftLeadIn('Почти — здесь went, не go.')).toBe(false)
  })

  it('diffs go vs went as first substitution', () => {
    expect(
      diffEnglishFragments('My family go to sea.', 'My family went to the sea.')
    ).toEqual({ wrong: 'go', right: 'went' })
  })

  it('insertion-aware: missing article yields a cat vs cat', () => {
    expect(diffEnglishFragments('I have cat', 'I have a cat')).toEqual({
      wrong: 'cat',
      right: 'a cat',
    })
  })

  it('patches screenshot bare ERROR and keeps lead-in', () => {
    const raw = 'Чуть иначе.\nСкажи: My family went to the sea.'
    const r = ensureTeacherErrorMicroReason(raw, {
      userText: 'My family go to sea.',
      level: 'a2',
    })
    expect(r.patched).toBe(true)
    expect(r.contrastLine).toBe('так: went — не так: go')
    expect(r.text).toContain('Чуть иначе — так: went — не так: go.')
    expect(r.text).toContain('Скажи: My family went to the sea.')
    expect(r.text).not.toMatch(/^Почти/m)
  })

  it('no-op when contrast already present', () => {
    const raw = 'Почти — так: a cat — не так: cat.\nСкажи: I have a cat.'
    const r = ensureTeacherErrorMicroReason(raw, {
      userText: 'I have cat',
      level: 'a2',
    })
    expect(r.patched).toBe(false)
    expect(r.text).toBe(raw)
  })

  it('no-op for living reason without markers', () => {
    const raw = 'Почти — здесь went, не go.\nСкажи: My family went to the sea.'
    const r = ensureTeacherErrorMicroReason(raw, {
      userText: 'My family go to sea.',
      level: 'a2',
    })
    expect(r.patched).toBe(false)
  })

  it('no-op for Russian / non-EN attempt', () => {
    const raw = 'Чуть иначе.\nСкажи: I go to the sea.'
    const r = ensureTeacherErrorMicroReason(raw, {
      userText: 'Я еду на море',
      level: 'a2',
    })
    expect(r.patched).toBe(false)
  })

  it('no-op without ERROR marker', () => {
    const r = ensureTeacherErrorMicroReason('Верно. Переведи на английский.', {
      userText: 'I go',
      level: 'a2',
    })
    expect(r.patched).toBe(false)
  })

  it('B1+ uses so/not', () => {
    const raw = 'Close.\nSay: My family went to the sea.'
    const r = ensureTeacherErrorMicroReason(raw, {
      userText: 'My family go to sea.',
      level: 'b1',
    })
    expect(r.patched).toBe(true)
    expect(r.contrastLine).toBe('so: went — not: go')
    expect(r.text).toMatch(/so: went — not: go/)
    expect(r.text).toMatch(/Say:/)
  })

  it('no-op when user already matches canon', () => {
    const raw = 'Чуть иначе.\nСкажи: I go.'
    const r = ensureTeacherErrorMicroReason(raw, {
      userText: 'I go.',
      level: 'a2',
    })
    expect(r.patched).toBe(false)
  })
})
