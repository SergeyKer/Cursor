import { describe, expect, it } from 'vitest'
import { fallbackLessonTopicTranslationSentence } from '@/lib/translationMode'
import { getLessonRuSeeds } from '@/lib/lessonTranslationBridge'

describe('fallbackLessonTopicTranslationSentence', () => {
  it('returns a seed from the lesson pool, not life-topic tea/books', () => {
    const ru = fallbackLessonTopicTranslationSentence({
      lessonId: '4',
      audience: 'adult',
      seedText: 't1',
      sentenceType: 'general',
    })
    expect(getLessonRuSeeds('4').some((s) => ru.startsWith(s.replace(/[.!?…]$/, '')) || s.startsWith(ru.replace(/[.!?…]$/, '')))).toBe(
      true
    )
    expect(ru).not.toMatch(/люблю чай|люблю читать книги/i)
  })

  it('can exclude previous RU', () => {
    const first = fallbackLessonTopicTranslationSentence({
      lessonId: '4',
      audience: 'adult',
      seedText: 'same',
      sentenceType: 'general',
    })
    const second = fallbackLessonTopicTranslationSentence({
      lessonId: '4',
      audience: 'adult',
      seedText: 'same',
      sentenceType: 'general',
      excludeRu: first,
    })
    // Same seedText without exclude would pick same; with exclude and pool>1 should differ
    if (getLessonRuSeeds('4').length > 1) {
      expect(second).not.toBe(first)
    }
  })
})
