import { describe, expect, it } from 'vitest'
import { buildSinglePracticeQuestion } from '@/lib/practice/builders/localPracticeBuilder'
import { getStructuredLessonById } from '@/lib/structuredLessons'

describe('wordBuilderProAlignment', () => {
  const lesson4 = getStructuredLessonById('4')

  it.each([
    [0, /город|настроен/i, 'I am from Moscow and I am happy.'],
    [1, /город|настроен/i, 'I am from Moscow and I am happy.'],
    [2, /стран/i, 'I am from Russia.'],
    [3, /город/i, 'I am from Moscow.'],
  ])('reference index %i prompt matches target axis', (index, promptPattern, targetAnswer) => {
    expect(lesson4).not.toBeNull()
    const question = buildSinglePracticeQuestion({
      lesson: lesson4!,
      type: 'word-builder-pro',
      questionIndex: index,
      mode: 'reference',
      referenceExerciseType: 'word-builder-pro',
    })
    expect(question).not.toBeNull()
    expect(question!.targetAnswer).toBe(targetAnswer)
    expect(question!.prompt).toMatch(promptPattern)
    expect(question!.hint).toBeFalsy()
  })

  it('student compound traps use article swap not morph on am', () => {
    const question = buildSinglePracticeQuestion({
      lesson: lesson4!,
      type: 'word-builder-pro',
      questionIndex: 0,
      mode: 'reference',
      referenceExerciseType: 'word-builder-pro',
    })
    expect(question?.extraWords).toEqual(expect.arrayContaining(['an', 'froms']))
    expect(question?.extraWords).not.toContain('ams')
  })

  it('reference word-builder keeps empty hint', () => {
    const engineer = buildSinglePracticeQuestion({
      lesson: lesson4!,
      type: 'word-builder-pro',
      questionIndex: 1,
      mode: 'reference',
      referenceExerciseType: 'word-builder-pro',
    })
    expect(engineer?.hint).toBeFalsy()
  })
})
