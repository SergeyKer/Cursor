import { describe, expect, it } from 'vitest'
import { shouldAutoRequestFirstChatMessage } from './guards'

const happyPath = {
  storageLoaded: true,
  initialized: true,
  dialogStarted: true,
  messagesLength: 0,
  loading: false,
  activeStructuredLesson: false,
  vocabularyWorldsActive: false,
  vocabularyByLevelActive: false,
  engvoVoiceMode: false,
} as const

describe('shouldAutoRequestFirstChatMessage', () => {
  it('allows auto first message only for the regular text chat happy path', () => {
    expect(shouldAutoRequestFirstChatMessage({ ...happyPath })).toBe(true)
  })

  it('blocks auto first message in engvo mode', () => {
    expect(
      shouldAutoRequestFirstChatMessage({
        ...happyPath,
        engvoVoiceMode: true,
      })
    ).toBe(false)
  })

  it('blocks auto first message in tutor chat space', () => {
    expect(
      shouldAutoRequestFirstChatMessage({
        ...happyPath,
        tutorChatSpaceActive: true,
      })
    ).toBe(false)
  })

  it('blocks auto first message in myPlan and progress spaces', () => {
    expect(
      shouldAutoRequestFirstChatMessage({
        ...happyPath,
        myPlanSpaceActive: true,
      })
    ).toBe(false)
    expect(
      shouldAutoRequestFirstChatMessage({
        ...happyPath,
        progressSpaceActive: true,
      })
    ).toBe(false)
  })
})
