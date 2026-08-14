import { describe, expect, it } from 'vitest'
import {
  buildQuizOptions,
  nextStep,
  stepAfterSkippingSpeak,
  stepsForWordCycle,
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
  it('builds lemma cycle without phrase', () => {
    expect(stepsForWordCycle()).toEqual(['reveal_en', 'check', 'produce', 'speak_en', 'done'])
  })

  it('advances and skips speak after fail-say', () => {
    const steps = stepsForWordCycle()
    expect(nextStep(steps, 'reveal_en')).toBe('check')
    expect(nextStep(steps, 'check')).toBe('produce')
    expect(nextStep(steps, 'done')).toBeNull()
    expect(stepAfterSkippingSpeak(steps)).toBe('done')
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
