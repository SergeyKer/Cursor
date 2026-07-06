import { describe, expect, it } from 'vitest'
import { buildPracticeFeedMessages } from '@/lib/practice/buildPracticeFeedMessages'
import { isDictationStylePrompt } from '@/lib/practice/prompt/dictationPromptFormat'
import type { PracticeSession } from '@/types/practice'

function dictationSession(): PracticeSession {
  return {
    id: 's-dictation',
    mode: 'challenge',
    topic: 'Тема',
    status: 'active',
    currentIndex: 7,
    questions: Array.from({ length: 12 }, (_, index) => ({
      id: `q${index}`,
      lessonId: '1',
      type: index === 7 ? ('dictation' as const) : 'choice',
      prompt:
        index === 7
          ? 'Ситуация: На улице холодно. Прослушайте английскую фразу и запишите её целиком.'
          : 'Ситуация: test',
      targetAnswer: index === 7 ? "It's cold." : 'A',
      hint: index === 7 ? 'Используйте глагол be' : undefined,
      audioText: index === 7 ? "It's cold." : undefined,
      acceptedAnswers: [],
      xpBase: 10,
      difficulty: 1,
      tolerance: 'normalized',
    })),
    answers: [],
    score: 0,
    xp: 0,
    streak: 0,
    instructionAcknowledged: true,
  }
}

describe('buildPracticeFeedMessages - dictation', () => {
  it('renders three bubbles with dictation info and no hint leak', () => {
    const messages = buildPracticeFeedMessages({
      session: dictationSession(),
      state: 'answering',
      audience: 'adult',
    })

    const current = messages.find((message) => message.id === 'practice-question-q7')
    expect(current?.bubbles).toHaveLength(3)
    expect(current?.bubbles?.map((bubble) => bubble.type)).toEqual(['positive', 'info', 'task'])

    const info = current?.bubbles?.find((bubble) => bubble.type === 'info')?.content ?? ''
    expect(info).toContain('Напишите фразу на слух')
    expect(info).not.toContain('глагол')

    const task = current?.bubbles?.find((bubble) => bubble.type === 'task')?.content ?? ''
    expect(task).not.toContain('\n')
    expect(isDictationStylePrompt(task)).toBe(true)
  })
})
