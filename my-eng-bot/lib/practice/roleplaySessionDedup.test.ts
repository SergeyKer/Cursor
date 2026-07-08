import { describe, expect, it } from 'vitest'
import {
  collectRecentInterlocutorLines,
  collectRecentRoleIntroLines,
  collectRecentTargetAnswers,
} from '@/lib/practice/roleplaySessionDedup'
import { buildCanonicalRoleplayPrompt } from '@/lib/practice/prompt/roleplayPromptEngine'
import type { PracticeQuestion } from '@/types/practice'

function roleplayQuestion(
  id: string,
  targetAnswer: string,
  scenario: { roleIntroRu: string; interlocutorEn: string }
): PracticeQuestion {
  return {
    id,
    lessonId: '1',
    type: 'roleplay-mini',
    prompt: buildCanonicalRoleplayPrompt({
      roleIntroRu: scenario.roleIntroRu,
      interlocutorEn: scenario.interlocutorEn,
      grammarAxis: 'state',
    }),
    targetAnswer,
    acceptedAnswers: [],
    xpBase: 10,
    difficulty: 3,
    tolerance: 'soft',
    minWords: 2,
  }
}

describe('roleplaySessionDedup', () => {
  it('collects unique target answers', () => {
    const questions = [
      roleplayQuestion('q1', "It's cold.", {
        roleIntroRu: 'Сегодня холодно.',
        interlocutorEn: "What's the weather like?",
      }),
      roleplayQuestion('q2', "It's time to go.", {
        roleIntroRu: 'Уже поздно.',
        interlocutorEn: 'What should we do now?',
      }),
      roleplayQuestion('q3', "It's time to go.", {
        roleIntroRu: 'Другая сцена.',
        interlocutorEn: 'What should we do now?',
      }),
    ]
    expect(collectRecentTargetAnswers(questions)).toHaveLength(2)
  })

  it('collects unique interlocutor EN lines and intros', () => {
    const questions = [
      roleplayQuestion('q1', "It's cold.", {
        roleIntroRu: 'Холодно.',
        interlocutorEn: "What's the weather like?",
      }),
    ]
    expect(collectRecentInterlocutorLines(questions)[0]).toContain('weather')
    expect(collectRecentRoleIntroLines(questions)[0]).toContain('холодно')
  })
})
