import { describe, expect, it } from 'vitest'
import { buildNecessaryWordsChatPrompt } from '@/lib/vocabulary/chatStub'
import type { NecessaryWord } from '@/types/vocabulary'

describe('necessary words chat stub', () => {
  it('builds a prompt preview from session words', () => {
    const words: NecessaryWord[] = [
      {
        id: 1,
        en: 'Home',
        ru: 'дом',
        transcription: '',
        source: '',
        tags: ['home'],
        status: 'active',
        primaryWorld: 'home',
        primaryLevel: 'a2',
        primaryVocabularyTopic: 'family',
      },
      {
        id: 2,
        en: 'Water',
        ru: 'вода',
        transcription: '',
        source: '',
        tags: ['home'],
        status: 'active',
        primaryWorld: 'home',
        primaryLevel: 'a2',
        primaryVocabularyTopic: 'family',
      },
    ]

    const prompt = buildNecessaryWordsChatPrompt(words, 'Дом и семья')

    expect(prompt).toContain('Дом и семья')
    expect(prompt).toContain('Home, Water')
    expect(prompt).toContain('3 очень простые фразы')
  })
})
