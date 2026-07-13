import { describe, expect, it } from 'vitest'
import { buildQuickTestQuestionInfoLabel } from '@/lib/quickTest/quickTestQuestionInfo'
import type { PracticeQuestion } from '@/types/practice'

const choiceQuestion: PracticeQuestion = {
  id: 'qt-q1',
  lessonId: '2',
  type: 'choice',
  prompt: 'Who ___ pizza?',
  targetAnswer: 'likes',
  options: ['likes', 'like', 'liking'],
  acceptedAnswers: ['likes'],
  xpBase: 10,
  difficulty: 2,
  tolerance: 'normalized',
}

describe('buildQuickTestQuestionInfoLabel', () => {
  it('opens first question with a human starter', () => {
    const label = buildQuickTestQuestionInfoLabel({
      question: choiceQuestion,
      questionIndex: 0,
      previousWasCorrect: null,
      audience: 'adult',
      baseInstruction: 'Выберите лучший вариант.',
    })

    expect(label).toMatch(/^(Начнём|Поехали|Первый вопрос|Стартуем)\. Выберите лучший вариант\.$/)
  })

  it('adds transition after a wrong answer', () => {
    const label = buildQuickTestQuestionInfoLabel({
      question: { ...choiceQuestion, id: 'qt-q2' },
      questionIndex: 1,
      previousWasCorrect: false,
      audience: 'adult',
      baseInstruction: 'Выберите лучший вариант.',
    })

    expect(label).toContain('— выберите лучший вариант.')
    expect(label).toMatch(/Разобрались|Ничего страшного|Понятно|идём дальше/)
  })

  it('adds transition after a correct answer', () => {
    const label = buildQuickTestQuestionInfoLabel({
      question: { ...choiceQuestion, id: 'qt-q3' },
      questionIndex: 2,
      previousWasCorrect: true,
      audience: 'adult',
      baseInstruction: 'Выберите лучший вариант.',
    })

    expect(label).toContain('— выберите лучший вариант.')
    expect(label).toMatch(/Отлично|Верно|Так держать|Супер/)
  })
})
