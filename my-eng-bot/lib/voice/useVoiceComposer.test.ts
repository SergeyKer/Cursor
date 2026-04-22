import { describe, expect, it } from 'vitest'
import {
  appendVoiceText,
  buildVoiceDisplayText,
  extractSpeechRecognitionTranscript,
  initialVoiceComposerState,
  voiceComposerReducer,
} from './useVoiceComposer'

describe('useVoiceComposer helpers', () => {
  it('appends spoken text with a boundary space when needed', () => {
    expect(appendVoiceText('Hello', 'world')).toBe('Hello world')
    expect(appendVoiceText('Hello ', 'world')).toBe('Hello world')
    expect(appendVoiceText('', 'world')).toBe('world')
  })

  it('builds display text from draft, final and interim parts', () => {
    expect(
      buildVoiceDisplayText({
        draftBeforeVoiceText: 'I think',
        voiceFinalText: 'we should go',
        voiceInterimText: 'tomorrow',
      })
    ).toBe('I think we should go tomorrow')
  })

  it('extracts final and interim transcript parts from speech results', () => {
    const event = {
      results: [
        { 0: { transcript: 'hello' }, isFinal: true },
        { 0: { transcript: 'world' }, isFinal: false },
      ],
    } as unknown as SpeechRecognitionEvent

    expect(extractSpeechRecognitionTranscript(event)).toEqual({
      finalText: 'hello',
      interimText: 'world',
    })
  })

  it('starts voice input from a clean field and commits only the spoken text', () => {
    const started = voiceComposerReducer(
      {
        ...initialVoiceComposerState,
        draftText: 'Existing draft',
      },
      { type: 'startRecording' }
    )

    expect(started.draftText).toBe('')
    expect(started.draftBeforeVoiceText).toBe('')

    const committed = voiceComposerReducer(started, {
      type: 'commitVoiceText',
      text: 'spoken ending',
    })

    expect(committed.draftText).toBe('spoken ending')
    expect(committed.voicePhase).toBe('idle')
    expect(committed.voiceInterimText).toBe('')
  })

  it('preserves draft text on voice errors', () => {
    const started = voiceComposerReducer(
      {
        ...initialVoiceComposerState,
        draftText: 'Keep me',
      },
      { type: 'startRecording' }
    )

    const failed = voiceComposerReducer(started, {
      type: 'failVoiceSession',
      statusMessage: 'Ошибка распознавания речи.',
    })

    expect(failed.draftText).toBe('Keep me')
    expect(failed.voicePhase).toBe('error')
    expect(failed.statusMessage).toBe('Ошибка распознавания речи.')
  })
})
