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
    expect(task).toMatch(/Ситуация:/i)
    expect(task).not.toMatch(/Прослушайте/i)
    expect(isDictationStylePrompt(task)).toBe(true)
  })
})

function listeningSelectSession(): PracticeSession {
  return {
    id: 's-listening-select',
    mode: 'challenge',
    topic: 'Тема',
    status: 'active',
    currentIndex: 8,
    questions: Array.from({ length: 12 }, (_, index) => ({
      id: `q${index}`,
      lessonId: '1',
      type: index === 8 ? ('listening-select' as const) : 'choice',
      prompt:
        index === 8
          ? 'Ситуация: На улице темно. Прослушайте фразу и выберите правильный ответ.'
          : 'Ситуация: test',
      targetAnswer: index === 8 ? "It's dark." : 'A',
      hint: index === 8 ? 'Начните с It is' : undefined,
      audioText: index === 8 ? "It's dark." : undefined,
      options:
        index === 8 ? ["It's dark.", "It's cold.", "It's time to sleep."] : ['A', 'B', 'C'],
      acceptedAnswers: [],
      xpBase: 10,
      difficulty: 1,
      tolerance: 'soft',
    })),
    answers: [],
    score: 0,
    xp: 0,
    streak: 0,
    instructionAcknowledged: true,
  }
}

describe('buildPracticeFeedMessages - listening-select', () => {
  it('renders three bubbles with listening info and no hint leak', () => {
    const messages = buildPracticeFeedMessages({
      session: listeningSelectSession(),
      state: 'answering',
      audience: 'adult',
    })

    const current = messages.find((message) => message.id === 'practice-question-q8')
    expect(current?.bubbles).toHaveLength(3)
    expect(current?.bubbles?.map((bubble) => bubble.type)).toEqual(['positive', 'info', 'task'])

    const info = current?.bubbles?.find((bubble) => bubble.type === 'info')?.content ?? ''
    expect(info).toContain('Прослушайте и выберите')
    expect(info).not.toContain('It is')

    const task = current?.bubbles?.find((bubble) => bubble.type === 'task')?.content ?? ''
    expect(task).not.toContain('\n')
    expect(task).toMatch(/Ситуация:/i)
    expect(task).not.toContain("It's dark")
    expect(task).not.toMatch(/Прослушайте/i)
  })
})

describe('buildPracticeFeedMessages - roleplay-mini', () => {
  it('renders interlocutor task bubble and challenge anchor cue', () => {
    const session: PracticeSession = {
      id: 's-roleplay',
      mode: 'challenge',
      topic: 'Тема',
      status: 'active',
      currentIndex: 9,
      questions: Array.from({ length: 12 }, (_, index) => ({
        id: `q${index}`,
        lessonId: '1',
        type: index === 9 ? ('roleplay-mini' as const) : 'choice',
        prompt:
          index === 9
            ? 'Уже поздно, пора спать.\nСобеседник: «What should we do now?»'
            : 'Ситуация: test',
        targetAnswer: index === 9 ? "It's time to go." : 'A',
        acceptedAnswers: [],
        xpBase: 10,
        difficulty: 4,
        tolerance: 'soft',
        minWords: 2,
      })),
      answers: [],
      score: 0,
      xp: 0,
      streak: 0,
      instructionAcknowledged: true,
    }

    const messages = buildPracticeFeedMessages({
      session,
      state: 'answering',
      audience: 'adult',
    })

    const current = messages.find((message) => message.id === 'practice-question-q9')
    const info = current?.bubbles?.find((bubble) => bubble.type === 'info')?.content ?? ''
    expect(info).toContain('Нужна та же фраза, что на предыдущих шагах')

    const task = current?.bubbles?.find((bubble) => bubble.type === 'task')?.content ?? ''
    expect(task).toContain('What should we do now?')
    expect(task).toContain('пора спать')
    expect(task).toContain('Скажите ответ.')
    expect(task).not.toContain('Ответьте по-английски')
    expect(task).not.toContain('\n')
  })
})
