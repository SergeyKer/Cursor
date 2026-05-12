import { describe, expect, it } from 'vitest'
import { detectBrokenEnglishPattern } from '@/lib/englishPatternGuard'
import { getAllStructuredLessons, getStructuredLessonById } from '@/lib/structuredLessons'
import type { Exercise, ExerciseVariant, LessonData, LessonRepeatStepVariant, LessonStep, SentencePuzzleVariant } from '@/types/lesson'

const lessons = getAllStructuredLessons()

function collectExerciseStrings(exercise?: Partial<Exercise>) {
  if (!exercise) return [] as Array<{ label: string; value: string }>

  const values: Array<{ label: string; value: string }> = []
  if (typeof exercise.correctAnswer === 'string') {
    values.push({ label: 'correctAnswer', value: exercise.correctAnswer })
  }
  for (const [index, option] of (exercise.options ?? []).entries()) {
    values.push({ label: `options[${index}]`, value: option })
  }
  for (const [index, variant] of (exercise.variants ?? []).entries()) {
    values.push(...collectVariantStrings(variant, `variants[${index}]`))
  }
  for (const [index, variant] of (exercise.puzzleVariants ?? []).entries()) {
    values.push(...collectPuzzleStrings(variant, `puzzleVariants[${index}]`))
  }
  return values
}

function collectVariantStrings(variant: ExerciseVariant, prefix: string) {
  const values: Array<{ label: string; value: string }> = [{ label: `${prefix}.correctAnswer`, value: variant.correctAnswer }]
  for (const [index, option] of (variant.options ?? []).entries()) {
    values.push({ label: `${prefix}.options[${index}]`, value: option })
  }
  return values
}

function collectPuzzleStrings(variant: SentencePuzzleVariant, prefix: string) {
  return [{ label: `${prefix}.correctAnswer`, value: variant.correctAnswer }]
}

function expectNoBrokenEnglishStrings(scope: string, exercise?: Partial<Exercise>) {
  for (const entry of collectExerciseStrings(exercise)) {
    const pattern = detectBrokenEnglishPattern(entry.value)
    expect(pattern, `${scope} -> ${entry.label}: ${entry.value}`).toBeNull()
  }
}

function expectLessonHasNoBrokenEnglish(lesson: LessonData) {
  lesson.steps.forEach((step: LessonStep, index) => {
    expectNoBrokenEnglishStrings(`lesson ${lesson.id} step ${index + 1}`, step.exercise)
  })

  lesson.repeatConfig?.variantProfiles?.forEach((profile) => {
    profile.steps?.forEach((step: LessonRepeatStepVariant, index) => {
      expectNoBrokenEnglishStrings(`lesson ${lesson.id} variant ${profile.id} step ${index + 1}`, step.exercise)
    })
  })
}

describe('structured lesson 7-step contract', () => {
  it.each(lessons)('keeps 7 learning steps plus finale for lesson $id', (lesson) => {
    expect(lesson.steps).toHaveLength(7)
    expect(lesson.finale?.postLesson.options.length).toBeGreaterThan(0)

    const step1 = lesson.steps[0]?.exercise
    const step2 = lesson.steps[1]?.exercise
    const step3 = lesson.steps[2]?.exercise
    const step4 = lesson.steps[3]?.exercise
    const step5 = lesson.steps[4]?.exercise
    const step6 = lesson.steps[5]?.exercise
    const step7 = lesson.steps[6]?.exercise

    expect(step1?.type).toBe('fill_choice')
    expect(step2?.type).toBe('fill_choice')
    expect(step3?.type).toBe('fill_text')
    expect(step4?.type).toBe('translate')
    expect(step5?.type).toBe('sentence_puzzle')
    expect(step6?.type === 'translate' || step6?.type === 'write_own').toBe(true)
    expect(step7?.type).toBe('fill_choice')

    expect(step1?.options).toHaveLength(3)
    expect(step2?.options).toHaveLength(3)
    expect(step3?.options).toBeUndefined()
    expect(step4?.options).toBeUndefined()
    expect(step5?.puzzleVariants).toHaveLength(3)
    expect(step6?.puzzleVariants).toBeUndefined()
    expect(step7?.options).toHaveLength(3)
    expect(step6?.options).toBeUndefined()

    expect(step3?.answerFormat).toBe('single_word')
    expect(step4?.answerFormat).toBe('full_sentence')
    expect(step5?.answerFormat).toBe('full_sentence')
    expect(step6?.answerFormat).toBe('full_sentence')

    const blueprint5 = lesson.repeatConfig?.stepBlueprints[4]
    const blueprint6 = lesson.repeatConfig?.stepBlueprints[5]
    expect(blueprint5?.exerciseType).toBe('sentence_puzzle')
    expect(blueprint6?.exerciseType === 'translate' || blueprint6?.exerciseType === 'write_own').toBe(true)
    expect(blueprint6?.answerFormat).toBe('full_sentence')
  })

  it.each(lessons)('keeps text-only multi-variant practice on steps 3 and 4 for lesson $id', (lesson) => {
    for (const stepIndex of [2, 3]) {
      const exercise = lesson.steps[stepIndex]?.exercise
      const variants = exercise?.variants ?? []

      expect(variants.length).toBeGreaterThan(1)
      expect(variants.length).toBeLessThanOrEqual(3)

      for (const variant of variants) {
        expect(typeof variant.correctAnswer).toBe('string')
        expect(variant.correctAnswer.length).toBeGreaterThan(0)
        expect(variant.options).toBeUndefined()
      }
    }
  })

  it('keeps the embedded question intro prompt punctuation aligned with choice options', () => {
    const lesson = getStructuredLessonById('3')
    const musicLikesProfile = lesson?.repeatConfig?.variantProfiles?.find((profile) => profile.id === 'music-likes')
    const step1TaskBubble = musicLikesProfile?.steps?.[0]?.bubbles?.find((bubble) => bubble.type === 'task')

    expect(step1TaskBubble?.content).toContain('"Ты знаешь, что ей нравится?"')
    expect(musicLikesProfile?.steps?.[0]?.exercise?.correctAnswer).toBe('Do you know what she likes?')
  })

  it.each(lessons)('rejects broken english patterns in local lesson payloads for lesson $id', (lesson) => {
    expectLessonHasNoBrokenEnglish(lesson)
  })
})
