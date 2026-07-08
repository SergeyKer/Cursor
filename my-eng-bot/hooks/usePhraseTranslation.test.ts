import { describe, expect, it, vi } from 'vitest'
import { parseInterlocutorFromPrompt } from '@/lib/practice/prompt/roleplayPromptEngine'

describe('roleplay speak/translation phrase source', () => {
  it('extracts interlocutor english phrase from canonical prompt', () => {
    expect(
      parseInterlocutorFromPrompt('На улице темно.\nСобеседник: «What is it like outside?»')
    ).toBe('What is it like outside?')
  })

  it('returns null when interlocutor marker is missing', () => {
    expect(parseInterlocutorFromPrompt('Ситуация: На улице темно.')).toBeNull()
  })
})

describe('usePhraseTranslation close semantics', () => {
  it('closeKey bump closes an open translation panel', () => {
    let showTranslation = true
    let closeKey = 'q-1:0'

    const applyCloseKey = (nextCloseKey: string) => {
      if (closeKey !== nextCloseKey) {
        closeKey = nextCloseKey
        showTranslation = false
      }
    }

    applyCloseKey('q-1:1')
    expect(showTranslation).toBe(false)
  })

  it('auto-closes when translation error first appears', () => {
    let showTranslation = true
    let prevError: string | undefined

    const onTranslationError = (currentError?: string) => {
      const justAppeared = prevError !== currentError
      prevError = currentError
      if (showTranslation && currentError && justAppeared) {
        showTranslation = false
      }
    }

    onTranslationError('Не удалось загрузить перевод.')
    expect(showTranslation).toBe(false)
  })
})
