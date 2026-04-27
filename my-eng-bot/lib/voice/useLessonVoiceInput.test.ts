import { describe, expect, it } from 'vitest'
import { getLessonVoiceStatusMessage, shouldLockLessonTextInput } from './useLessonVoiceInput'

describe('useLessonVoiceInput helpers', () => {
  it('keeps lesson text input editable until microphone actually starts listening', () => {
    expect(
      shouldLockLessonTextInput({
        listening: false,
        voicePhase: 'recording',
      })
    ).toBe(false)
  })

  it('locks lesson text input while microphone is listening or finalizing', () => {
    expect(
      shouldLockLessonTextInput({
        listening: true,
        voicePhase: 'recording',
      })
    ).toBe(true)

    expect(
      shouldLockLessonTextInput({
        listening: false,
        voicePhase: 'finalizing',
      })
    ).toBe(true)
  })

  it('shows an explicit listening message for lesson voice input', () => {
    expect(
      getLessonVoiceStatusMessage({
        listening: true,
        voicePhase: 'recording',
        statusMessage: null,
      })
    ).toBe('Голосовой ввод...')
  })

  it('uses a default finalizing message when lesson stt is still resolving', () => {
    expect(
      getLessonVoiceStatusMessage({
        listening: false,
        voicePhase: 'finalizing',
        statusMessage: null,
      })
    ).toBe('Распознаю речь...')
  })

  it('preserves explicit lesson voice errors and hints', () => {
    expect(
      getLessonVoiceStatusMessage({
        listening: false,
        voicePhase: 'error',
        statusMessage: '[Нет доступа к микрофону.]',
      })
    ).toBe('[Нет доступа к микрофону.]')
  })
})
