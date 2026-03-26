import { describe, expect, it } from 'vitest'
import { normalizeSttLanguage } from './stt'

describe('stt', () => {
  it('normalizes locale-like language values', () => {
    expect(normalizeSttLanguage('ru-RU')).toBe('ru')
    expect(normalizeSttLanguage('en-US')).toBe('en')
    expect(normalizeSttLanguage('')).toBe('en')
  })
})
