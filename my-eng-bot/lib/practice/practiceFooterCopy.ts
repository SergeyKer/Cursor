import type { PracticeFooterState } from '@/lib/practice/practiceFooter'
import type { Audience } from '@/lib/types'
import type { PracticeQuestion, PracticeSession } from '@/types/practice'

export type PracticeFooterContext = {
  audience: Audience
  wrongAttemptsOnCurrentQuestion: number
  questionType?: PracticeQuestion['type']
  isWrongLimitAdvance: boolean
}

export function isPracticeWrongLimitAdvance(session: PracticeSession): boolean {
  const last = session.answers.at(-1)
  return Boolean(last && !last.isCorrect && last.feedbackTone === 'success')
}

export function buildPracticeFooterDynamicText(params: {
  state: PracticeFooterState
  audience: Audience
  wrongAttemptsOnCurrentQuestion: number
  questionType?: PracticeQuestion['type']
  isWrongLimitAdvance: boolean
}): string | null {
  if (params.state === 'correction') {
    if (params.questionType === 'choice') {
      if (params.wrongAttemptsOnCurrentQuestion >= 2) {
        return params.audience === 'child'
          ? 'Попробуй ещё раз. Карандаш — текст.'
          : 'Попробуйте снова. Текст — карандаш.'
      }
      return params.audience === 'child'
        ? 'Ничего страшного. Скажи в микрофон.'
        : 'Скажите фразу вслух в микрофон.'
    }
    return params.audience === 'child' ? 'Напиши правильный ответ.' : 'Введите правильный ответ.'
  }

  if (params.state === 'feedback' && params.isWrongLimitAdvance) {
    return params.audience === 'child'
      ? 'Ничего страшного. Идём дальше.'
      : 'Продолжаем. Закрепим на след. шаге.'
  }

  return null
}
