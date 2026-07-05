import { describe, expect, it } from 'vitest'
import { lessonForPracticeStep } from '@/lib/practice/buildPracticeDiversity'
import { buildSinglePracticeQuestion } from '@/lib/practice/builders/localPracticeBuilder'
import { getStructuredLessonById } from '@/lib/structuredLessons'

describe('wordBuilderProAlignment', () => {
  const lesson4 = getStructuredLessonById('4')

  it.each([
    [0, /России/i, "I'm from Russia."],
    [1, /инженер/i, 'I am an engineer.'],
    [2, /Великобритани/i, "I'm from Britain."],
    [3, /врач/i, 'I am a doctor.'],
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
    expect(question!.prompt).not.toMatch(/настроени/i)
  })

  it('maria engineer traps use article not morph on am', () => {
    const question = buildSinglePracticeQuestion({
      lesson: lesson4!,
      type: 'word-builder-pro',
      questionIndex: 1,
      mode: 'reference',
      referenceExerciseType: 'word-builder-pro',
    })
    expect(question?.extraWords).toContain('a')
    expect(question?.extraWords).not.toContain('ams')
  })

  it('britain hint does not leak mood axis on engineer step', () => {
    const engineer = buildSinglePracticeQuestion({
      lesson: lesson4!,
      type: 'word-builder-pro',
      questionIndex: 1,
      mode: 'reference',
      referenceExerciseType: 'word-builder-pro',
    })
    expect(engineer?.hint?.toLowerCase() ?? '').not.toContain('from')
  })
})
