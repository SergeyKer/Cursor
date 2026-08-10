import { describe, expect, it } from 'vitest'
import {
  buildQuizOptions,
  nextStep,
  phraseWordIndex,
  shouldIncludePhrase,
  stepAfterSkippingSpeak,
  stepsForTempo,
} from '@/lib/vocabulary/sessionEngine'
import type { NecessaryWord } from '@/types/vocabulary'

const word = (id: number, en: string, ru: string): NecessaryWord => ({
  id,
  en,
  ru,
  transcription: '',
  source: '',
  tags: [],
  status: 'active',
  primaryWorld: 'home',
  primaryLevel: 'a2',
  primaryVocabularyTopic: 'core',
})

describe('sessionEngine', () => {
  it('builds sprint steps without show_ru', () => {
    expect(stepsForTempo('sprint', false)).toEqual(['reveal_en', 'check', 'produce', 'speak_en', 'done'])
    expect(stepsForTempo('sprint', true)).toEqual([
      'reveal_en',
      'check',
      'produce',
      'speak_en',
      'say_phrase',
      'done',
    ])
  })

  it('builds full steps with show_ru and optional phrase', () => {
    expect(stepsForTempo('full', true)).toEqual([
      'show_ru',
      'reveal_en',
      'check',
      'produce',
      'speak_en',
      'say_phrase',
      'done',
    ])
    expect(stepsForTempo('full', false)).toEqual([
      'show_ru',
      'reveal_en',
      'check',
      'produce',
      'speak_en',
      'done',
    ])
  })

  it('picks middle-ish phrase word index', () => {
    expect(phraseWordIndex(3)).toBe(1)
    expect(phraseWordIndex(5)).toBe(2)
    expect(phraseWordIndex(2)).toBe(0)
  })

  it('advances and skips speak after fail-say', () => {
    const steps = stepsForTempo('sprint', true)
    expect(nextStep(steps, 'reveal_en')).toBe('check')
    expect(nextStep(steps, 'check')).toBe('produce')
    expect(nextStep(steps, 'done')).toBeNull()
    expect(stepAfterSkippingSpeak(steps)).toBe('say_phrase')
  })

  it('includes phrase on every full word and one sprint word', () => {
    expect(shouldIncludePhrase('full', 0, 5)).toBe(true)
    expect(shouldIncludePhrase('sprint', 1, 3)).toBe(true)
    expect(shouldIncludePhrase('sprint', 0, 3)).toBe(false)
  })

  it('builds quiz with correct ru and up to 3 distractors', () => {
    const target = word(1, 'home', 'дом')
    const pool = [target, word(2, 'cat', 'кот'), word(3, 'dog', 'собака'), word(4, 'sun', 'солнце'), word(5, 'moon', 'луна')]
    const options = buildQuizOptions(target, pool)
    expect(options).toHaveLength(4)
    expect(options).toContain('дом')
    expect(new Set(options).size).toBe(4)
  })
})
