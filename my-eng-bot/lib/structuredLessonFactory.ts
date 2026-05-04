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
import { getCefrDenyWords, getCefrSpec, buildCefrPromptBlock } from '@/lib/cefr/cefrSpec'

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

function brokenEnglishPattern(text: string): string | null {
  const normalized = normalizeForPolicyCheck(text)
  if (!normalized) return null
  if (/\bto to\b/.test(normalized)) return 'double_to'
  if (/\bwho like\b/.test(normalized)) return 'who_like_without_s'
  if (/\bwho liking\b/.test(normalized)) return 'who_liking'
  if (/\bit(?:'s| is) sleep\b/.test(normalized)) return 'its_sleep'
  if (/\bit(?:'s| is) (?!time\b)[a-z]+ to\b/.test(normalized)) return 'broken_it_is_to_pattern'
  if (/\b[a-z]+ing time to\b/.test(normalized)) return 'broken_ing_time_to'
  return null
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
  if (hint && correctAnswer && normalizeForPolicyCheck(hint).includes(normalizeForPolicyCheck(correctAnswer))) {
    issues.push(issue('hard', 'hint_reveals_answer', 'Hint не должен раскрывать правильный ответ напрямую.', sourceStep.stepNumber))
  }
  if (
    (sourceStep.stepType === 'practice_fill' || sourceStep.stepType === 'practice_match') &&
    sourceStep.exercise &&
    explanatoryText &&
    correctAnswer &&
    normalizeForPolicyCheck(explanatoryText).includes(normalizeForPolicyCheck(correctAnswer))
  ) {
    issues.push(
      issue(
        'hard',
        'support_reveals_answer',
        'Примеры, пояснения и hints не должны содержать правильный ответ.',
        sourceStep.stepNumber
      )
    )
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
    const brokenPattern = brokenEnglishPattern(correctAnswer)
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
      const brokenPattern = brokenEnglishPattern(option)
      if (brokenPattern && normalizeForPolicyCheck(option) === normalizeForPolicyCheck(correctAnswer)) {
        issues.push(issue('hard', 'correct_choice_unnatural', `Правильный option выглядит неестественно: ${brokenPattern}.`, sourceStep.stepNumber))
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
    if (!brokenEnglishPattern(correctAnswer) && hasLatin(correctAnswer) && !hasCyrillic(correctAnswer)) {
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
    'Не добавляй новую грамматику вне указанного grammar focus.',
    'Если передан selectedVariantId, sourceSituations и sourceSteps, считай их обязательными смысловыми рельсами для нового варианта.',
    'Для fill_choice всегда давай ровно 3 варианта и включай correctAnswer в options.',
    'Для sentence_puzzle всегда давай ровно 3 puzzleVariants. В каждом puzzle-варианте нужны title, instruction, words, correctOrder, correctAnswer, successText, errorText, hintText, myEngComment.',
    'Шаг 5 всегда должен быть sentence_puzzle с ровно 3 puzzleVariants.',
    'Шаг 6 должен быть текстовым вводом полного предложения: translate или write_own, answerFormat full_sentence, без options и без puzzleVariants.',
    'Для шагов 1-4 с options показывай только выбор из вариантов.',
    'Для practice_fill, practice_match и translate шагов примеры и пояснения обязаны использовать другой контекст и другую лексику, чем само задание.',
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
    'Для fill_choice всегда давай ровно 3 варианта и включай correctAnswer в options.',
    'Для sentence_puzzle всегда давай ровно 3 puzzleVariants. В каждом puzzle-варианте нужны title, instruction, words, correctOrder, correctAnswer, successText, errorText, hintText, myEngComment.',
    'Шаг 5 всегда должен быть sentence_puzzle с ровно 3 puzzleVariants.',
    'Шаг 6 должен быть текстовым вводом полного предложения: translate или write_own, answerFormat full_sentence, без options и без puzzleVariants.',
    'Для шагов 1-4 с options показывай только выбор из вариантов.',
    'Для practice_fill, practice_match и translate шагов примеры и пояснения обязаны использовать другой контекст и другую лексику, чем само задание.',
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
