import type {
  BubbleType,
  Exercise,
  ExerciseType,
  LessonAnswerFormat,
  LessonAnswerPolicy,
  LessonData,
  LessonRepeatStepBlueprint,
  LessonStep,
} from '@/types/lesson'
import type { Audience, LevelId } from '@/lib/types'
import { getCefrDenyWords, getCefrSpec, buildCefrPromptBlock } from '@/lib/cefr/cefrSpec.server'
import { detectBrokenEnglishPattern } from '@/lib/englishPatternGuard'
import {
  collectTranslateExpectedAnswers,
  englishPhrasesCollideWithAnswers,
  infoSupportCollidesWithTranslateAnswers,
  mergeTranslateExerciseForAnswers,
} from '@/lib/lessonExampleAnswerCollision'

/** Текст карточек: тот же формат, что ожидает `UnifiedLessonBubble` (см. вступление `LessonIntroScreen`). */
const BUBBLE_CONTENT_FORMAT_RULES = [
  'Оформление поля content в bubbles (как у локальных уроков в приложении):',
  'Если в одном bubble больше одной строки: первая строка — короткий заголовок; для type positive префикс заголовка «🟡 », для info — «⚪ », для task — «🟢 ».',
  'Списки: строки с префиксом «• ». Примеры: «✓ English sentence → русский (краткое пояснение)».',
  'Без markdown (** __ #) и без HTML — только обычный текст с переносами строк.',
].join('\n')

export type GeneratedExercisePayload = {
  question?: unknown
  options?: unknown
  correctAnswer?: unknown
  acceptedAnswers?: unknown
  hint?: unknown
  puzzleVariants?: unknown
  bonusXp?: unknown
}

export type GeneratedStepPayload = {
  stepNumber?: unknown
  bubbles?: Array<{ type?: unknown; content?: unknown }>
  exercise?: GeneratedExercisePayload
  footerDynamic?: unknown
}

export type LessonValidationIssue = {
  stepNumber: number | null
  severity: 'hard' | 'soft'
  code: string
  message: string
}

export type LessonValidationResult = {
  accepted: boolean
  validatedSteps: GeneratedStepPayload[] | null
  issues: LessonValidationIssue[]
  score: number
  maxScore: number
}

export type LessonValidationOptions = {
  audience?: Audience
}

export function createLessonRunKey(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function cloneLessonWithNewRunKey(lesson: LessonData): LessonData {
  return {
    ...lesson,
    runKey: createLessonRunKey(),
    steps: lesson.steps.map((step) => ({
      ...step,
      bubbles: step.bubbles.map((bubble) => ({ ...bubble })) as LessonStep['bubbles'],
      ...(step.exercise
        ? {
            exercise: {
              ...step.exercise,
              ...(step.exercise.options ? { options: [...step.exercise.options] } : {}),
              ...(step.exercise.acceptedAnswers ? { acceptedAnswers: [...step.exercise.acceptedAnswers] } : {}),
              ...(step.exercise.variants
                ? {
                    variants: step.exercise.variants.map((variant) => ({
                      ...variant,
                      ...(variant.options ? { options: [...variant.options] } : {}),
                      ...(variant.acceptedAnswers ? { acceptedAnswers: [...variant.acceptedAnswers] } : {}),
                    })),
                  }
                : {}),
              ...(step.exercise.puzzleVariants
                ? {
                    puzzleVariants: step.exercise.puzzleVariants.map((variant) => ({
                      ...variant,
                      words: [...variant.words],
                      correctOrder: [...variant.correctOrder],
                    })) as typeof step.exercise.puzzleVariants,
                  }
                : {}),
              ...(typeof step.exercise.bonusXp === 'number' ? { bonusXp: step.exercise.bonusXp } : {}),
              ...(step.exercise.adaptive ? { adaptive: { ...step.exercise.adaptive } } : {}),
              ...(step.exercise.difficultyProfile ? { difficultyProfile: { ...step.exercise.difficultyProfile } } : {}),
            },
          }
        : {}),
      ...(step.postLesson
        ? {
            postLesson: {
              ...step.postLesson,
              options: step.postLesson.options.map((option) => ({ ...option })),
            },
          }
        : {}),
    })),
    ...(lesson.finale
      ? {
          finale: {
            ...lesson.finale,
            bubbles: lesson.finale.bubbles.map((bubble) => ({ ...bubble })) as NonNullable<LessonData['finale']>['bubbles'],
            postLesson: {
              ...lesson.finale.postLesson,
              options: lesson.finale.postLesson.options.map((option) => ({ ...option })),
            },
          },
        }
      : {}),
  }
}

export function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return ''
}

function isBubbleType(value: unknown): value is BubbleType {
  return value === 'positive' || value === 'info' || value === 'task'
}

function isExerciseType(value: unknown): value is ExerciseType {
  return (
    value === 'fill_choice' ||
    value === 'fill_text' ||
    value === 'translate' ||
    value === 'write_own' ||
    value === 'match' ||
    value === 'micro_quiz' ||
    value === 'sentence_puzzle'
  )
}

function normalizeForSemanticCheck(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function normalizeForPolicyCheck(value: string): string {
  return value.trim().toLowerCase().replace(/[.,!?;:]/g, '')
}

function toSemanticText(step: GeneratedStepPayload): string {
  const bubbles = Array.isArray(step.bubbles) ? step.bubbles.map((bubble) => String(bubble.content ?? '')).join(' ') : ''
  const exercise = step.exercise
    ? [
        typeof step.exercise.question === 'string' ? step.exercise.question : '',
        typeof step.exercise.correctAnswer === 'string' ? step.exercise.correctAnswer : '',
        Array.isArray(step.exercise.options) ? step.exercise.options.filter((item): item is string => typeof item === 'string').join(' ') : '',
        Array.isArray(step.exercise.puzzleVariants)
          ? step.exercise.puzzleVariants
              .map((variant) =>
                variant && typeof variant === 'object'
                  ? [
                      String((variant as { title?: unknown }).title ?? ''),
                      String((variant as { instruction?: unknown }).instruction ?? ''),
                      String((variant as { correctAnswer?: unknown }).correctAnswer ?? ''),
                    ].join(' ')
                  : ''
              )
              .join(' ')
          : '',
        Array.isArray(step.exercise.variants)
          ? step.exercise.variants
              .map((variant) =>
                variant && typeof variant === 'object'
                  ? [
                      String((variant as { question?: unknown }).question ?? ''),
                      String((variant as { correctAnswer?: unknown }).correctAnswer ?? ''),
                      Array.isArray((variant as { options?: unknown }).options)
                        ? ((variant as { options?: unknown }).options as unknown[])
                            .filter((item): item is string => typeof item === 'string')
                            .join(' ')
                        : '',
                    ].join(' ')
                  : ''
              )
              .join(' ')
          : '',
      ].join(' ')
    : ''
  return normalizeForSemanticCheck(`${bubbles} ${exercise} ${typeof step.footerDynamic === 'string' ? step.footerDynamic : ''}`)
}

function matchesSemanticAnchors(text: string, blueprint: LessonRepeatStepBlueprint): boolean {
  const anchors = blueprint.semanticAnchors?.map((anchor) => normalizeForSemanticCheck(anchor)).filter(Boolean) ?? []
  if (anchors.length === 0) return true
  return anchors.some((anchor) => text.includes(anchor))
}

function matchesStepRole(step: GeneratedStepPayload, blueprint: LessonRepeatStepBlueprint): boolean {
  const exercise = step.exercise
  if (blueprint.stepType === 'completion') {
    return exercise === undefined
  }
  if (!exercise) return false
  if (blueprint.answerFormat === 'single_word' && typeof exercise.correctAnswer === 'string') {
    return !/\s/.test(exercise.correctAnswer.trim())
  }
  if (blueprint.answerFormat === 'full_sentence' && typeof exercise.correctAnswer === 'string') {
    return /\s/.test(exercise.correctAnswer.trim())
  }
  if (blueprint.answerFormat === 'choice' && Array.isArray(exercise.options)) {
    if (blueprint.exerciseType === 'micro_quiz') {
      return exercise.options.length >= 2
    }
    return exercise.options.length === 3
  }
  return true
}

function containsBannedTerms(text: string, lesson: LessonData): boolean {
  const banned = lesson.repeatConfig?.bannedTerms?.map((item) => normalizeForSemanticCheck(item)).filter(Boolean) ?? []
  return banned.some((term) => text.includes(term))
}

function hasCyrillic(text: string): boolean {
  return /[А-Яа-яЁё]/.test(text)
}

function hasLatin(text: string): boolean {
  return /[A-Za-z]/.test(text)
}

function extractEnglishTokens(text: string): string[] {
  return normalizeForPolicyCheck(text)
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z']/g, ''))
    .filter(Boolean)
}

function englishFrameTokens(blueprint: LessonRepeatStepBlueprint | undefined, correctAnswer: string): string[] {
  const raw = [
    correctAnswer,
    blueprint?.sourceCorrectAnswer ?? '',
    blueprint?.sourcePattern ?? '',
    ...(blueprint?.semanticAnchors ?? []),
  ].join(' ')
  return Array.from(new Set(extractEnglishTokens(raw))).filter((token) => token.length >= 2)
}

function overlapSize(left: string[], right: string[]): number {
  const rightSet = new Set(right)
  return left.filter((item) => rightSet.has(item)).length
}

function buildAnswerFrequencyMap(steps: Array<LessonStep | GeneratedStepPayload>): Map<string, number> {
  const frequency = new Map<string, number>()
  for (const step of steps) {
    const answer = typeof step.exercise?.correctAnswer === 'string' ? normalizeForSemanticCheck(step.exercise.correctAnswer) : ''
    if (!answer) continue
    frequency.set(answer, (frequency.get(answer) ?? 0) + 1)
  }
  return frequency
}

function normalizeLessonLevelToCefrLevel(level: LessonData['level']): LevelId {
  return level.toLowerCase() as LevelId
}

function englishWordCount(text: string): number {
  return (text.match(/[A-Za-z][A-Za-z'-]*/g) ?? []).length
}

function tooLongEnglishTokens(text: string, maxTokenLength: number): string[] {
  return extractEnglishTokens(text).filter((token) => token.length > maxTokenLength)
}

function deniedEnglishWords(text: string, denyWords: Set<string>): string[] {
  const tokens = extractEnglishTokens(text)
  return Array.from(new Set(tokens.filter((token) => denyWords.has(token))))
}

const TRANSLATE_PROMPT_PREFIX = /Переведите на английский:\s*/i

export function extractRussianTranslatePromptSegment(question: string): string | null {
  const trimmed = question.trim()
  if (!TRANSLATE_PROMPT_PREFIX.test(trimmed)) return null
  const afterPrefix = trimmed.replace(TRANSLATE_PROMPT_PREFIX, '')
  const match = afterPrefix.match(/^"([^"]*)"/)
  return match?.[1] ?? null
}

function answerLeakedInRussianPrompt(russianSegment: string, correctAnswer: string): boolean {
  const normalizedRu = normalizeForPolicyCheck(russianSegment)
  const normalizedAnswer = normalizeForPolicyCheck(correctAnswer)
  if (!normalizedAnswer) return false
  if (normalizedRu.includes(normalizedAnswer)) return true
  const answerTokens = extractEnglishTokens(correctAnswer).filter((token) => token.length >= 2)
  if (answerTokens.length === 0) return false
  return answerTokens.every((token) => normalizedRu.includes(token))
}

function validateRussianTranslatePrompt(params: {
  question: string
  correctAnswer: string
  stepNumber: number
  allowEnglishInRussianPrompt?: boolean
}): LessonValidationIssue[] {
  if (params.allowEnglishInRussianPrompt) return []
  const russianSegment = extractRussianTranslatePromptSegment(params.question)
  if (!russianSegment) return []
  const issues: LessonValidationIssue[] = []
  if (hasLatin(russianSegment)) {
    issues.push(
      issue(
        'hard',
        'russian_prompt_contains_latin',
        'Русская часть «Переведите на английский» не должна содержать латиницу или английские слова.',
        params.stepNumber
      )
    )
  }
  if (params.correctAnswer && answerLeakedInRussianPrompt(russianSegment, params.correctAnswer)) {
    issues.push(
      issue(
        'hard',
        'answer_leaked_in_russian_prompt',
        'Русская часть задания не должна раскрывать correctAnswer.',
        params.stepNumber
      )
    )
  }
  return issues
}

function extractEmbeddedEnglishSegments(text: string): string[] {
  const matches = text.match(/[A-Za-z][A-Za-z\s'",.?!:;-]*[A-Za-z?.!]/g) ?? []
  return Array.from(
    new Set(
      matches
        .map((item) => item.replace(/\s+/g, ' ').trim())
        .filter((item) => hasLatin(item) && englishWordCount(item) > 0)
    )
  )
}

function validateCefrEnglishText(params: {
  text: string
  lesson: LessonData
  audience: Audience
  stepNumber: number
  label: 'correct_answer' | 'accepted_answer' | 'choice_option' | 'bubble_content' | 'footer_dynamic' | 'hint'
}): LessonValidationIssue[] {
  const issues: LessonValidationIssue[] = []
  const text = params.text.trim()
  if (!text) return issues
  const level = normalizeLessonLevelToCefrLevel(params.lesson.level)
  const spec = getCefrSpec(level)
  const denyWords = getCefrDenyWords({ level, audience: params.audience })
  const wordCount = englishWordCount(text)
  if (spec && wordCount > spec.maxSentenceWords) {
    issues.push(
      issue(
        'soft',
        'cefr_sentence_too_long',
        `${params.label} длиннее рекомендуемого лимита для ${params.lesson.level} (${wordCount} > ${spec.maxSentenceWords}).`,
        params.stepNumber
      )
    )
  }
  if (spec) {
    const tooLong = tooLongEnglishTokens(text, spec.maxTokenLength)
    if (tooLong.length > 0) {
      issues.push(
        issue(
          'soft',
          'cefr_token_too_complex',
          `${params.label} содержит слишком длинные/сложные токены для ${params.lesson.level}: ${tooLong.slice(0, 5).join(', ')}.`,
          params.stepNumber
        )
      )
    }
  }
  const denied = deniedEnglishWords(text, denyWords)
  if (denied.length > 0) {
    issues.push(
      issue(
        'hard',
        'cefr_deny_word',
        `${params.label} содержит слова выше рекомендуемого CEFR-уровня: ${denied.slice(0, 5).join(', ')}.`,
        params.stepNumber
      )
    )
  }
  return issues
}

function validateEmbeddedEnglishInMixedText(params: {
  text: string
  lesson: LessonData
  audience: Audience
  stepNumber: number
  label: 'bubble_content' | 'footer_dynamic' | 'hint'
}): LessonValidationIssue[] {
  const segments = extractEmbeddedEnglishSegments(params.text)
  return segments.flatMap((segment) =>
    validateCefrEnglishText({
      text: segment,
      lesson: params.lesson,
      audience: params.audience,
      stepNumber: params.stepNumber,
      label: params.label,
    })
  )
}

function getAnswerPolicy(blueprint?: LessonRepeatStepBlueprint): LessonAnswerPolicy {
  return blueprint?.answerPolicy ?? 'normalized'
}

function getQualityGate(lesson: LessonData) {
  return lesson.repeatConfig?.qualityGate ?? { minScore: 0.6, maxSoftIssues: 3, rejectOnHardFailures: true }
}

function getAcceptedAnswerLimit(policy: LessonAnswerPolicy, blueprint?: LessonRepeatStepBlueprint): number {
  const configured = blueprint?.semanticExpectations?.maxAcceptedAnswers
  if (typeof configured === 'number' && configured > 0) return configured
  if (policy === 'strict') return 1
  if (policy === 'normalized') return 2
  return 4
}

function uniqueAcceptedAnswers(correctAnswer: string, acceptedAnswers: unknown): string[] {
  const extras = Array.isArray(acceptedAnswers)
    ? acceptedAnswers.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  return Array.from(new Set([correctAnswer, ...extras].map((item) => item.trim()).filter(Boolean)))
}

function issue(
  severity: 'hard' | 'soft',
  code: string,
  message: string,
  stepNumber: number | null
): LessonValidationIssue {
  return { severity, code, message, stepNumber }
}

function validateGeneratedStepShape(
  sourceStep: LessonStep,
  candidateStep: unknown,
  blueprint?: LessonRepeatStepBlueprint
): { issues: LessonValidationIssue[]; step: GeneratedStepPayload | null } {
  const issues: LessonValidationIssue[] = []
  const row = candidateStep as GeneratedStepPayload
  if (typeof row !== 'object' || row === null) {
    issues.push(issue('hard', 'step_not_object', 'Шаг должен быть объектом.', sourceStep.stepNumber))
    return { issues, step: null }
  }
  if (row.stepNumber !== sourceStep.stepNumber) {
    issues.push(issue('hard', 'wrong_step_number', 'stepNumber не совпадает с каноническим шагом.', sourceStep.stepNumber))
  }
  if (typeof row.footerDynamic !== 'string') {
    issues.push(issue('hard', 'missing_footer_dynamic', 'Нужен footerDynamic.', sourceStep.stepNumber))
  }
  if (!Array.isArray(row.bubbles) || row.bubbles.length !== 3) {
    issues.push(issue('hard', 'invalid_bubbles', 'У шага должно быть ровно 3 bubble.', sourceStep.stepNumber))
  } else {
    const validBubbles = row.bubbles.every(
      (bubble) => bubble && isBubbleType(bubble.type) && typeof bubble.content === 'string'
    )
    if (!validBubbles) {
      issues.push(issue('hard', 'invalid_bubble_shape', 'Bubble имеет неверную форму.', sourceStep.stepNumber))
    }
  }
  if (sourceStep.exercise) {
    if (!isExerciseType(sourceStep.exercise.type)) {
      issues.push(issue('hard', 'unsupported_exercise_type', 'Неподдерживаемый тип упражнения.', sourceStep.stepNumber))
    }
    if (!row.exercise) {
      issues.push(issue('hard', 'missing_exercise', 'Для шага ожидается exercise.', sourceStep.stepNumber))
      return { issues, step: row }
    }
    if (typeof row.exercise.question !== 'string' || typeof row.exercise.correctAnswer !== 'string') {
      issues.push(issue('hard', 'invalid_exercise_text', 'question и correctAnswer должны быть строками.', sourceStep.stepNumber))
    }
    if (row.exercise.hint !== undefined && typeof row.exercise.hint !== 'string') {
      issues.push(issue('hard', 'invalid_hint', 'hint должен быть строкой.', sourceStep.stepNumber))
    }
    if (row.exercise.acceptedAnswers !== undefined && !Array.isArray(row.exercise.acceptedAnswers)) {
      issues.push(issue('hard', 'invalid_accepted_answers', 'acceptedAnswers должен быть массивом.', sourceStep.stepNumber))
    }
    if (sourceStep.exercise.type === 'fill_choice' || sourceStep.exercise.type === 'micro_quiz') {
      const requiresExactThreeOptions = sourceStep.exercise.type === 'fill_choice'
      if (
        !Array.isArray(row.exercise.options) ||
        (requiresExactThreeOptions ? row.exercise.options.length !== 3 : row.exercise.options.length < 2)
      ) {
        issues.push(
          issue(
            'hard',
            'invalid_choice_options',
            requiresExactThreeOptions ? 'fill_choice требует ровно 3 options.' : 'micro_quiz требует минимум 2 options.',
            sourceStep.stepNumber
          )
        )
      } else {
        const options = row.exercise.options.filter((item): item is string => typeof item === 'string')
        if (options.length !== row.exercise.options.length) {
          issues.push(issue('hard', 'non_string_choice_option', 'Все options должны быть строками.', sourceStep.stepNumber))
        }
        if (!options.includes(row.exercise.correctAnswer as string)) {
          issues.push(issue('hard', 'choice_missing_correct', 'correctAnswer должен входить в options.', sourceStep.stepNumber))
        }
        if (new Set(options.map((item) => normalizeForPolicyCheck(item))).size !== options.length) {
          issues.push(issue('hard', 'duplicate_choice_options', 'options не должны дублироваться.', sourceStep.stepNumber))
        }
      }
      if (sourceStep.stepNumber === 7 && (sourceStep.exercise.variants?.length ?? 0) >= 3) {
        const variants = row.exercise.variants
        if (!Array.isArray(variants) || variants.length !== 3) {
          issues.push(
            issue('hard', 'invalid_step7_contrast_variants', 'Шаг 7 требует ровно 3 exercise.variants (easy, medium, hard).', sourceStep.stepNumber)
          )
        } else {
          for (const [variantIndex, variant] of variants.entries()) {
            const item = variant as { question?: unknown; correctAnswer?: unknown; options?: unknown }
            if (typeof item.question !== 'string' || typeof item.correctAnswer !== 'string') {
              issues.push(
                issue(
                  'hard',
                  'invalid_step7_variant_shape',
                  `step7 variant ${variantIndex + 1}: нужны question и correctAnswer.`,
                  sourceStep.stepNumber
                )
              )
            } else if (/\s/.test(item.correctAnswer.trim())) {
              issues.push(
                issue(
                  'hard',
                  'step7_answer_must_be_single_word',
                  `step7 variant ${variantIndex + 1}: correctAnswer — одно слово без пробелов.`,
                  sourceStep.stepNumber
                )
              )
            }
            if (!Array.isArray(item.options) || item.options.length !== 3) {
              issues.push(
                issue(
                  'hard',
                  'invalid_step7_variant_options',
                  `step7 variant ${variantIndex + 1}: нужны ровно 3 однословных options.`,
                  sourceStep.stepNumber
                )
              )
            } else {
              const variantOptions = item.options.filter((option): option is string => typeof option === 'string')
              if (
                variantOptions.length !== 3 ||
                variantOptions.some((option) => /\s/.test(option.trim())) ||
                !variantOptions.includes(item.correctAnswer as string)
              ) {
                issues.push(
                  issue(
                    'hard',
                    'invalid_step7_variant_options',
                    `step7 variant ${variantIndex + 1}: options — 3 однословных строки, correctAnswer ∈ options.`,
                    sourceStep.stepNumber
                  )
                )
              }
            }
          }
        }
        if (row.exercise.puzzleVariants !== undefined) {
          issues.push(issue('hard', 'step7_has_puzzle_variants', 'Шаг 7 не должен содержать puzzleVariants.', sourceStep.stepNumber))
        }
      }
    } else if (sourceStep.exercise.type === 'sentence_puzzle') {
      const puzzleVariants = row.exercise.puzzleVariants
      if (!Array.isArray(puzzleVariants) || puzzleVariants.length !== 3) {
        issues.push(issue('hard', 'invalid_sentence_puzzle_variants', 'sentence_puzzle требует ровно 3 puzzle-варианта.', sourceStep.stepNumber))
      } else {
        for (const [variantIndex, variant] of puzzleVariants.entries()) {
          const item = variant as {
            title?: unknown
            instruction?: unknown
            words?: unknown
            correctOrder?: unknown
            correctAnswer?: unknown
            successText?: unknown
            errorText?: unknown
            hintText?: unknown
            myEngComment?: unknown
          }
          const label = `sentence_puzzle variant ${variantIndex + 1}`
          if (
            typeof item.title !== 'string' ||
            typeof item.instruction !== 'string' ||
            typeof item.correctAnswer !== 'string' ||
            typeof item.successText !== 'string' ||
            typeof item.errorText !== 'string' ||
            typeof item.hintText !== 'string' ||
            typeof item.myEngComment !== 'string'
          ) {
            issues.push(issue('hard', 'invalid_sentence_puzzle_text_blocks', `${label}: нужны все текстовые блоки.`, sourceStep.stepNumber))
          }
          if (!Array.isArray(item.words) || !Array.isArray(item.correctOrder) || item.correctOrder.length === 0) {
            issues.push(issue('hard', 'invalid_sentence_puzzle_words', `${label}: нужны words и correctOrder.`, sourceStep.stepNumber))
          } else if (item.words.length !== item.correctOrder.length) {
            issues.push(issue('hard', 'sentence_puzzle_word_count_mismatch', `${label}: words и correctOrder должны быть одной длины.`, sourceStep.stepNumber))
          } else if (![...item.words, ...item.correctOrder].every((word) => typeof word === 'string' && word.trim().length > 0)) {
            issues.push(issue('hard', 'sentence_puzzle_non_string_word', `${label}: все слова должны быть непустыми строками.`, sourceStep.stepNumber))
          }
        }
      }
      if (row.exercise.bonusXp !== undefined && typeof row.exercise.bonusXp !== 'number') {
        issues.push(issue('hard', 'invalid_sentence_puzzle_bonus', 'bonusXp должен быть числом.', sourceStep.stepNumber))
      }
    } else if (sourceStep.stepNumber === 6 && (sourceStep.exercise.variants?.length ?? 0) >= 3) {
      const variants = row.exercise.variants
      if (!Array.isArray(variants) || variants.length !== 3) {
        issues.push(
          issue('hard', 'invalid_step6_exam_variants', 'Шаг 6 требует ровно 3 exercise.variants (easy, medium, hard).', sourceStep.stepNumber)
        )
      } else {
        for (const [variantIndex, variant] of variants.entries()) {
          const item = variant as { question?: unknown; correctAnswer?: unknown; difficulty?: unknown }
          if (typeof item.question !== 'string' || typeof item.correctAnswer !== 'string') {
            issues.push(
              issue(
                'hard',
                'invalid_step6_variant_shape',
                `step6 variant ${variantIndex + 1}: нужны question и correctAnswer.`,
                sourceStep.stepNumber
              )
            )
          }
        }
      }
      if (row.exercise.puzzleVariants !== undefined) {
        issues.push(issue('hard', 'step6_has_puzzle_variants', 'Шаг 6 не должен содержать puzzleVariants.', sourceStep.stepNumber))
      }
      if (row.exercise.options !== undefined) {
        issues.push(issue('hard', 'step6_has_options', 'Шаг 6 не должен содержать options.', sourceStep.stepNumber))
      }
    } else if (row.exercise.options !== undefined && !Array.isArray(row.exercise.options)) {
      issues.push(issue('hard', 'unexpected_options_shape', 'options должны быть массивом, если они переданы.', sourceStep.stepNumber))
    }
    if (blueprint?.answerFormat === 'single_word' && typeof row.exercise.correctAnswer === 'string' && /\s/.test(row.exercise.correctAnswer.trim())) {
      issues.push(issue('hard', 'single_word_answer_has_spaces', 'single_word ответ не должен содержать пробелы.', sourceStep.stepNumber))
    }
  } else if (row.exercise !== undefined) {
    issues.push(issue('hard', 'unexpected_exercise', 'У completion-шага не должно быть exercise.', sourceStep.stepNumber))
  }
  return { issues, step: row }
}

function validateGeneratedStepSemantics(
  lesson: LessonData,
  sourceStep: LessonStep,
  candidateStep: GeneratedStepPayload,
  blueprint: LessonRepeatStepBlueprint | undefined,
  audience: Audience
): { issues: LessonValidationIssue[]; score: number; maxScore: number } {
  const issues: LessonValidationIssue[] = []
  let score = 0
  let maxScore = 0
  const expectations = blueprint?.semanticExpectations
  const semanticText = toSemanticText(candidateStep)
  const infoBubble = Array.isArray(candidateStep.bubbles) ? String(candidateStep.bubbles[1]?.content ?? '') : ''
  const taskBubble = Array.isArray(candidateStep.bubbles) ? String(candidateStep.bubbles[2]?.content ?? '') : ''
  const footerDynamic = typeof candidateStep.footerDynamic === 'string' ? candidateStep.footerDynamic : ''
  const hint = typeof candidateStep.exercise?.hint === 'string' ? candidateStep.exercise.hint : ''
  const correctAnswer = typeof candidateStep.exercise?.correctAnswer === 'string' ? candidateStep.exercise.correctAnswer.trim() : ''
  const explanatoryText = `${infoBubble} ${hint}`.trim()
  const answerPolicy = getAnswerPolicy(blueprint)
  const acceptedAnswers = correctAnswer
    ? uniqueAcceptedAnswers(correctAnswer, candidateStep.exercise?.acceptedAnswers)
    : []
  const answerLimit = getAcceptedAnswerLimit(answerPolicy, blueprint)
  const frameTokens = englishFrameTokens(blueprint, correctAnswer)

  if (containsBannedTerms(semanticText, lesson)) {
    issues.push(issue('hard', 'banned_term_detected', 'Шаг содержит запрещённую грамматику или термин.', sourceStep.stepNumber))
  }
  if (blueprint && !matchesStepRole(candidateStep, blueprint)) {
    issues.push(issue('hard', 'step_role_mismatch', 'Шаг не соответствует ожидаемой учебной роли.', sourceStep.stepNumber))
  }
  if (expectations?.mustInclude?.length) {
    const missing = expectations.mustInclude
      .map((item) => normalizeForSemanticCheck(item))
      .filter((item) => !semanticText.includes(item))
    if (missing.length > 0) {
      issues.push(
        issue('hard', 'missing_required_semantics', `Шаг потерял обязательные смысловые маркеры: ${missing.join(', ')}.`, sourceStep.stepNumber)
      )
    }
  }
  if (expectations?.mustAvoid?.length) {
    const matched = expectations.mustAvoid
      .map((item) => normalizeForSemanticCheck(item))
      .filter((item) => semanticText.includes(item))
    if (matched.length > 0) {
      issues.push(
        issue('hard', 'forbidden_semantics_present', `Шаг содержит запрещённые смысловые маркеры: ${matched.join(', ')}.`, sourceStep.stepNumber)
      )
    }
  }
  if (candidateStep.exercise && typeof candidateStep.exercise.question === 'string' && !hasCyrillic(candidateStep.exercise.question)) {
    issues.push(issue('soft', 'exercise_question_not_russian', 'Question лучше держать на русском для structured lesson.', sourceStep.stepNumber))
  }
  if (candidateStep.exercise && typeof candidateStep.exercise.question === 'string' && correctAnswer) {
    issues.push(
      ...validateRussianTranslatePrompt({
        question: candidateStep.exercise.question,
        correctAnswer,
        stepNumber: sourceStep.stepNumber,
        allowEnglishInRussianPrompt: expectations?.allowEnglishInRussianPrompt,
      })
    )
  }
  const mergedTranslateExercise =
    sourceStep.exercise?.type === 'translate'
      ? mergeTranslateExerciseForAnswers(
          candidateStep.exercise as Exercise | undefined,
          sourceStep.exercise
        )
      : null
  const translateExpectedAnswers = mergedTranslateExercise
    ? collectTranslateExpectedAnswers(mergedTranslateExercise)
    : []

  if (hint && translateExpectedAnswers.length > 0 && sourceStep.exercise?.type === 'translate') {
    const hintRevealsTranslateAnswer =
      englishPhrasesCollideWithAnswers([hint], translateExpectedAnswers) ||
      translateExpectedAnswers.some((answer) =>
        normalizeForPolicyCheck(hint).includes(normalizeForPolicyCheck(answer))
      )
    if (hintRevealsTranslateAnswer) {
      issues.push(issue('hard', 'hint_reveals_answer', 'Hint не должен раскрывать правильный ответ напрямую.', sourceStep.stepNumber))
    }
  } else if (hint && correctAnswer && normalizeForPolicyCheck(hint).includes(normalizeForPolicyCheck(correctAnswer))) {
    issues.push(issue('hard', 'hint_reveals_answer', 'Hint не должен раскрывать правильный ответ напрямую.', sourceStep.stepNumber))
  }

  if (sourceStep.exercise?.type === 'translate' && mergedTranslateExercise) {
    if (infoSupportCollidesWithTranslateAnswers(infoBubble, mergedTranslateExercise)) {
      issues.push(
        issue(
          'hard',
          'example_matches_translate_answer',
          'Пример или английская подсказка в info не должны совпадать с ожидаемым переводом (ни с одним вариантом ответа).',
          sourceStep.stepNumber
        )
      )
    }
  }

  if (sourceStep.stepNumber === 7 && sourceStep.exercise?.type === 'fill_choice' && explanatoryText) {
    const gapAnswers = [
      ...(sourceStep.exercise.variants?.flatMap((variant) => [
        variant.correctAnswer,
        ...(variant.options ?? []),
      ]) ?? []),
      ...(Array.isArray(candidateStep.exercise?.variants)
        ? candidateStep.exercise.variants.flatMap((variant) => {
            const item = variant as { correctAnswer?: unknown; options?: unknown }
            const options = Array.isArray(item.options) ? item.options.filter((option): option is string => typeof option === 'string') : []
            return [
              typeof item.correctAnswer === 'string' ? item.correctAnswer : '',
              ...options,
            ]
          })
        : []),
    ].filter(Boolean)
    const revealsGapAnswer = gapAnswers.some(
      (answer) => answer && normalizeForPolicyCheck(explanatoryText).includes(normalizeForPolicyCheck(answer))
    )
    if (revealsGapAnswer) {
      issues.push(
        issue(
          'hard',
          'step7_info_reveals_gap_answer',
          'Info и hint на шаге 7 не должны содержать слова из options или correctAnswer.',
          sourceStep.stepNumber
        )
      )
    }
  }
  if (
    (sourceStep.stepType === 'practice_fill' || sourceStep.stepType === 'practice_match') &&
    sourceStep.exercise &&
    sourceStep.exercise.type !== 'translate' &&
    explanatoryText
  ) {
    const supportAnswers = uniqueAcceptedAnswers(
      sourceStep.exercise.correctAnswer,
      [
        ...(sourceStep.exercise.acceptedAnswers ?? []),
        ...(Array.isArray(candidateStep.exercise?.acceptedAnswers) ? candidateStep.exercise.acceptedAnswers : []),
        ...(sourceStep.exercise.variants?.flatMap((variant) => [variant.correctAnswer, ...(variant.acceptedAnswers ?? [])]) ?? []),
      ]
    )
    const revealsAnswer = supportAnswers.some(
      (answer) => answer && normalizeForPolicyCheck(explanatoryText).includes(normalizeForPolicyCheck(answer))
    )
    if (revealsAnswer) {
      issues.push(
        issue(
          'hard',
          'support_reveals_answer',
          'Примеры, пояснения и hints не должны содержать правильный ответ.',
          sourceStep.stepNumber
        )
      )
    }
  }
  if (expectations?.requireCyrillicHint && candidateStep.exercise && hint && !hasCyrillic(hint)) {
    issues.push(issue('hard', 'hint_not_russian', 'Hint должен быть на русском.', sourceStep.stepNumber))
  }
  if (hint) {
    issues.push(
      ...validateEmbeddedEnglishInMixedText({
        text: hint,
        lesson,
        audience,
        stepNumber: sourceStep.stepNumber,
        label: 'hint',
      })
    )
  }
  if (expectations?.requireQuestionMarkInAnswer && correctAnswer && !correctAnswer.includes('?')) {
    issues.push(issue('hard', 'answer_missing_question_mark', 'Правильный ответ должен содержать вопросительный знак.', sourceStep.stepNumber))
  }
  if (sourceStep.exercise && acceptedAnswers.length > answerLimit) {
    issues.push(
      issue(
        'hard',
        'too_many_answer_variants',
        `Слишком много accepted answers для policy "${answerPolicy}" (${acceptedAnswers.length} > ${answerLimit}).`,
        sourceStep.stepNumber
      )
    )
  }
  if (sourceStep.exercise && answerPolicy !== 'equivalent_variants' && acceptedAnswers.length > 2) {
    issues.push(issue('hard', 'ambiguous_answer_policy', 'Широкий набор accepted answers требует policy equivalent_variants.', sourceStep.stepNumber))
  }
  if (Array.isArray(candidateStep.bubbles)) {
    for (const bubble of candidateStep.bubbles) {
      issues.push(
        ...validateEmbeddedEnglishInMixedText({
          text: String(bubble.content ?? ''),
          lesson,
          audience,
          stepNumber: sourceStep.stepNumber,
          label: 'bubble_content',
        })
      )
    }
  }
  issues.push(
    ...validateEmbeddedEnglishInMixedText({
      text: footerDynamic,
      lesson,
      audience,
      stepNumber: sourceStep.stepNumber,
      label: 'footer_dynamic',
    })
  )
  if (correctAnswer) {
    if (hasCyrillic(correctAnswer)) {
      issues.push(issue('hard', 'english_answer_contains_cyrillic', 'Correct answer не должен содержать кириллицу.', sourceStep.stepNumber))
    }
    if (!hasLatin(correctAnswer)) {
      issues.push(issue('hard', 'english_answer_missing_latin', 'Correct answer должен содержать английский текст.', sourceStep.stepNumber))
    }
    const brokenPattern = detectBrokenEnglishPattern(correctAnswer)
    if (brokenPattern) {
      issues.push(issue('hard', 'unnatural_english_answer', `Correct answer выглядит неестественно: ${brokenPattern}.`, sourceStep.stepNumber))
    }
    issues.push(
      ...validateCefrEnglishText({
        text: correctAnswer,
        lesson,
        audience,
        stepNumber: sourceStep.stepNumber,
        label: 'correct_answer',
      })
    )
  }
  if (Array.isArray(candidateStep.exercise?.options) && sourceStep.exercise?.type === 'fill_choice') {
    const options = candidateStep.exercise.options.filter((item): item is string => typeof item === 'string')
    for (const option of options) {
      if (hasCyrillic(option)) {
        issues.push(issue('hard', 'choice_option_contains_cyrillic', 'Английский option не должен содержать кириллицу.', sourceStep.stepNumber))
        continue
      }
      const brokenPattern = detectBrokenEnglishPattern(option)
      if (brokenPattern) {
        const optionIssueCode =
          normalizeForPolicyCheck(option) === normalizeForPolicyCheck(correctAnswer) ? 'correct_choice_unnatural' : 'choice_option_unnatural'
        issues.push(issue('hard', optionIssueCode, `Option выглядит неестественно: ${brokenPattern}.`, sourceStep.stepNumber))
      }
      issues.push(
        ...validateCefrEnglishText({
          text: option,
          lesson,
          audience,
          stepNumber: sourceStep.stepNumber,
          label: 'choice_option',
        })
      )
    }
    const distractors = options.filter((option) => normalizeForPolicyCheck(option) !== normalizeForPolicyCheck(correctAnswer))
    if (distractors.length > 0 && frameTokens.length > 0) {
      const weakDistractors = distractors.filter((option) => overlapSize(extractEnglishTokens(option), frameTokens) === 0)
      if (weakDistractors.length > 0) {
        issues.push(
          issue(
            'soft',
            'weak_choice_distractors',
            'Некоторые distractors слабо связаны с грамматическим шаблоном и могут быть методически слабыми.',
            sourceStep.stepNumber
          )
        )
      }
    }
  }
  if (acceptedAnswers.length > 1) {
    const normalizedSet = new Set(acceptedAnswers.map((item) => normalizeForPolicyCheck(item)))
    if (normalizedSet.size !== acceptedAnswers.length) {
      issues.push(issue('soft', 'duplicate_answer_variants', 'acceptedAnswers содержит почти дублирующиеся варианты.', sourceStep.stepNumber))
    }
  }
  for (const acceptedAnswer of acceptedAnswers.filter((item) => normalizeForPolicyCheck(item) !== normalizeForPolicyCheck(correctAnswer))) {
    issues.push(
      ...validateCefrEnglishText({
        text: acceptedAnswer,
        lesson,
        audience,
        stepNumber: sourceStep.stepNumber,
        label: 'accepted_answer',
      })
    )
  }

  if (blueprint?.semanticAnchors?.length) {
    maxScore += 1
    if (matchesSemanticAnchors(semanticText, blueprint)) {
      score += 1
    } else {
      issues.push(issue('soft', 'anchor_drift', 'Шаг сохранил структуру, но потерял часть исходного фокуса.', sourceStep.stepNumber))
    }
  }
  if (expectations?.shouldInclude?.length) {
    for (const part of expectations.shouldInclude) {
      maxScore += 1
      if (semanticText.includes(normalizeForSemanticCheck(part))) {
        score += 1
      } else {
        issues.push(issue('soft', 'missing_recommended_semantics', `Не найден желательный смысловой маркер: ${part}.`, sourceStep.stepNumber))
      }
    }
  }
  if (expectations?.hintShouldMention?.length && hint) {
    maxScore += 1
    const hintText = normalizeForSemanticCheck(hint)
    if (expectations.hintShouldMention.some((part) => hintText.includes(normalizeForSemanticCheck(part)))) {
      score += 1
    } else {
      issues.push(issue('soft', 'hint_not_instructional_enough', 'Hint слабо поддерживает учебную цель шага.', sourceStep.stepNumber))
    }
  }
  if (expectations?.pedagogicalRole === 'explain_rule') {
    maxScore += 1
    if (normalizeForSemanticCheck(infoBubble).length >= 20) {
      score += 1
    } else {
      issues.push(issue('soft', 'theory_too_thin', 'Theory-step должен содержать содержательное объяснение.', sourceStep.stepNumber))
    }
  }
  if (expectations?.pedagogicalRole === 'introduce_context') {
    maxScore += 1
    if (normalizeForSemanticCheck(taskBubble).length > 0 && normalizeForSemanticCheck(taskBubble).length <= 140) {
      score += 1
    } else {
      issues.push(issue('soft', 'hook_task_too_vague', 'Hook-step должен вводить тему коротко и понятно.', sourceStep.stepNumber))
    }
  }
  if (correctAnswer) {
    maxScore += 1
    if (!detectBrokenEnglishPattern(correctAnswer) && hasLatin(correctAnswer) && !hasCyrillic(correctAnswer)) {
      score += 1
    }
  }
  if (Array.isArray(candidateStep.exercise?.options) && sourceStep.exercise?.type === 'fill_choice') {
    maxScore += 1
    const options = candidateStep.exercise.options.filter((item): item is string => typeof item === 'string')
    const naturalEnough = options.every((option) => !hasCyrillic(option) && hasLatin(option))
    if (naturalEnough) {
      score += 1
    }
  }

  return { issues, score, maxScore }
}

function validateLessonCoherence(
  lesson: LessonData,
  sourceSteps: LessonStep[],
  generatedSteps: GeneratedStepPayload[]
): { issues: LessonValidationIssue[]; score: number; maxScore: number } {
  const issues: LessonValidationIssue[] = []
  let score = 0
  let maxScore = 0

  const taskTexts = generatedSteps.map((step) =>
    normalizeForSemanticCheck(Array.isArray(step.bubbles) ? String(step.bubbles[2]?.content ?? '') : '')
  )
  maxScore += 1
  if (new Set(taskTexts.filter(Boolean)).size >= Math.max(2, Math.ceil(taskTexts.filter(Boolean).length / 2))) {
    score += 1
  } else {
    issues.push(issue('soft', 'lesson_low_task_variation', 'Слишком мало различий между задачами шагов.', null))
  }

  const completionSource = sourceSteps.find((step) => step.stepType === 'completion')
  const completionGenerated = generatedSteps.find((step, index) => sourceSteps[index]?.stepType === 'completion')
  if (completionSource) {
    maxScore += 1
    if (completionGenerated && completionGenerated.exercise === undefined) {
      score += 1
    } else {
      issues.push(issue('soft', 'completion_shape_weakened', 'Completion-шаг потерял финальную роль.', completionSource.stepNumber))
    }
  }

  const lessonSemanticText = normalizeForSemanticCheck(
    generatedSteps
      .map((step) =>
        [Array.isArray(step.bubbles) ? step.bubbles.map((bubble) => String(bubble.content ?? '')).join(' ') : '', step.exercise?.correctAnswer ?? '']
          .join(' ')
      )
      .join(' ')
  )
  if (lesson.repeatConfig?.grammarFocus?.length) {
    maxScore += 1
    const hasGrammarSignal = lesson.repeatConfig.grammarFocus.some((focus) => {
      const parts = normalizeForSemanticCheck(focus).split(/\s+/).filter((part) => part.length > 2)
      return parts.some((part) => lessonSemanticText.includes(part))
    })
    if (hasGrammarSignal) {
      score += 1
    } else {
      issues.push(issue('soft', 'grammar_focus_not_visible', 'Во всём уроке слабо виден заявленный grammar focus.', null))
    }
  }

  const sourceAnswerFrequency = buildAnswerFrequencyMap(sourceSteps)
  const generatedAnswerFrequency = buildAnswerFrequencyMap(generatedSteps)
  const repeatedCorrectAnswerFound = Array.from(generatedAnswerFrequency.entries()).some(
    ([answer, count]) => count > 1 && count > (sourceAnswerFrequency.get(answer) ?? 0)
  )
  maxScore += 1
  if (repeatedCorrectAnswerFound) {
    issues.push(issue('hard', 'repeated_correct_answer', 'В эталоне повторился уже использованный правильный ответ.', null))
  } else {
    score += 1
  }

  return { issues, score, maxScore }
}

export function assessGeneratedSteps(
  sourceLesson: LessonData,
  sourceSteps: LessonStep[],
  candidateSteps: unknown,
  options?: LessonValidationOptions
): LessonValidationResult {
  if (!Array.isArray(candidateSteps) || candidateSteps.length !== sourceSteps.length) {
    return {
      accepted: false,
      validatedSteps: null,
      issues: [issue('hard', 'step_count_mismatch', 'Число шагов не совпадает с каноническим уроком.', null)],
      score: 0,
      maxScore: 0,
    }
  }
  const validated: GeneratedStepPayload[] = []
  const blueprints = sourceLesson.repeatConfig?.stepBlueprints ?? []
  const issues: LessonValidationIssue[] = []
  let score = 0
  let maxScore = 0
  const audience = options?.audience ?? 'adult'
  for (let index = 0; index < sourceSteps.length; index += 1) {
    const sourceStep = sourceSteps[index]
    const blueprint = blueprints[index]
    const shapeResult = validateGeneratedStepShape(sourceStep, candidateSteps[index], blueprint)
    issues.push(...shapeResult.issues)
    if (!shapeResult.step) continue
    validated.push(shapeResult.step)
    const semanticResult = validateGeneratedStepSemantics(sourceLesson, sourceStep, shapeResult.step, blueprint, audience)
    issues.push(...semanticResult.issues)
    score += semanticResult.score
    maxScore += semanticResult.maxScore
  }
  const coherence = validateLessonCoherence(sourceLesson, sourceSteps, validated)
  issues.push(...coherence.issues)
  score += coherence.score
  maxScore += coherence.maxScore

  const gate = getQualityGate(sourceLesson)
  const hardFailures = issues.filter((item) => item.severity === 'hard')
  const softFailures = issues.filter((item) => item.severity === 'soft')
  const finalScore = maxScore === 0 ? 1 : score / maxScore
  const maxHardAllowed = gate.rejectOnHardFailures ? (gate.maxAllowedHardIssues ?? 0) : Number.POSITIVE_INFINITY
  const accepted =
    validated.length === sourceSteps.length &&
    hardFailures.length <= maxHardAllowed &&
    softFailures.length <= gate.maxSoftIssues &&
    finalScore >= gate.minScore

  return {
    accepted,
    validatedSteps: accepted ? validated : null,
    issues,
    score: finalScore,
    maxScore,
  }
}

export function validateGeneratedSteps(
  sourceLesson: LessonData,
  sourceSteps: LessonStep[],
  candidateSteps: unknown,
  options?: LessonValidationOptions
): GeneratedStepPayload[] | null {
  return assessGeneratedSteps(sourceLesson, sourceSteps, candidateSteps, options).validatedSteps
}

export function formatLessonValidationIssues(issues: LessonValidationIssue[]): string {
  if (issues.length === 0) return 'no issues'
  return issues
    .map((item) => {
      const step = item.stepNumber === null ? 'lesson' : `step ${item.stepNumber}`
      return `[${item.severity}] ${step} ${item.code}: ${item.message}`
    })
    .join(' | ')
}

function mergeAcceptedAnswers(
  correctAnswer: string,
  acceptedAnswers: unknown,
  answerFormat: LessonAnswerFormat | undefined,
  answerPolicy: LessonAnswerPolicy
): string[] | undefined {
  const merged = uniqueAcceptedAnswers(correctAnswer, acceptedAnswers)
  if (answerPolicy === 'strict') return undefined
  if (answerPolicy === 'normalized' && merged.length > 2) return merged.slice(0, 2)
  if (merged.length <= 1 && answerFormat !== 'choice') return undefined
  return merged
}

export function buildLessonFromGeneratedSteps(sourceLesson: LessonData, generatedSteps: GeneratedStepPayload[]): LessonData {
  const blueprints = sourceLesson.repeatConfig?.stepBlueprints ?? []
  const nextSteps = sourceLesson.steps.map((sourceStep, index) => {
    const generated = generatedSteps[index]
    if (!generated) return sourceStep
    const blueprint = blueprints[index]
    return {
      ...sourceStep,
      bubbles: generated.bubbles!.map((bubble) => ({
        type: bubble.type as BubbleType,
        content: bubble.content as string,
      })) as LessonStep['bubbles'],
      footerDynamic: generated.footerDynamic as string,
      ...(sourceStep.exercise && generated.exercise
        ? {
            exercise: {
              ...sourceStep.exercise,
              question: generated.exercise.question as string,
              correctAnswer: generated.exercise.correctAnswer as string,
              ...(Array.isArray(generated.exercise.options) ? { options: generated.exercise.options as string[] } : {}),
              ...(Array.isArray(generated.exercise.puzzleVariants)
                ? { puzzleVariants: generated.exercise.puzzleVariants as Exercise['puzzleVariants'] }
                : {}),
              ...(Array.isArray(generated.exercise.variants)
                ? {
                    variants: (generated.exercise.variants as Exercise['variants'])?.map((variant) => ({
                      ...variant,
                      ...(Array.isArray(variant.acceptedAnswers)
                        ? { acceptedAnswers: [...variant.acceptedAnswers] }
                        : {}),
                    })),
                  }
                : sourceStep.exercise.variants
                  ? {
                      variants: sourceStep.exercise.variants.map((variant) => ({
                        ...variant,
                        ...(Array.isArray(variant.acceptedAnswers)
                          ? { acceptedAnswers: [...variant.acceptedAnswers] }
                          : {}),
                      })),
                    }
                  : {}),
              ...(typeof generated.exercise.bonusXp === 'number' ? { bonusXp: generated.exercise.bonusXp } : {}),
              ...(typeof generated.exercise.hint === 'string' ? { hint: generated.exercise.hint } : {}),
              ...(blueprint?.answerFormat ? { answerFormat: blueprint.answerFormat } : {}),
              ...(blueprint?.answerPolicy ? { answerPolicy: blueprint.answerPolicy } : {}),
              ...(mergeAcceptedAnswers(
                generated.exercise.correctAnswer as string,
                generated.exercise.acceptedAnswers,
                blueprint?.answerFormat,
                getAnswerPolicy(blueprint)
              )
                ? {
                    acceptedAnswers: mergeAcceptedAnswers(
                      generated.exercise.correctAnswer as string,
                      generated.exercise.acceptedAnswers,
                      blueprint?.answerFormat,
                      getAnswerPolicy(blueprint)
                    ),
                  }
                : {}),
            },
          }
        : {}),
    }
  })
  return {
    ...sourceLesson,
    runKey: createLessonRunKey(),
    steps: nextSteps,
    ...(sourceLesson.finale
      ? {
          finale: {
            ...sourceLesson.finale,
            bubbles: sourceLesson.finale.bubbles.map((bubble) => ({ ...bubble })) as NonNullable<LessonData['finale']>['bubbles'],
            postLesson: {
              ...sourceLesson.finale.postLesson,
              options: sourceLesson.finale.postLesson.options.map((option) => ({ ...option })),
            },
          },
        }
      : {}),
  }
}

export function buildStructuredCreationSystemPrompt(): string {
  return [
    'Ты методист MyEng и создаёшь structured lesson для изучения английского.',
    'Верни ТОЛЬКО JSON без пояснений и markdown.',
    'Сгенерируй lesson строго по переданному контракту.',
    'Нельзя менять число шагов, порядок stepNumber, stepType, сложность и grammar focus.',
    'Каждый шаг должен выполнять свою учебную функцию по смыслу.',
    BUBBLE_CONTENT_FORMAT_RULES,
    'Объяснения и hints на русском, правильные ответы на английском.',
    'Для заданий «Переведите на английский» с форматом "русская фраза" - "английская рамка":',
    '- Текст в первых кавычках (русская часть) пиши ТОЛЬКО на русском (кириллица). Латиница, английские слова и готовый ответ в русской части запрещены.',
    '- Английский допустим только во второй части после дефиса (рамка с ___ или подсказка).',
    '- Не подставляй correctAnswer, глагол из ответа и объекты ответа в русскую формулировку.',
    '- На hard-вариантах переформулируй ситуацию по смыслу, но не раскрывай ответ ни на русском, ни английском до рамки с пропуском.',
    'Не добавляй новую грамматику вне указанного grammar focus.',
    'Если передан selectedVariantId, sourceSituations и sourceSteps, считай их обязательными смысловыми рельсами для нового варианта.',
    'Для fill_choice на шагах 1–2: ровно 3 options — полные грамматически корректные предложения; correctAnswer ∈ options.',
    'Для fill_choice на шагах 1–2: distractors — естественные фразы. Нельзя ломанный английский вроде "It\'s dark to go.".',
    'Для sentence_puzzle всегда давай ровно 3 puzzleVariants. В каждом puzzle-варианте нужны title, instruction, words, correctOrder, correctAnswer, successText, errorText, hintText, myEngComment.',
    'Для sentence_puzzle: смысл под-задачи в title (например «Пазл 2/3: …»). instruction — пустая строка или нейтральная «Расставьте слова по порядку»; без грамматических шаблонов (I am from + …, It is time to …).',
    'Для sentence_puzzle: hintText — пустая строка, если в words не больше 4 токенов; при 5+ — короткая подсказка без полного ответа (допустимо «Подсказка: первое слово — …»).',
    'Для sentence_puzzle: у каждого puzzleVariants[i] свой correctAnswer, совпадающий с correctOrder и набором words; exercise.correctAnswer шага 5 — ответ первого пазла или нейтральная подпись.',
    'Для sentence_puzzle: words и correctOrder в каждом варианте — один и тот же список токенов из correctAnswer этого варианта.',
    'Шаг 5 всегда должен быть sentence_puzzle с ровно 3 puzzleVariants.',
    'Шаг 6 — финальная проверка: translate или write_own, answerFormat full_sentence, ровно 3 exercise.variants (easy, medium, hard), без options и без puzzleVariants.',
    'Шаг 6: цикл easy — первая ось урока; medium — вторая ось, correctAnswer не должен совпадать с ответами шагов 3–4; hard — тот же шаблон, новая лексика, не из ключевых слов шагов 1–5.',
    'Шаг 6: у каждого variant свои question, correctAnswer, hint; difficulty: easy / medium / hard.',
    'Шаг 7 — быстрый contrast-gap: fill_choice, ровно 3 exercise.variants (easy, medium, hard).',
    'Шаг 7: у каждого variant — question (RU-ситуация + EN-рамка с ___), correctAnswer — одно слово без пробелов, options — 3 однословных чипа, correctAnswer ∈ options, свой hint.',
    'Шаг 7: distractors грамматические (like/likes/liking, a/an/the, to/for/at), не три целых предложения.',
    'Шаг 7: без шпаргалки «настроение / страна / роль» в info; новая лексика; не копируй correctAnswer шагов 3–4 и 6.',
    'Шаг 7: верхний exercise.question / correctAnswer / options = копия variant[0] (для валидатора).',
    'Шаги 3, 4, 6 и 7 используют exercise.variants — смотри контракт sourceSteps.',
    'Для шагов 1-4 с options показывай только выбор из вариантов.',
    'Для practice_fill, practice_match и translate шагов примеры и пояснения обязаны использовать другой контекст и другую лексику, чем само задание.',
    'На translate-шагах пример в info и любая английская фраза в кавычках не должны быть эквивалентны ни одному ожидаемому ответу (correctAnswer, acceptedAnswers и все exercise.variants), включая пары I am / I’m.',
    'Категорически запрещено писать correctAnswer или его готовую английскую формулировку в bubbles типа positive/info, в hint и в пояснениях.',
    'Не делай hints слишком широкими и не раскрывай ответ напрямую.',
    'Если нужен один допустимый ответ, не добавляй лишние acceptedAnswers.',
    'Для каждого шага верни:',
    '{',
    '  "stepNumber": 1,',
    '  "bubbles": [',
    '    {"type":"positive","content":"..."},',
    '    {"type":"info","content":"..."},',
    '    {"type":"task","content":"..."}',
    '  ],',
    '  "exercise": {',
    '    "question": "...",',
    '    "options": ["...", "...", "..."],',
    '    "correctAnswer": "...",',
    '    "acceptedAnswers": ["..."],',
    '    "puzzleVariants": [{"id":"...","title":"...","instruction":"...","words":["..."],"correctOrder":["..."],"correctAnswer":"...","successText":"...","errorText":"...","hintText":"...","myEngComment":"..."}],',
    '    "variants": [{"question":"...","options":["a","an","the"],"correctAnswer":"a","hint":"..."}],',
    '    "bonusXp": 30,',
    '    "hint": "..."',
    '  },',
    '  "footerDynamic": "..."',
    '}',
    'Если шаг completion, не добавляй exercise.',
    'Формат ответа верхнего уровня: {"steps":[...]}',
  ].join('\n')
}

export function buildStructuredVariantDiversifyInstruction(): string {
  return [
    'Для этого урока обязательно сгенерируй новый вариант: не копируй дословно sourceSteps.',
    'Меняй формулировки, примеры, микро-ситуации и лексику, сохраняя тот же grammar focus и шаги.',
    'Недостаточно заменить she на he, имя персонажа, одно слово или порядок двух фраз.',
    'Новый вариант должен ощущаться как другой сценарий той же учебной цели.',
    'На шаге 7 — три новых gap-слова в новых ситуациях, не копируй старый MCQ из целых предложений.',
  ].join(' ')
}

export function buildStructuredRepeatSystemPrompt(): string {
  return [
    'Ты методист MyEng и генерируешь новый повтор уже существующего structured-урока.',
    'Верни ТОЛЬКО JSON без пояснений и markdown.',
    'Сгенерируй только новые ситуации, примеры и формулировки.',
    'Нельзя менять правило, сложность, порядок шагов, stepNumber и тип упражнения.',
    'Каждый шаг должен сохранять свою педагогическую роль.',
    BUBBLE_CONTENT_FORMAT_RULES,
    'Не добавляй новую грамматику.',
    'Если передан selectedVariantId, sourceSituations и sourceSteps, опирайся именно на них и не возвращайся к предыдущему варианту.',
    'Объяснения и подсказки на русском, правильные ответы на английском.',
    'Для заданий «Переведите на английский» с форматом "русская фраза" - "английская рамка":',
    '- Текст в первых кавычках (русская часть) пиши ТОЛЬКО на русском (кириллица). Латиница, английские слова и готовый ответ в русской части запрещены.',
    '- Английский допустим только во второй части после дефиса (рамка с ___ или подсказка).',
    '- Не подставляй correctAnswer, глагол из ответа и объекты ответа в русскую формулировку.',
    '- На hard-вариантах переформулируй ситуацию по смыслу, но не раскрывай ответ ни на русском, ни английском до рамки с пропуском.',
    'Для fill_choice на шагах 1–2: ровно 3 options — полные грамматически корректные предложения; correctAnswer ∈ options.',
    'Для fill_choice на шагах 1–2: distractors — естественные фразы. Нельзя ломанный английский вроде "It\'s dark to go.".',
    'Для sentence_puzzle всегда давай ровно 3 puzzleVariants. В каждом puzzle-варианте нужны title, instruction, words, correctOrder, correctAnswer, successText, errorText, hintText, myEngComment.',
    'Для sentence_puzzle: смысл под-задачи в title (например «Пазл 2/3: …»). instruction — пустая строка или нейтральная «Расставьте слова по порядку»; без грамматических шаблонов (I am from + …, It is time to …).',
    'Для sentence_puzzle: hintText — пустая строка, если в words не больше 4 токенов; при 5+ — короткая подсказка без полного ответа (допустимо «Подсказка: первое слово — …»).',
    'Для sentence_puzzle: у каждого puzzleVariants[i] свой correctAnswer, совпадающий с correctOrder и набором words; exercise.correctAnswer шага 5 — ответ первого пазла или нейтральная подпись.',
    'Для sentence_puzzle: words и correctOrder в каждом варианте — один и тот же список токенов из correctAnswer этого варианта.',
    'Шаг 5 всегда должен быть sentence_puzzle с ровно 3 puzzleVariants.',
    'Шаг 6 — финальная проверка: translate или write_own, answerFormat full_sentence, ровно 3 exercise.variants (easy, medium, hard), без options и без puzzleVariants.',
    'Шаг 6: цикл easy — первая ось урока; medium — вторая ось, correctAnswer не должен совпадать с ответами шагов 3–4; hard — тот же шаблон, новая лексика, не из ключевых слов шагов 1–5.',
    'Шаг 6: у каждого variant свои question, correctAnswer, hint; difficulty: easy / medium / hard.',
    'Шаг 7 — быстрый contrast-gap: fill_choice, ровно 3 exercise.variants (easy, medium, hard).',
    'Шаг 7: у каждого variant — question (RU-ситуация + EN-рамка с ___), correctAnswer — одно слово без пробелов, options — 3 однословных чипа, correctAnswer ∈ options, свой hint.',
    'Шаг 7: distractors грамматические (like/likes/liking, a/an/the, to/for/at), не три целых предложения.',
    'Шаг 7: без шпаргалки «настроение / страна / роль» в info; новая лексика; не копируй correctAnswer шагов 3–4 и 6.',
    'Шаг 7: верхний exercise.question / correctAnswer / options = копия variant[0] (для валидатора).',
    'Шаги 3, 4, 6 и 7 используют exercise.variants — смотри контракт sourceSteps.',
    'Для шагов 1-4 с options показывай только выбор из вариантов.',
    'Для practice_fill, practice_match и translate шагов примеры и пояснения обязаны использовать другой контекст и другую лексику, чем само задание.',
    'На translate-шагах пример в info и любая английская фраза в кавычках не должны быть эквивалентны ни одному ожидаемому ответу (correctAnswer, acceptedAnswers и все exercise.variants), включая пары I am / I’m.',
    'Категорически запрещено писать correctAnswer или его готовую английскую формулировку в bubbles типа positive/info, в hint и в пояснениях.',
    'Не делай hints слишком широкими и не раскрывай ответ напрямую.',
    'Если нужен один допустимый ответ, не добавляй лишние acceptedAnswers.',
    'Формат ответа верхнего уровня: {"steps":[...]}',
  ].join('\n')
}

export function buildLessonRepairUserMessage(params: {
  reason: 'parse' | 'validation'
  attempt: number
  maxAttempts: number
  issues?: LessonValidationIssue[]
  score?: number
}): string {
  const lines = [
    `Исправь предыдущий ответ и верни полный JSON урока заново. Попытка ${params.attempt} из ${params.maxAttempts}.`,
    'Сохрани тот же контракт: то же число шагов, те же stepNumber, те же типы упражнений и тот же grammar focus.',
    'Нужен именно новый сценарий урока: не копируй эталон и не ограничивайся косметическими заменами.',
    'Верни только JSON вида {"steps":[...]} без markdown и без пояснений.',
  ]

  if (params.reason === 'parse') {
    lines.splice(
      1,
      0,
      'Предыдущий ответ не удалось распарсить как валидный JSON. Исправь формат и убедись, что верхний уровень равен {"steps":[...]}.'
    )
    return lines.join('\n')
  }

  const issues = (params.issues ?? []).slice(0, 8)
  if (typeof params.score === 'number') {
    lines.splice(1, 0, `Предыдущий вариант не прошёл quality gate. Score=${params.score.toFixed(2)}.`)
  } else {
    lines.splice(1, 0, 'Предыдущий вариант не прошёл quality gate.')
  }
  if (issues.length > 0) {
    lines.push('Исправь следующие проблемы:')
    for (const issue of issues) {
      const stepLabel = issue.stepNumber === null ? 'lesson' : `step ${issue.stepNumber}`
      lines.push(`- [${issue.severity}] ${stepLabel} ${issue.code}: ${issue.message}`)
    }
  }
  return lines.join('\n')
}

export function buildStructuredLessonCefrPrompt(params: {
  lesson: LessonData
  audience: Audience
}): string {
  return buildCefrPromptBlock({
    level: normalizeLessonLevelToCefrLevel(params.lesson.level),
    audience: params.audience,
    mode: 'translation',
  })
}
