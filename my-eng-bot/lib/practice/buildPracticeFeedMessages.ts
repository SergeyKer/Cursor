import type { PracticeFlowState } from '@/hooks/usePracticeSession'
import { buildPracticeWrongAnswerFeedback } from '@/lib/practice/practiceFeedbackCopy'
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
import { buildPracticeBriefingBubbles } from '@/lib/practice/practiceInstructionCopy'
import type { Bubble } from '@/types/lesson'
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
}

function practiceTypeLabel(question: PracticeQuestion): string {
  if (question.type === 'choice') return 'Выберите лучший вариант.'
  if (question.type === 'voice-shadow') return 'Прослушайте и повторите фразу вслух.'
  if (question.type === 'dropdown-fill') return 'Восстановите пропуск.'
  if (question.type === 'listening-select') return 'Прослушайте и выберите правильный вариант.'
  if (question.type === 'sentence-surgery') return 'Соберите правильную фразу.'
  if (question.type === 'word-builder-pro') return 'Постройте фразу из слов.'
  if (question.type === 'dictation') return 'Напишите фразу на слух.'
  if (question.type === 'roleplay-mini') return 'Ответьте в мини-диалоге.'
  if (question.type === 'speed-round') return 'Быстрый раунд: отвечайте без долгих пауз.'
  if (question.type === 'boss-challenge') return 'Финальный вызов: примените тему целиком.'
  if (question.type === 'context-clue') return 'Найдите ответ по контексту.'
  return 'Ответьте самостоятельно.'
}

function normalizeInstruction(text: string | undefined): string {
  const trimmed = text?.trim() ?? ''
  if (!trimmed) return ''
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function practiceInfoLabel(question: PracticeQuestion): string {
  const hint = normalizeInstruction(question.hint)
  const base = normalizeInstruction(practiceTypeLabel(question))
  if (!hint) return base
  const normalizedHint = hint.toLowerCase().replace(/[.!?…]/g, '').replace(/\s+/g, ' ').trim()
  const normalizedBase = base.toLowerCase().replace(/[.!?…]/g, '').replace(/\s+/g, ' ').trim()
  if (normalizedHint === normalizedBase) return base
  return `${hint} ${base}`
}

function buildQuestionBubbles(params: {
  session: PracticeSession
  question: PracticeQuestion
  questionIndex: number
  previousWasCorrect: boolean | null
}): Bubble[] {
  const opening =
    params.questionIndex === 0
      ? `Начинаем практику по теме "${params.session.topic}". Первый шаг сделаем мягким.`
      : params.previousWasCorrect
        ? 'Предыдущий ответ засчитан. Держим темп.'
        : 'Ошибку уже разобрали. Теперь закрепим похожий паттерн.'
  return [
    { type: 'positive', content: opening },
    { type: 'info', content: practiceInfoLabel(params.question) },
    {
      type: 'task',
      content: showDebugQuestionIndex
        ? `шаг ${params.questionIndex + 1} · тип ${getPracticeExerciseTypeCatalogNumber(params.question.type)}/${PRACTICE_EXERCISE_TYPE_CATALOG_SIZE} (${params.question.type}) · ${params.question.prompt}`
        : params.question.prompt,
    },
  ]
}

function feedbackTextForAnswer(answer: PracticeAnswer, audience: Audience): string {
  return (
    answer.feedbackMessage ??
    (answer.isCorrect
      ? answer.corrected
        ? 'Отлично, теперь правильно закреплено.'
        : 'Верно. Хороший ответ.'
      : buildPracticeWrongAnswerFeedback({
          correctAnswer: answer.correctAnswer,
          attemptNumber: 1,
          audience,
        }))
  )
}

function feedbackToneForAnswer(answer: PracticeAnswer): 'success' | 'error' {
  return answer.feedbackTone ?? (answer.isCorrect ? 'success' : 'error')
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
}): PracticeFeedMessage[] {
  const { session, state, audience, pendingAnswer = null, feedbackType } = params

  if (state === 'briefing') {
    return [
      {
        id: `practice-briefing-${session.id}`,
        role: 'assistant',
        kind: 'lesson',
        bubbles: buildPracticeBriefingBubbles(session, audience),
        isHistorical: false,
      },
    ]
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
        result.push({
          id: `practice-feedback-${answer.questionId}-${answer.timestamp}-${answerIndex}`,
          role: 'assistant',
          kind: 'status',
          text: feedbackTextForAnswer(answer, audience),
          tone: feedbackToneForAnswer(answer),
        })
      })
      return
    }

    const feedbackSlotId = `practice-status-${question.id}`
    const checkingSlotId = `practice-checking-${question.id}`
    const currentAnswerId = `practice-answer-${question.id}-current`
    const pendingAnswerId = `practice-answer-${question.id}-pending`

    answers.forEach((answer, answerIndex) => {
      const isLatestAnswer = answerIndex === answers.length - 1
      result.push({
        id: isLatestAnswer
          ? currentAnswerId
          : `practice-answer-${answer.questionId}-${answer.timestamp}-${answerIndex}`,
        role: 'user',
        kind: 'answer',
        text: answer.userAnswer,
      })
      if (!isLatestAnswer) {
        result.push({
          id: `practice-feedback-${answer.questionId}-${answer.timestamp}-${answerIndex}`,
          role: 'assistant',
          kind: 'status',
          text: feedbackTextForAnswer(answer, audience),
          tone: feedbackToneForAnswer(answer),
        })
      } else if (shouldShowLatestCommittedAnswerFeedback(state)) {
        result.push({
          id: feedbackSlotId,
          role: 'assistant',
          kind: 'status',
          text: feedbackTextForAnswer(answer, audience),
          tone: feedbackToneForAnswer(answer),
        })
      }
    })

    if (pendingAnswer?.trim() && (state === 'submitting' || state === 'checking')) {
      result.push({
        id: pendingAnswerId,
        role: 'user',
        kind: 'answer',
        text: pendingAnswer.trim(),
      })
    }

    if (state === 'checking') {
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
        text: 'MyEng печатает...',
        tone: 'service',
      })
    }
  })

  return result
}
