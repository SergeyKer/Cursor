import { describe, expect, it } from 'vitest'
import { shouldAutoRequestFirstChatMessage } from './guards'

describe('shouldAutoRequestFirstChatMessage', () => {
  it('allows auto first message only for the regular text chat happy path', () => {
    expect(
      shouldAutoRequestFirstChatMessage({
        storageLoaded: true,
        initialized: true,
        dialogStarted: true,
        messagesLength: 0,
        loading: false,
        activeStructuredLesson: false,
        vocabularyWorldsActive: false,
        vocabularyByLevelActive: false,
        engvoVoiceMode: false,
      })
    ).toBe(true)
  })

  it('blocks auto first message in engvo mode', () => {
    expect(
      shouldAutoRequestFirstChatMessage({
        storageLoaded: true,
        initialized: true,
        dialogStarted: true,
        messagesLength: 0,
        loading: false,
        activeStructuredLesson: false,
        vocabularyWorldsActive: false,
        vocabularyByLevelActive: false,
        engvoVoiceMode: true,
      })
    ).toBe(false)
  })
})
