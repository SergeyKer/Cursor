import type {
  Bubble,
  Exercise,
  LessonData,
  LessonRepeatStepBlueprint,
  LessonRepeatStepVariant,
  LessonRepeatVariantProfile,
  LessonStep,
} from '@/types/lesson'

function cloneBubble(bubble: Bubble): Bubble {
  return { ...bubble }
}

function cloneExercise(exercise?: Exercise): Exercise | undefined {
  if (!exercise) return undefined
  return {
    ...exercise,
    ...(exercise.options ? { options: [...exercise.options] } : {}),
    ...(exercise.acceptedAnswers ? { acceptedAnswers: [...exercise.acceptedAnswers] } : {}),
    ...(exercise.variants
      ? {
          variants: exercise.variants.map((variant) => ({
            ...variant,
            ...(variant.options ? { options: [...variant.options] } : {}),
            ...(variant.acceptedAnswers ? { acceptedAnswers: [...variant.acceptedAnswers] } : {}),
          })),
        }
      : {}),
    ...(exercise.puzzleVariants
      ? {
          puzzleVariants: exercise.puzzleVariants.map((variant) => ({
            ...variant,
            words: [...variant.words],
            correctOrder: [...variant.correctOrder],
          })) as typeof exercise.puzzleVariants,
        }
      : {}),
    ...(typeof exercise.bonusXp === 'number' ? { bonusXp: exercise.bonusXp } : {}),
    ...(exercise.adaptive ? { adaptive: { ...exercise.adaptive } } : {}),
    ...(exercise.difficultyProfile ? { difficultyProfile: { ...exercise.difficultyProfile } } : {}),
  }
}

function cloneStep(step: LessonStep): LessonStep {
  return {
    ...step,
    bubbles: step.bubbles.map((bubble) => cloneBubble(bubble)) as LessonStep['bubbles'],
    ...(step.exercise ? { exercise: cloneExercise(step.exercise) } : {}),
    ...(step.postLesson
      ? {
          postLesson: {
            ...step.postLesson,
            options: step.postLesson.options.map((option) => ({ ...option })),
          },
        }
      : {}),
  }
}

function cloneBlueprint(blueprint: LessonRepeatStepBlueprint): LessonRepeatStepBlueprint {
  return {
    ...blueprint,
    ...(blueprint.semanticAnchors ? { semanticAnchors: [...blueprint.semanticAnchors] } : {}),
    ...(blueprint.semanticExpectations
      ? {
          semanticExpectations: {
            ...blueprint.semanticExpectations,
            ...(blueprint.semanticExpectations.mustInclude
              ? { mustInclude: [...blueprint.semanticExpectations.mustInclude] }
              : {}),
            ...(blueprint.semanticExpectations.shouldInclude
              ? { shouldInclude: [...blueprint.semanticExpectations.shouldInclude] }
              : {}),
            ...(blueprint.semanticExpectations.mustAvoid
              ? { mustAvoid: [...blueprint.semanticExpectations.mustAvoid] }
              : {}),
            ...(blueprint.semanticExpectations.hintShouldMention
              ? { hintShouldMention: [...blueprint.semanticExpectations.hintShouldMention] }
              : {}),
          },
        }
      : {}),
  }
}

function mergeStep(baseStep: LessonStep, variantStep?: LessonRepeatStepVariant): LessonStep {
  if (!variantStep) return cloneStep(baseStep)
  const baseExercise = cloneExercise(baseStep.exercise)
  let nextExercise = baseExercise
  if (variantStep.exercise && baseExercise) {
    nextExercise = {
      ...baseExercise,
      ...variantStep.exercise,
      ...(variantStep.exercise.options ? { options: [...variantStep.exercise.options] } : {}),
      ...(variantStep.exercise.acceptedAnswers ? { acceptedAnswers: [...variantStep.exercise.acceptedAnswers] } : {}),
      ...(variantStep.exercise.variants
        ? {
            variants: variantStep.exercise.variants.map((variant) => ({
              ...variant,
              ...(variant.options ? { options: [...variant.options] } : {}),
              ...(variant.acceptedAnswers ? { acceptedAnswers: [...variant.acceptedAnswers] } : {}),
            })),
          }
        : {}),
      ...(variantStep.exercise.puzzleVariants
        ? {
            puzzleVariants: variantStep.exercise.puzzleVariants.map((variant) => ({
              ...variant,
              words: [...variant.words],
              correctOrder: [...variant.correctOrder],
            })) as typeof variantStep.exercise.puzzleVariants,
          }
        : {}),
      ...(typeof variantStep.exercise.bonusXp === 'number' ? { bonusXp: variantStep.exercise.bonusXp } : {}),
      ...(variantStep.exercise.adaptive ? { adaptive: { ...variantStep.exercise.adaptive } } : {}),
      ...(variantStep.exercise.difficultyProfile ? { difficultyProfile: { ...variantStep.exercise.difficultyProfile } } : {}),
    }
  }

  return {
    ...cloneStep(baseStep),
    ...(variantStep.bubbles ? { bubbles: variantStep.bubbles.map((bubble) => cloneBubble(bubble)) as LessonStep['bubbles'] } : {}),
    ...(variantStep.footerDynamic ? { footerDynamic: variantStep.footerDynamic } : {}),
    ...(variantStep.myEngComment ? { myEngComment: variantStep.myEngComment } : {}),
    ...(nextExercise ? { exercise: nextExercise } : {}),
  }
}

export function applyStructuredLessonVariant(
  lesson: LessonData,
  variantProfile?: LessonRepeatVariantProfile | null
): LessonData {
  if (!variantProfile || !lesson.repeatConfig) {
    return {
      ...lesson,
      steps: lesson.steps.map((step) => cloneStep(step)),
      ...(lesson.finale
        ? {
            finale: {
              ...lesson.finale,
              bubbles: lesson.finale.bubbles.map((bubble) => cloneBubble(bubble)) as NonNullable<LessonData['finale']>['bubbles'],
              postLesson: {
                ...lesson.finale.postLesson,
                options: lesson.finale.postLesson.options.map((option) => ({ ...option })),
              },
            },
          }
        : {}),
      repeatConfig: lesson.repeatConfig
        ? {
            ...lesson.repeatConfig,
            sourceSituations: [...lesson.repeatConfig.sourceSituations],
            stepBlueprints: lesson.repeatConfig.stepBlueprints.map((blueprint) => cloneBlueprint(blueprint)),
            ...(lesson.repeatConfig.variantProfiles ? { variantProfiles: lesson.repeatConfig.variantProfiles } : {}),
          }
        : undefined,
    }
  }

  const stepOverrides = new Map((variantProfile.steps ?? []).map((step) => [step.stepNumber, step]))
  const blueprintOverrides = new Map((variantProfile.stepBlueprints ?? []).map((step) => [step.stepNumber, step]))

  return {
    ...lesson,
    variantId: variantProfile.id,
    steps: lesson.steps.map((step) => mergeStep(step, stepOverrides.get(step.stepNumber))),
    ...(lesson.finale
      ? {
          finale: {
            ...lesson.finale,
            bubbles: lesson.finale.bubbles.map((bubble) => cloneBubble(bubble)) as NonNullable<LessonData['finale']>['bubbles'],
            postLesson: {
              ...lesson.finale.postLesson,
              options: lesson.finale.postLesson.options.map((option) => ({ ...option })),
            },
          },
        }
      : {}),
    repeatConfig: {
      ...lesson.repeatConfig,
      sourceSituations: [...(variantProfile.sourceSituations ?? lesson.repeatConfig.sourceSituations)],
      stepBlueprints: lesson.repeatConfig.stepBlueprints.map((baseBlueprint) =>
        cloneBlueprint(blueprintOverrides.get(baseBlueprint.stepNumber) ?? baseBlueprint)
      ),
      ...(lesson.repeatConfig.variantProfiles ? { variantProfiles: lesson.repeatConfig.variantProfiles } : {}),
    },
  }
}

export function selectStructuredLessonVariant(
  lesson: LessonData,
  recentVariantIds: string[] = []
): { lesson: LessonData; selectedVariantId: string | null } {
  const profiles = lesson.repeatConfig?.variantProfiles ?? []
  if (profiles.length === 0) {
    return { lesson: applyStructuredLessonVariant(lesson, null), selectedVariantId: lesson.variantId ?? null }
  }

  const antiRepeatWindow = Math.max(lesson.repeatConfig?.antiRepeatWindow ?? 0, 0)
  const recentWindow = antiRepeatWindow > 0 ? recentVariantIds.slice(-antiRepeatWindow) : []
  const candidates = profiles.filter((profile) => !recentWindow.includes(profile.id))
  const pool = candidates.length > 0 ? candidates : profiles
  const selected = pool[Math.floor(Math.random() * pool.length)] ?? profiles[0]
  return {
    lesson: applyStructuredLessonVariant(lesson, selected),
    selectedVariantId: selected?.id ?? null,
  }
}
