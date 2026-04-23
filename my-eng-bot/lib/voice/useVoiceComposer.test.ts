import { describe, expect, it } from 'vitest'
import {
  appendVoiceText,
  buildVoiceDisplayText,
  buildVoiceLivePreviewText,
  extractSpeechRecognitionTranscript,
  initialVoiceComposerState,
  voiceComposerReducer,
} from './useVoiceComposer'

function createSpeechRecognitionEvent(
  results: Array<{ transcript: string; isFinal: boolean }>,
  resultIndex = 0
): SpeechRecognitionEvent {
  return {
    resultIndex,
    results: results.map((result) => ({
      0: { transcript: result.transcript },
      isFinal: result.isFinal,
    })),
  } as unknown as SpeechRecognitionEvent
}

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

  it('builds live preview text from final and interim parts', () => {
    expect(
      buildVoiceLivePreviewText({
        voiceFinalText: 'hello how',
        voiceInterimText: 'are you',
      })
    ).toBe('hello how are you')
  })

  it('extracts final and interim transcript parts from speech results', () => {
    const event = createSpeechRecognitionEvent([
      { transcript: 'hello', isFinal: true },
      { transcript: 'world', isFinal: false },
    ])

    expect(extractSpeechRecognitionTranscript(event)).toEqual({
      finalText: 'hello',
      interimText: 'world',
    })
  })

  it('keeps only the latest interim hypothesis from changed results', () => {
    const event = createSpeechRecognitionEvent(
      [
        { transcript: 'hello', isFinal: true },
        { transcript: 'my family', isFinal: false },
        { transcript: 'my family would like to talk', isFinal: false },
      ],
      1
    )

    expect(extractSpeechRecognitionTranscript(event)).toEqual({
      finalText: 'hello',
      interimText: 'my family would like to talk',
    })
  })

  it('preserves accumulated final text when later indexes change', () => {
    const event = createSpeechRecognitionEvent(
      [
        { transcript: 'hello', isFinal: true },
        { transcript: 'dear world', isFinal: true },
        { transcript: 'again', isFinal: false },
      ],
      2
    )

    expect(extractSpeechRecognitionTranscript(event)).toEqual({
      finalText: 'hello dear world',
      interimText: 'again',
    })
  })

  it('falls back to the latest available interim when changed range has no interim text', () => {
    const event = createSpeechRecognitionEvent(
      [
        { transcript: 'hello', isFinal: true },
        { transcript: 'world', isFinal: false },
      ],
      2
    )

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

  it('reset restores initial composer state', () => {
    const dirty = {
      ...initialVoiceComposerState,
      draftText: 'typed',
      voicePhase: 'recording' as const,
      voiceInterimText: 'привет',
    }
    expect(voiceComposerReducer(dirty, { type: 'reset' })).toEqual(initialVoiceComposerState)
  })

  it('keeps the cleared draft state on voice errors', () => {
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

    expect(failed.draftText).toBe('')
    expect(failed.voicePhase).toBe('error')
    expect(failed.statusMessage).toBe('Ошибка распознавания речи.')
  })
})
