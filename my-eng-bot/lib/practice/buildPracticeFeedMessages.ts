import type { PracticeFlowState } from '@/hooks/usePracticeSession'
import { stripDictationTaskInstruction } from '@/lib/practice/prompt/dictationPromptFormat'
import { stripListeningSelectTaskInstruction } from '@/lib/practice/prompt/buildListeningSelectPrompt'
import { ENGVO_TYPING_MESSAGE } from '@/lib/engvoPersonaCopy'
import { prefixFeedbackMarker, resolveFeedbackMarker } from '@/lib/feedbackMarkers'
import { buildPracticeWrongAnswerFeedback } from '@/lib/practice/practiceFeedbackCopy'
import { resolvePracticeRepeatAnswer } from '@/lib/practice/practiceRepeatFeedback'
import {
  PRACTICE_CHECKING_MESSAGE,
  shouldHideCurrentPracticeQuestionBubbles,
  type PracticeAnswerFeedbackType,
} from '@/lib/practice/practiceAnswerPanelLock'
import type { Audience } from '@/lib/types'
import { showDebugQuestionIndex } from '@/lib/practice/debug'
import {
  getPracticeExerciseTypeCatalogNumber,
  PRACTICE_EXERCISE_TYPE_CATALOG_SIZE,
} from '@/lib/practice/practiceExerciseTypeCatalog'
import { buildPracticeFeedOpening } from '@/lib/practice/practiceRouteCopy'
import {
  formatRoleplayInfoLabel,
  formatRoleplayTaskDisplay,
  inferRoleplayAxis,
} from '@/lib/practice/prompt/roleplayPromptEngine'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { Bubble } from '@/types/lesson'
import type { LessonData } from '@/types/lesson'
import type { PracticeAnswer, PracticeQuestion, PracticeSession } from '@/types/practice'

export type PracticeFeedMessageKind = 'lesson' | 'answer' | 'status'

export type PracticeFeedMessage = {
  id: string
  role: 'assistant' | 'user'
  kind: PracticeFeedMessageKind
  text?: string
  tone?: 'service' | 'success' | 'error'
  bubbles?: Bubble[]
  isHistorical?: boolean
  repeatAnswer?: string
}

function practiceTypeLabel(question: PracticeQuestion, session: PracticeSession, audience: Audience = 'adult'): string {
  if (session.mode === 'challenge') {
    if (question.type === 'choice') return 'Лёгкий выбор: один вариант явно подходит.'
    if (question.type === 'context-clue') return 'Смотрите на ситуацию: варианты похожи по смыслу.'
    if (question.type === 'dropdown-fill') return 'Выберите одно слово из выпадающего списка.'
    if (question.type === 'sentence-surgery') return 'Соберите фразу из слов в правильном порядке.'
    if (question.type === 'word-builder-pro') return 'Соберите фразу: в банке есть грамматические ловушки.'
    if (question.type === 'error-fix') {
      return audience === 'child'
        ? 'Фраза не подходит к ситуации - скажи или напиши правильно.'
        : 'Фраза не подходит к ситуации - скажите или напишите правильный вариант.'
    }
    if (question.type === 'boss-challenge') {
      return audience === 'child'
        ? 'Скажи по теме своими словами по шаблону.'
        : 'Своими словами по шаблону темы - проверим, что тема с вами.'
    }
    if (question.type === 'roleplay-mini') return 'Ответьте собеседнику по-английски.'
  }
  if (question.type === 'choice') return 'Выберите лучший вариант.'
  if (question.type === 'voice-shadow') return 'Прослушайте фразу и повторите её вслух или текстом.'
  if (question.type === 'dropdown-fill') return 'Выберите слово из списка.'
  if (question.type === 'listening-select') return 'Прослушайте и выберите правильный вариант.'
  if (question.type === 'sentence-surgery') return 'Соберите правильную фразу.'
  if (question.type === 'word-builder-pro') return 'Соберите фразу: в банке есть грамматические ловушки.'
  if (question.type === 'dictation') return 'Напишите фразу на слух.'
  if (question.type === 'roleplay-mini') return 'Ответьте в мини-диалоге.'
  if (question.type === 'error-fix') {
    return audience === 'child'
      ? 'Скажи или напиши фразу, которая подходит к ситуации.'
      : 'Скажите или напишите фразу, которая подходит к ситуации.'
  }
  if (question.type === 'boss-challenge') {
    return audience === 'child'
      ? 'Скажи по теме своими словами по шаблону.'
      : 'Своими словами по шаблону темы - проверим, что тема с вами.'
  }
  if (question.type === 'context-clue') return 'Найдите ответ по контексту.'
  return 'Ответьте самостоятельно.'
}

function normalizeInstruction(text: string | undefined): string {
  const trimmed = text?.trim() ?? ''
  if (!trimmed) return ''
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function practiceInfoLabel(
  question: PracticeQuestion,
  session: PracticeSession,
  audience: Audience,
  questionIndex: number
): string {
  if (question.type === 'roleplay-mini') {
    const lesson = getStructuredLessonById(question.lessonId)
    const axis = inferRoleplayAxis(
      question.targetAnswer,
      lesson ?? ({ id: question.lessonId } as LessonData)
    )
    return formatRoleplayInfoLabel({
      axis,
      mode: session.mode,
      stepIndex: questionIndex,
      lessonId: question.lessonId,
      audience,
    })
  }

  // Info bubble = type instruction only. Pedagogical/recipe hints must not appear here
  // (they previously leaked answers like "Tell me + what + she + likes").
  return normalizeInstruction(practiceTypeLabel(question, session, audience))
}

function taskBubbleContent(question: PracticeQuestion, audience: Audience): string {
  if (question.type === 'dictation') {
    return stripDictationTaskInstruction(question.prompt)
  }
  if (question.type === 'listening-select') {
    return stripListeningSelectTaskInstruction(question.prompt)
  }
  if (question.type === 'roleplay-mini') {
    const display = formatRoleplayTaskDisplay(question.prompt, audience)
    return display.trim().length > 0 ? display : question.prompt
  }
  return question.prompt
}

function buildQuestionBubbles(params: {
  session: PracticeSession
  question: PracticeQuestion
  questionIndex: number
  previousWasCorrect: boolean | null
  audience: Audience
}): Bubble[] {
  const opening = buildPracticeFeedOpening({
    session: params.session,
    questionIndex: params.questionIndex,
    audience: params.audience,
    previousWasCorrect: params.previousWasCorrect,
  })
  const infoLabel = practiceInfoLabel(params.question, params.session, params.audience, params.questionIndex)
  const debugPrefix = showDebugQuestionIndex
    ? `шаг ${params.questionIndex + 1} · тип ${getPracticeExerciseTypeCatalogNumber(params.question.type)}/${PRACTICE_EXERCISE_TYPE_CATALOG_SIZE} (${params.question.type})`
    : ''
  const routeContent = debugPrefix ? `${debugPrefix}\n${opening}` : opening
  const bubbles: Bubble[] = [{ type: 'positive', content: routeContent }]
  if (infoLabel) {
    bubbles.push({ type: 'info', content: infoLabel })
  }
  bubbles.push({
    type: 'task',
    content: taskBubbleContent(params.question, params.audience),
  })
  return bubbles
}

function isWrongLimitAdvanceAnswer(answer: PracticeAnswer): boolean {
  return !answer.isCorrect && answer.feedbackTone === 'success'
}

function feedbackTextForAnswer(
  answer: PracticeAnswer,
  audience: Audience,
  attemptNumber: number,
  question?: PracticeQuestion
): string {
  const raw =
    answer.feedbackMessage ??
    (answer.isCorrect
      ? answer.corrected
        ? 'Отлично, теперь правильно закреплено.'
        : 'Верно. Хороший ответ.'
      : buildPracticeWrongAnswerFeedback({
          correctAnswer: answer.correctAnswer,
          attemptNumber: Math.min(2, attemptNumber) as 1 | 2,
          audience,
          question,
        }))
  if (isWrongLimitAdvanceAnswer(answer)) {
    return raw
  }
  const tone = feedbackToneForAnswer(answer)
  const marker = resolveFeedbackMarker({ tone, attemptNumber })
  return prefixFeedbackMarker(marker, raw)
}

function feedbackToneForAnswer(answer: PracticeAnswer): 'success' | 'error' {
  return answer.feedbackTone ?? (answer.isCorrect ? 'success' : 'error')
}

function buildAnswerFeedbackMessage(params: {
  id: string
  answer: PracticeAnswer
  audience: Audience
  attemptNumber: number
  question: PracticeQuestion
}): PracticeFeedMessage {
  const displayTone = isWrongLimitAdvanceAnswer(params.answer)
    ? 'service'
    : feedbackToneForAnswer(params.answer)
  const repeatAnswer = resolvePracticeRepeatAnswer({
    answer: params.answer,
    attemptNumber: params.attemptNumber,
    questionType: params.question.type,
  })

  return {
    id: params.id,
    role: 'assistant',
    kind: 'status',
    text: feedbackTextForAnswer(
      params.answer,
      params.audience,
      params.attemptNumber,
      params.question
    ),
    tone: displayTone,
    ...(repeatAnswer ? { repeatAnswer } : {}),
  }
}

/** Фидбек последней committed-попытки: и в correction, и пока идёт следующая отправка. */
function shouldShowLatestCommittedAnswerFeedback(state: PracticeFlowState): boolean {
  return (
    state === 'feedback' ||
    state === 'correction' ||
    state === 'generating_next' ||
    state === 'submitting' ||
    state === 'checking'
  )
}

export function buildPracticeFeedMessages(params: {
  session: PracticeSession
  state: PracticeFlowState
  audience: Audience
  pendingAnswer?: string | null
  feedbackType?: PracticeAnswerFeedbackType
  showCheckingStatusLine?: boolean
}): PracticeFeedMessage[] {
  const {
    session,
    state,
    audience,
    pendingAnswer = null,
    feedbackType,
    showCheckingStatusLine = false,
  } = params

  if (state === 'briefing') {
    return []
  }

  const result: PracticeFeedMessage[] = []
  const answersByQuestion = new Map<string, PracticeAnswer[]>()
  session.answers.forEach((answer) => {
    const current = answersByQuestion.get(answer.questionId) ?? []
    answersByQuestion.set(answer.questionId, [...current, answer])
  })

  const visibleQuestions =
    session.status === 'completed'
      ? session.questions
      : session.questions.slice(0, Math.min(session.currentIndex + 1, session.questions.length))

  visibleQuestions.forEach((question, index) => {
    const isCurrent = index === session.currentIndex && session.status !== 'completed'
    const isHistorical = index < session.currentIndex || session.status === 'completed'
    const answers = answersByQuestion.get(question.id) ?? []
    const previousAnswer =
      index > 0 ? answersByQuestion.get(session.questions[index - 1]?.id ?? '')?.at(-1) : null

    const hideQuestionBubbles = shouldHideCurrentPracticeQuestionBubbles({
      state,
      questionIndex: index,
      currentIndex: session.currentIndex,
      feedbackType,
    })

    if (!hideQuestionBubbles) {
      result.push({
        id: `practice-question-${question.id}`,
        role: 'assistant',
        kind: 'lesson',
        bubbles: buildQuestionBubbles({
          session,
          question,
          questionIndex: index,
          previousWasCorrect: previousAnswer ? previousAnswer.isCorrect : null,
          audience,
        }),
        isHistorical,
      })
    }

    if (isHistorical) {
      answers.forEach((answer, answerIndex) => {
        result.push({
          id: `practice-answer-${answer.questionId}-${answer.timestamp}-${answerIndex}`,
          role: 'user',
          kind: 'answer',
          text: answer.userAnswer,
        })
        result.push(
          buildAnswerFeedbackMessage({
            id: `practice-feedback-${answer.questionId}-${answer.timestamp}-${answerIndex}`,
            answer,
            audience,
            attemptNumber: answerIndex + 1,
            question,
          })
        )
      })
      return
    }

    const checkingSlotId = `practice-checking-${question.id}`
    const currentAnswerId = `practice-answer-${question.id}-current`
    const pendingAnswerId = `practice-answer-${question.id}-pending`

    answers.forEach((answer, answerIndex) => {
      const isLatestAnswer = answerIndex === answers.length - 1
      const feedbackId = `practice-feedback-${answer.questionId}-${answer.timestamp}-${answerIndex}`
      result.push({
        id: isLatestAnswer
          ? currentAnswerId
          : `practice-answer-${answer.questionId}-${answer.timestamp}-${answerIndex}`,
        role: 'user',
        kind: 'answer',
        text: answer.userAnswer,
      })
      if (!isLatestAnswer || shouldShowLatestCommittedAnswerFeedback(state)) {
        result.push(
          buildAnswerFeedbackMessage({
            id: feedbackId,
            answer,
            audience,
            attemptNumber: answerIndex + 1,
            question,
          })
        )
      }
    })

    if (pendingAnswer?.trim() && (state === 'submitting' || state === 'checking')) {
      // Тот же id, что у committed-ответа: без remount и повторной анимации после checking.
      const pendingId = answers.length === 0 ? currentAnswerId : pendingAnswerId
      result.push({
        id: pendingId,
        role: 'user',
        kind: 'answer',
        text: pendingAnswer.trim(),
      })
    }

    if (state === 'checking' && showCheckingStatusLine) {
      result.push({
        id: checkingSlotId,
        role: 'assistant',
        kind: 'status',
        text: PRACTICE_CHECKING_MESSAGE,
        tone: 'service',
      })
    }

    if (state === 'generating_next') {
      result.push({
        id: `practice-generating-next-${question.id}`,
        role: 'assistant',
        kind: 'status',
        text: ENGVO_TYPING_MESSAGE,
        tone: 'service',
      })
    }
  })

  return result
}
