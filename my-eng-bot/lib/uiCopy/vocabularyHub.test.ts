import { describe, expect, it } from 'vitest'
import { vocabDisplayLabel, vocabHubCopy } from '@/lib/uiCopy/vocabularyHub'

describe('vocabHubCopy status labels', () => {
  it('splits adult shelf from CTA', () => {
    const copy = vocabHubCopy('adult')
    expect(copy.inFeedTitle).toBe('Ждут речи')
    expect(copy.say).toBe('Сказать Engvo')
    expect(vocabDisplayLabel('in_feed', 'adult')).toBe('Ждут речи')
  })

  it('keeps child shelf as action', () => {
    const copy = vocabHubCopy('child')
    expect(copy.inFeedTitle).toBe('Скажи Engvo')
    expect(copy.say).toBe('Скажи Engvo')
    expect(vocabDisplayLabel('in_feed', 'child')).toBe('Скажи Engvo')
  })
})
