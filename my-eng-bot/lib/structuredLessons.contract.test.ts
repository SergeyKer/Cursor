import { describe, expect, it } from 'vitest'
import { detectBrokenEnglishPattern } from '@/lib/englishPatternGuard'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import { stepTranslateInfoCollidesWithAnswers } from '@/lib/lessonExampleAnswerCollision'
import { toSentencePuzzleCards } from '@/lib/sentencePuzzleWords'
import { extractRussianTranslatePromptSegment } from '@/lib/structuredLessonFactory'
import { getAllStructuredLessons, getStructuredLessonById, loadLessonById } from '@/lib/structuredLessons'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import { primeLessonCache } from '@/lib/lessons/loadLessonById'
import type { Exercise, ExerciseVariant, LessonData, LessonRepeatStepVariant, LessonStep, SentencePuzzleVariant } from '@/types/lesson'

primeLessonCache('1', itsTimeToLesson)

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

function expectPuzzleVariantsAligned(scope: string, exercise?: Partial<Exercise>) {
  if (exercise?.type !== 'sentence_puzzle') return
  for (const [index, variant] of (exercise.puzzleVariants ?? []).entries()) {
    const label = `${scope} puzzleVariants[${index}]`
    const expectedOrder = toSentencePuzzleCards(variant.correctAnswer)
    expect(variant.correctOrder, label).toEqual(expectedOrder)
    expect(variant.words, label).toEqual(expectedOrder)
  }
}

function expectLessonPuzzleVariantsAligned(lesson: LessonData) {
  const checkStep = (scope: string, step?: LessonStep | LessonRepeatStepVariant) => {
    if (step?.stepNumber === 5) {
      expectPuzzleVariantsAligned(scope, step.exercise)
    }
  }

  lesson.steps.forEach((step, index) => {
    checkStep(`lesson ${lesson.id} step ${index + 1}`, step)
  })

  lesson.repeatConfig?.variantProfiles?.forEach((profile) => {
    profile.steps?.forEach((step, index) => {
      checkStep(`lesson ${lesson.id} variant ${profile.id} step ${index + 1}`, step)
    })
  })
}

describe('structured lesson 7-step contract', () => {
  it('loads all enabled lessons through loadLessonById', async () => {
    const loaded = await Promise.all(['1', '2', '3', '4'].map((id) => loadLessonById(id)))
    expect(loaded.every((lesson) => lesson != null)).toBe(true)
  })

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
    expect(step6?.variants).toHaveLength(3)
    expect(step7?.options).toHaveLength(3)
    expect(step7?.variants).toHaveLength(3)
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

  it.each(lessons)('keeps step 7 contrast with three single-word gap variants for lesson $id', (lesson) => {
    const profiles = lesson.repeatConfig?.variantProfiles ?? [{ id: 'default', steps: lesson.steps }]
    for (const profile of profiles) {
      const steps = profile.steps ?? lesson.steps
      const step7 = steps.find((step) => step.stepNumber === 7)
      const variants = step7?.exercise?.variants ?? []
      expect(variants, `lesson ${lesson.id} variant ${profile.id}`).toHaveLength(3)
      expect(variants.map((variant) => variant.difficulty)).toEqual(['easy', 'medium', 'hard'])
      const answers = variants.map((variant) => variant.correctAnswer.trim())
      expect(new Set(answers).size, `lesson ${lesson.id} variant ${profile.id} step 7`).toBe(3)
      for (const variant of variants) {
        expect(variant.options).toHaveLength(3)
        expect(variant.correctAnswer).not.toMatch(/\s/)
        expect(variant.options?.every((option) => !/\s/.test(option))).toBe(true)
        expect(variant.options).toContain(variant.correctAnswer)
      }
    }
  })

  it.each(lessons)('keeps step 6 exam with three translate variants for lesson $id', (lesson) => {
    const profiles = lesson.repeatConfig?.variantProfiles ?? [{ id: 'default', steps: lesson.steps }]
    for (const profile of profiles) {
      const steps = profile.steps ?? lesson.steps
      const step6 = steps.find((step) => step.stepNumber === 6)
      const variants = step6?.exercise?.variants ?? []
      expect(variants, `lesson ${lesson.id} variant ${profile.id}`).toHaveLength(3)
      expect(variants.map((variant) => variant.difficulty)).toEqual(['easy', 'medium', 'hard'])
      const answers = variants.map((variant) => variant.correctAnswer.trim())
      expect(new Set(answers).size, `lesson ${lesson.id} variant ${profile.id} step 6`).toBe(3)
      for (const variant of variants) {
        expect(variant.options).toBeUndefined()
        expect(variant.correctAnswer.length).toBeGreaterThan(0)
      }
    }
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

  it.each(lessons)('keeps puzzle words and correctOrder aligned with each variant answer for lesson $id', (lesson) => {
    expectLessonPuzzleVariantsAligned(lesson)
  })

  it('keeps its-time-to step 3 translate variants russian-only in the prompt segment', () => {
    for (const profile of itsTimeToLesson.repeatConfig?.variantProfiles ?? []) {
      const step3 = (profile.steps ?? []).find((step) => step.stepNumber === 3)
      for (const variant of step3?.exercise?.variants ?? []) {
        const segment = extractRussianTranslatePromptSegment(variant.question ?? '')
        expect(segment, `${profile.id} ${variant.id}`).not.toBeNull()
        expect(segment, `${profile.id} ${variant.id}`).not.toMatch(/[A-Za-z]/)
      }
    }
  })

  it.each(lessons)('keeps translate step variant prompts and answers distinct for lesson $id', (lesson) => {
    const profiles = lesson.repeatConfig?.variantProfiles ?? [{ id: 'default', steps: lesson.steps }]
    for (const profile of profiles) {
      const steps = profile.steps ?? lesson.steps
      for (const step of steps) {
        if (step.exercise?.type !== 'translate') continue
        const variants = step.exercise?.variants ?? []
        if (variants.length <= 1) continue
        const questions = variants.map((variant) => variant.question?.trim() ?? '')
        const answers = variants.map((variant) => variant.correctAnswer?.trim() ?? '')
        expect(
          new Set(questions).size,
          `lesson ${lesson.id} variant ${profile.id} step ${step.stepNumber} duplicate question`,
        ).toBe(variants.length)
        expect(
          new Set(answers).size,
          `lesson ${lesson.id} variant ${profile.id} step ${step.stepNumber} duplicate correctAnswer`,
        ).toBe(variants.length)
      }
    }
  })

  it.each(lessons)('keeps translate info examples distinct from expected answers for lesson $id', (lesson) => {
    const profiles = lesson.repeatConfig?.variantProfiles ?? [{ id: 'default', steps: lesson.steps }]
    for (const profile of profiles) {
      const steps = profile.steps ?? lesson.steps
      for (const step of steps) {
        expect(
          stepTranslateInfoCollidesWithAnswers(step),
          `lesson ${lesson.id} variant ${profile.id} step ${step.stepNumber}`
        ).toBe(false)
      }
    }
  })
})
