import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  buildRoleplayPromptFromAnchor,
  selectRoleplayAnchor,
  type PriorSessionPhrase,
} from '@/lib/practice/roleplaySessionContinuity'
import { roleplayPromptHasContext } from '@/lib/practice/prompt/buildRoleplayPrompt'

function priorPhrase(stepIndex: number, type: PriorSessionPhrase['type'], targetAnswer: string): PriorSessionPhrase {
  return { stepIndex, type, targetAnswer, prompt: `Ситуация: тест ${stepIndex}.` }
}

describe('roleplaySessionContinuity', () => {
  it('selects anchor by priority (free-response over choice)', () => {
    const phrases: PriorSessionPhrase[] = [
      priorPhrase(0, 'choice', "It's cold."),
      priorPhrase(4, 'free-response', "It's time to go."),
    ]
    const anchor = selectRoleplayAnchor(phrases)
    expect(anchor?.stepIndex).toBe(4)
    expect(anchor?.targetAnswer).toBe("It's time to go.")
  })

  it('builds interlocutor prompt from anchor', () => {
    const lesson = getStructuredLessonById('1')!
    const prompt = buildRoleplayPromptFromAnchor(
      priorPhrase(4, 'free-response', "It's time to go."),
      lesson
    )
    expect(roleplayPromptHasContext(prompt)).toBe(true)
    expect(prompt).toContain('Собеседник:')
  })
})
