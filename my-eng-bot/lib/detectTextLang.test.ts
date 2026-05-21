import { describe, expect, it } from 'vitest'
import { detectTextLang } from '@/lib/detectTextLang'

describe('detectTextLang', () => {
  it('detects English', () => {
    expect(detectTextLang('Hi there! How are you?')).toBe('en')
  })

  it('detects Russian', () => {
    expect(detectTextLang('Привет! Как дела?')).toBe('ru')
  })
})
