import { describe, expect, it } from 'vitest'
import {
  buildLanguageNoteSystemPrompt,
  resolveLanguageNoteCorrectTarget,
} from '@/lib/languageNote/prompt'

describe('languageNote prompt modes', () => {
  it('resolves correct target by mode', () => {
    expect(resolveLanguageNoteCorrectTarget('engvo', null)).toBe('en')
    expect(resolveLanguageNoteCorrectTarget('communication', 'ru')).toBe('ru')
    expect(resolveLanguageNoteCorrectTarget('communication', 'en')).toBe('en')
    expect(resolveLanguageNoteCorrectTarget('communication', 'mix')).toBe('en')
  })

  it('en/mix prompt forces English correct and Russian reasons', () => {
    const prompt = buildLanguageNoteSystemPrompt('adult', {
      mode: 'communication',
      voiceMode: 'mix',
    })
    expect(prompt).toContain('Correct-target language: ENGLISH')
    expect(prompt).toContain('ALWAYS Russian only')
    expect(prompt).toContain('превет как your doings')
    expect(prompt).toContain('Hi! How are you doing?')
    expect(prompt).toContain('Hi! How are you?')
    expect(prompt).toContain('Latinized Russian from TTS')
    expect(prompt).toContain('PREFER filling better')
    expect(prompt).not.toContain('Correct-target language: RUSSIAN')
  })

  it('en/mix prompt requires EN-anchor reviewTopics with RU gloss', () => {
    const prompt = buildLanguageNoteSystemPrompt('adult', {
      mode: 'communication',
      voiceMode: 'mix',
    })
    expect(prompt).toContain('title MUST be "EN-anchor — short RU gloss"')
    expect(prompt).toContain('Forbidden situative-only or category-only titles without EN')
    expect(prompt).toContain('Forbidden school/category labels even with RU gloss')
    expect(prompt).toContain('children + like — без -s')
    expect(prompt).toContain('title max ~56 characters')
    expect(prompt).toContain('How are you? — как дела')
    expect(prompt).toContain('Hello / Hi — приветствие')
    expect(prompt).toContain('I like + -ing — люблю делать')
    expect(prompt).toContain('meat / meet — омофоны')
    expect(prompt).toContain('just + Past — только что')
    expect(prompt).toContain('doing / -ing — сейчас в процессе')
    expect(prompt).not.toContain('title: short Russian chip text')
  })

  it('ru prompt targets Russian correct with Russian reasons', () => {
    const prompt = buildLanguageNoteSystemPrompt('adult', {
      mode: 'communication',
      voiceMode: 'ru',
    })
    expect(prompt).toContain('Correct-target language: RUSSIAN')
    expect(prompt).toContain('ALWAYS Russian only')
    expect(prompt).toContain('Привет! Как дела сегодня?')
    expect(prompt).not.toContain('Correct-target language: ENGLISH')
  })

  it('STT block forbids capitalization reasons and skim-first slots', () => {
    const prompt = buildLanguageNoteSystemPrompt('adult', {
      mode: 'communication',
      voiceMode: 'en',
    })
    expect(prompt).toContain('returns lowercase — that is NOT a learner mistake')
    expect(prompt).toContain('с заглавной / с большой буквы')
    expect(prompt).toContain('Do NOT spend a correctReasons slot on capitalization or punctuation')
    expect(prompt).toContain('Skim-first (messenger tip)')
    expect(prompt).toContain('NEVER turn that into a learner reason')
    expect(prompt).toContain('hello how are you what are you do now')
  })
})
