import { describe, expect, it } from 'vitest'
import { buildLearnerSnapshot } from '@/lib/adaptiveRetention/learnerSnapshot'
import type { Settings } from '@/lib/types'

const settings: Settings = {
  provider: 'openai',
  openAiChatPreset: 'gpt-4o-mini',
  mode: 'dialogue',
  sentenceType: 'mixed',
  topic: 'free_talk',
  level: 'a1',
  tenses: ['present_simple'],
  audience: 'adult',
  voiceId: '',
  communicationInputExpectedLang: 'en',
}

describe('buildLearnerSnapshot', () => {
  it('returns a safe empty snapshot without browser storage', () => {
    const snapshot = buildLearnerSnapshot(settings, 1000)

    expect(snapshot.audience).toBe('adult')
    expect(snapshot.segment).toBe('adult')
    expect(snapshot.hasAnyHistory).toBe(false)
    expect(snapshot.vocabulary.dueWordCount).toBe(0)
  })
})
