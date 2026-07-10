import { describe, expect, it } from 'vitest'
import { mergePromptParts, normalizePracticeEmDashes } from '@/lib/practice/prompt/promptSourceUtils'

describe('normalizePracticeEmDashes', () => {
  it('replaces em and en dashes with hyphen', () => {
    expect(normalizePracticeEmDashes('Своими словами — проверим')).toBe('Своими словами - проверим')
    expect(normalizePracticeEmDashes('на знакомстве – Я инженер')).toBe('на знакомстве - Я инженер')
  })

  it('normalizes dashes inside mergePromptParts', () => {
    expect(mergePromptParts(['Ситуация: на знакомстве — Я инженер.', 'Напишите о себе.'])).toBe(
      'Ситуация: на знакомстве - Я инженер. Напишите о себе.'
    )
  })
})
