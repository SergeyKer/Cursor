import { describe, expect, it } from 'vitest'
import {
  resolveVocabSpeakCommit,
  resolveVocabSpeakInputMode,
  vocabSpeakFooterHint,
  vocabSpeakMicTitle,
} from '@/lib/vocabulary/vocabSpeakComposer'

describe('vocabSpeakComposer', () => {
  it('uses communication dictation copy, not listen-repeat cues', () => {
    expect(vocabSpeakFooterHint('child')).toBe('Голосовой ввод.')
    expect(vocabSpeakFooterHint('adult')).toBe('Голосовой ввод.')
    expect(vocabSpeakMicTitle(false, false)).toBe('Голосовой ввод')
    expect(vocabSpeakMicTitle(true, false)).toBe('Остановить')
    expect(vocabSpeakMicTitle(false, true)).toBe('Распознаю речь')
  })

  it('locks field until edit unlock', () => {
    expect(resolveVocabSpeakInputMode({ isTextEditUnlocked: false, voiceListening: false })).toBe(
      'voiceLocked'
    )
    expect(resolveVocabSpeakInputMode({ isTextEditUnlocked: true, voiceListening: false })).toBe(
      'editable'
    )
  })
})

describe('resolveVocabSpeakCommit soft-advance', () => {
  it('always advances; credits speak only on match for speak_en', () => {
    expect(
      resolveVocabSpeakCommit({ matched: true, step: 'speak_en', checkPassed: true })
    ).toEqual({ advance: true, speakPassed: true })
    expect(
      resolveVocabSpeakCommit({ matched: false, step: 'speak_en', checkPassed: true })
    ).toEqual({ advance: true, speakPassed: undefined })
  })

  it('credits phrase only on match', () => {
    expect(
      resolveVocabSpeakCommit({ matched: true, step: 'say_phrase', checkPassed: false })
    ).toEqual({ advance: true, phrasePassed: true })
    expect(
      resolveVocabSpeakCommit({ matched: false, step: 'say_phrase', checkPassed: false })
    ).toEqual({ advance: true, phrasePassed: undefined })
  })

  it('check_fail_say match only banks speak if check already passed', () => {
    expect(
      resolveVocabSpeakCommit({ matched: true, step: 'check_fail_say', checkPassed: false })
    ).toEqual({ advance: true, speakPassed: false })
    expect(
      resolveVocabSpeakCommit({ matched: true, step: 'check_fail_say', checkPassed: true })
    ).toEqual({ advance: true, speakPassed: true })
  })
})
