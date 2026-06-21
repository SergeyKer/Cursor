import { describe, expect, it } from 'vitest'
import { embeddedQuestionsLesson } from '@/lib/lessons/embedded-questions'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import {
  assessGeneratedSteps,
  buildStructuredHintAuthoringRules,
  collectExerciseHintTexts,
  isGenericLessonHint,
  type GeneratedStepPayload,
} from '@/lib/structuredLessonFactory'

function toGeneratedPayload(lesson: typeof itsTimeToLesson): GeneratedStepPayload[] {
  return lesson.steps.map((step) => ({
    stepNumber: step.stepNumber,
    bubbles: step.bubbles.map((bubble) => ({ ...bubble })),
    ...(step.exercise
      ? {
          exercise: {
            question: step.exercise.question,
            options: step.exercise.options,
            correctAnswer: step.exercise.correctAnswer,
            acceptedAnswers: step.exercise.acceptedAnswers,
            hint: step.exercise.hint,
            puzzleVariants: step.exercise.puzzleVariants,
            variants: step.exercise.variants,
            bonusXp: step.exercise.bonusXp,
          },
        }
      : {}),
    footerDynamic: step.footerDynamic,
  }))
}

describe('lesson hint helpers', () => {
  it('detects generic puzzle and vague hints', () => {
    expect(isGenericLessonHint('Порядок неверный. Попробуйте ещё раз.')).toBe(true)
    expect(isGenericLessonHint('Во второй части используйте обычный порядок слов.')).toBe(true)
    expect(isGenericLessonHint('В задании «когда» - это when, не where.')).toBe(false)
    expect(isGenericLessonHint('После Who - глагол с -s.')).toBe(false)
  })

  it('collects hints from exercise, variants and puzzle texts', () => {
    const step = embeddedQuestionsLesson.steps.find((item) => item.stepNumber === 4)
    const hints = collectExerciseHintTexts(step?.exercise)
    expect(hints.length).toBeGreaterThan(1)
    expect(hints.some((hint) => /when|where|what|что|где|когда/i.test(hint))).toBe(true)
  })

  it('includes hint authoring rules in prompt block', () => {
    expect(buildStructuredHintAuthoringRules('child')).toContain('когда')
    expect(buildStructuredHintAuthoringRules('child')).toContain('подлежащее')
  })

  it('flags AI steps with generic variant hints', () => {
    const generated = toGeneratedPayload(embeddedQuestionsLesson)
    const step4Index = generated.findIndex((step) => step.stepNumber === 4)
    const variants = generated[step4Index]?.exercise?.variants
    if (!Array.isArray(variants) || variants.length === 0) {
      throw new Error('expected step 4 variants')
    }
    generated[step4Index] = {
      ...generated[step4Index],
      exercise: {
        ...generated[step4Index].exercise!,
        variants: variants.map((variant) => ({
          ...(variant as Record<string, unknown>),
          hint: 'Во второй части используйте обычный порядок слов.',
        })),
      },
    }

    const validation = assessGeneratedSteps(
      embeddedQuestionsLesson,
      embeddedQuestionsLesson.steps,
      generated
    )
    expect(validation.issues.some((issue) => issue.code === 'hint_too_generic')).toBe(true)
  })

  it('keeps embedded-questions hints instructional without generic phrasing', () => {
    const validation = assessGeneratedSteps(
      embeddedQuestionsLesson,
      embeddedQuestionsLesson.steps,
      toGeneratedPayload(embeddedQuestionsLesson)
    )
    expect(validation.issues.filter((issue) => issue.code === 'hint_too_generic')).toHaveLength(0)
    expect(
      validation.issues.filter((issue) => issue.code === 'hint_reveals_answer'),
      JSON.stringify(validation.issues.filter((issue) => issue.code === 'hint_reveals_answer'))
    ).toHaveLength(0)
  })
})
