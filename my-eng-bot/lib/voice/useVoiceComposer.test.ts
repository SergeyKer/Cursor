import { describe, expect, it } from 'vitest'
import {
  appendVoiceText,
  buildVoiceDisplayText,
  buildVoiceLivePreviewText,
  chooseFinalSpeechText,
  extractSpeechRecognitionTranscript,
  initialVoiceComposerState,
  mergeSpeechDisplayText,
  mergeSpeechFinalSegment,
  stabilizeInterimAcrossTicks,
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
    expect(appendVoiceText('...start the drill.', 'Вот я иду по улице.')).toBe(
      '...start the drill. Вот я иду по улице.'
    )
    expect(appendVoiceText("Let's", 'lock')).toBe("Let's lock")
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

  it('collapses cumulative interim text for live preview', () => {
    expect(mergeSpeechDisplayText('I would like', 'I would like to drink a tea')).toBe(
      'I would like to drink a tea'
    )
  })

  it('collapses cumulative interim text for display text', () => {
    expect(
      buildVoiceDisplayText({
        draftBeforeVoiceText: 'Maybe',
        voiceFinalText: 'I would like',
        voiceInterimText: 'I would like to drink a tea',
      })
    ).toBe('Maybe I would like to drink a tea')
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

  it('replaces duplicated cumulative final segments with the latest full phrase', () => {
    expect(mergeSpeechFinalSegment('I am', 'I am swimming')).toBe('I am swimming')
    expect(mergeSpeechFinalSegment('I am swimming', 'I am swimming in the sea')).toBe('I am swimming in the sea')
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

  it('keeps independent final segments in desktop-like flow', () => {
    expect(mergeSpeechFinalSegment('hello', 'dear world')).toBe('hello dear world')
  })

  it('drops a shorter final that restarts as a prefix of the accumulated text', () => {
    expect(
      mergeSpeechFinalSegment('tell me please about Mitsubishi', 'tell me please about')
    ).toBe('tell me please about Mitsubishi')
    expect(mergeSpeechFinalSegment('hello dear world', 'hello')).toBe('hello dear world')
  })

  it('merges overlapping phrase tails across segments', () => {
    expect(mergeSpeechFinalSegment('New York', 'York City')).toBe('New York City')
    expect(mergeSpeechFinalSegment('I went to', 'to the store')).toBe('I went to the store')
    expect(mergeSpeechFinalSegment('alpha', 'alphabet')).toBe('alphabet')
  })

  it('merges display final and interim when interim overlaps without being a prefix extension', () => {
    expect(mergeSpeechDisplayText('New York', 'York City')).toBe('New York City')
  })

  it('collapses cumulative final chunks in Android-like flow', () => {
    const event = createSpeechRecognitionEvent([
      { transcript: 'I am', isFinal: true },
      { transcript: 'I am swimming', isFinal: true },
      { transcript: 'I am swimming in the sea', isFinal: true },
      { transcript: 'I am swimming in the sea today', isFinal: false },
    ])

    expect(extractSpeechRecognitionTranscript(event)).toEqual({
      finalText: 'I am swimming in the sea',
      interimText: 'I am swimming in the sea today',
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
    expect(committed.lastCommittedVoiceText).toBe('spoken ending')
    expect(committed.voicePhase).toBe('idle')
    expect(committed.voiceInterimText).toBe('')
  })

  it('clears the committed voice marker after manual edits', () => {
    const committed = voiceComposerReducer(initialVoiceComposerState, {
      type: 'commitVoiceText',
      text: 'spoken answer',
    })

    const edited = voiceComposerReducer(committed, {
      type: 'setDraftText',
      text: 'spoken answer edited',
    })

    expect(edited.draftText).toBe('spoken answer edited')
    expect(edited.lastCommittedVoiceText).toBe('')
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

  it('prefers the longer interim when final is its stable prefix', () => {
    expect(chooseFinalSpeechText('I am swimming', 'I am swimming in the sea')).toBe('I am swimming in the sea')
    expect(chooseFinalSpeechText('I am swimming in the sea', 'I am')).toBe('I am swimming in the sea')
  })

  it('merges overlapping interim into final when resolving committed text', () => {
    expect(chooseFinalSpeechText('New York', 'York City')).toBe('New York City')
  })

  it('keeps the final text when interim is an unrelated hypothesis', () => {
    expect(chooseFinalSpeechText('hello there', 'what time is it')).toBe('hello there')
  })

  it('collapses case-only differences instead of cascading My/my', () => {
    expect(mergeSpeechFinalSegment("Hello Let's talk about My", "Hello Let's talk about my")).toBe(
      "Hello Let's talk about my"
    )
  })

  it('collapses Android-like My/my restart cascade from the screenshot', () => {
    const event = createSpeechRecognitionEvent([
      { transcript: "Hello Let's talk about", isFinal: true },
      { transcript: 'My', isFinal: true },
      { transcript: "Hello Let's talk about my", isFinal: true },
      { transcript: "Hello Let's talk about My giorning to Market", isFinal: true },
    ])

    const { finalText } = extractSpeechRecognitionTranscript(event)
    expect(finalText).toBe("Hello Let's talk about My giorning to Market")
    expect(finalText).not.toMatch(/My Hello/i)
    expect(finalText.toLowerCase().split("hello let's talk about").length - 1).toBe(1)
  })

  it('collapses case-mismatched final+interim for live preview without cascade', () => {
    const preview = mergeSpeechDisplayText(
      "Hello Let's talk about My",
      "Hello Let's talk about my giorning"
    )
    expect(preview).toBe("Hello Let's talk about my giorning")
    expect(preview).not.toMatch(/My Hello/i)
    expect(preview.toLowerCase().split("hello let's talk about").length - 1).toBe(1)
  })

  it('commits case-mismatched longer interim into one phrase', () => {
    expect(
      chooseFinalSpeechText(
        "Hello Let's talk about My",
        "Hello Let's talk about my giorning to Market"
      )
    ).toBe("Hello Let's talk about my giorning to Market")
  })

  it('still appends independent phrases after casefold merge', () => {
    expect(mergeSpeechFinalSegment('Good morning', 'how are you')).toBe('Good morning how are you')
  })

  it('merges overlapping tails case-insensitively', () => {
    expect(mergeSpeechFinalSegment('New york', 'York City')).toBe('New york City')
  })

  it('collapses cumulative Russian finals ignoring case', () => {
    expect(mergeSpeechFinalSegment('Привет как', 'привет как дела')).toBe('привет как дела')
    expect(mergeSpeechFinalSegment('Привет как', 'привет как дела')).not.toMatch(/Привет как привет/i)
  })

  it('stabilizes interim across ticks when casing changes mid-phrase', () => {
    expect(
      stabilizeInterimAcrossTicks(
        "Hello Let's talk about My",
        "Hello Let's talk about my morning"
      )
    ).toBe("Hello Let's talk about my morning")
  })
})
