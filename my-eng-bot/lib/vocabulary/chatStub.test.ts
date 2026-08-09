import { describe, expect, it } from 'vitest'
import { buildNecessaryWordsChatPrompt } from '@/lib/vocabulary/chatStub'
import type { NecessaryWord } from '@/types/vocabulary'

const sampleWord = (partial: Partial<NecessaryWord> & Pick<NecessaryWord, 'id' | 'en' | 'ru'>): NecessaryWord => ({
  transcription: '',
  source: '',
  tags: [],
  status: 'active',
  primaryWorld: 'home',
  primaryLevel: 'a2',
  primaryVocabularyTopic: 'family',
  ...partial,
})

describe('necessary words chat stub', () => {
  it('builds a focus cue from session words', () => {
    const prompt = buildNecessaryWordsChatPrompt(
      [
        sampleWord({ id: 1, en: 'Home', ru: 'дом' }),
        sampleWord({ id: 2, en: 'Water', ru: 'вода' }),
      ],
      'Дом и семья'
    )

    expect(prompt).toContain('Дом и семья')
    expect(prompt).toContain('Home, Water')
    expect(prompt).toContain('Focus words')
  })
})
