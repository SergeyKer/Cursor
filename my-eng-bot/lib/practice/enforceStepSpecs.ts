import { filterByChoiceGranularity, inferChoiceGranularity } from '@/lib/practice/choiceOptionGranularity'
import { buildWordBuilderProExtraWords } from '@/lib/practice/buildWordBuilderProTraps'
import { buildTieredChoiceOptions, sanitizeWordBuilderProExtraWords } from '@/lib/practice/distractorTier'
import { getPracticeStepSpec, resolveTierForStep } from '@/lib/practice/engine/stepSpec'
import { isChoiceLikePracticeType } from '@/lib/practice/ensurePracticeChoiceOptions'
import { collectLessonChoicePool } from '@/lib/practice/lessonChoicePool'
import { inferGapWordSlot } from '@/lib/practice/gapWordSlot'
import { sanitizeCanonicalOptions } from '@/lib/practice/sanitizeCanonicalOptions'
import { normalizeAiPracticeQuestion } from '@/lib/practice/normalizeAiPracticeQuestion'
import { resolvePracticeLessonStep } from '@/lib/practice/resolvePracticeLessonStep'
import {
  buildRoleplayPromptFromAnchor,
  selectRoleplayAnchor,
  type PriorSessionPhrase,
} from '@/lib/practice/roleplaySessionContinuity'
import { roleplayPromptHasContext } from '@/lib/practice/prompt/buildRoleplayPrompt'
import { buildRoleplayHint, extractRoleplayKeywords, inferRoleplayAxis } from '@/lib/practice/prompt/roleplayPromptEngine'
import type { LessonData } from '@/types/lesson'
import type { PracticeMode, PracticeQuestion } from '@/types/practice'

const CHALLENGE_ROLEPLAY_INDEX = 9

function resolveTierForEnforce(
  mode: PracticeMode,
  stepIndex: number,
  _choiceLikeWrongCountBefore?: number
): ReturnType<typeof resolveTierForStep> {
  const spec = getPracticeStepSpec(mode, stepIndex)
  if (!spec?.distractorTier) return undefined
  return resolveTierForStep(mode, spec)
}

export function enforceStepSpecs(
  questions: PracticeQuestion[],
  lesson: LessonData,
  mode: PracticeMode,
  fromIndex: number,
  rawRows: unknown[],
  choiceLikeWrongCountBefore?: number,
  priorSessionPhrases: PriorSessionPhrase[] = []
): PracticeQuestion[] {
  if (mode === 'reference') return questions

  return questions.map((question, offset) => {
    const stepIndex = fromIndex + offset
    const spec = getPracticeStepSpec(mode, stepIndex)
    if (!spec) return question

    const raw = rawRows[offset]
    const tier = resolveTierForEnforce(mode, stepIndex, choiceLikeWrongCountBefore)
    let normalized =
      question.type === spec.type
        ? question
        : normalizeAiPracticeQuestion(raw, lesson, stepIndex, {
            forcedType: spec.type,
            distractorTier: tier,
            mode,
          })

    if (!normalized) return question

    if (tier && isChoiceLikePracticeType(normalized.type)) {
      const resolved = resolvePracticeLessonStep({
        lesson,
        practiceIndex: stepIndex,
        practiceType: normalized.type,
        mode,
      })
      const granularity = inferChoiceGranularity({
        targetAnswer: normalized.targetAnswer,
        answerFormat: resolved?.exercise.answerFormat,
        prompt: normalized.prompt,
        exerciseType: resolved?.exercise.type,
      })
      const isDropdown = normalized.type === 'dropdown-fill'
      const gapSlot = isDropdown
        ? inferGapWordSlot({ targetAnswer: normalized.targetAnswer, prompt: normalized.prompt })
        : undefined
      const filteredCanonical = filterByChoiceGranularity(resolved?.canonicalOptions ?? [], granularity)
      const sanitizedCanonical = sanitizeCanonicalOptions({
        options: filteredCanonical,
        targetAnswer: normalized.targetAnswer,
        prompt: normalized.prompt,
        granularity,
      })
      const lessonPool = collectLessonChoicePool(lesson, normalized.targetAnswer, {
        sourceStepNumber: resolved?.sourceStepNumber,
        granularity,
        applyGapWordSlot: isDropdown,
        gapSlot,
        lesson,
      })
      normalized = {
        ...normalized,
        options: buildTieredChoiceOptions(normalized.targetAnswer, tier, lessonPool, {
          granularity,
          canonicalOptions: sanitizedCanonical ?? resolved?.canonicalOptions,
          sourceStepOptionCount: sanitizedCanonical?.length ?? filteredCanonical.length,
          practiceType: normalized.type,
          prompt: normalized.prompt,
          lesson,
          mode,
        }),
      }
    }

    let extraWords = normalized.extraWords
    if (spec.type === 'word-builder-pro') {
      extraWords =
        sanitizeWordBuilderProExtraWords({
          targetAnswer: normalized.targetAnswer,
          candidates: extraWords,
          lesson,
        }) ?? buildWordBuilderProExtraWords(normalized.targetAnswer, lesson)
    }

    if (spec.type === 'roleplay-mini' && stepIndex === CHALLENGE_ROLEPLAY_INDEX) {
      const prior = [
        ...priorSessionPhrases,
        ...questions.slice(0, offset).map((item, batchOffset) => ({
          stepIndex: fromIndex + batchOffset,
          type: item.type,
          targetAnswer: item.targetAnswer,
          prompt: item.prompt,
        })),
      ]
      const anchor = selectRoleplayAnchor(prior)
      if (anchor) {
        const axis = inferRoleplayAxis(anchor.targetAnswer, lesson)
        normalized = {
          ...normalized,
          type: 'roleplay-mini',
          targetAnswer: anchor.targetAnswer,
          acceptedAnswers: Array.from(
            new Set([anchor.targetAnswer, ...normalized.acceptedAnswers])
          ),
          prompt: buildRoleplayPromptFromAnchor(anchor, lesson),
          hint: buildRoleplayHint(axis, lesson.id),
          keywords: extractRoleplayKeywords(anchor.targetAnswer, lesson),
          minWords: 2,
        }
      } else if (!roleplayPromptHasContext(normalized.prompt)) {
        const axis = inferRoleplayAxis(normalized.targetAnswer, lesson)
        normalized = {
          ...normalized,
          hint: buildRoleplayHint(axis, lesson.id),
          keywords: extractRoleplayKeywords(normalized.targetAnswer, lesson),
          minWords: 2,
        }
      }
    }

    return { ...normalized, extraWords }
  })
}
