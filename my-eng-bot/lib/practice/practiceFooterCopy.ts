import type { PracticeFooterState } from '@/lib/practice/practiceFooter'
import type { PracticeChoiceCorrectionPhase } from '@/lib/practice/practiceChoiceCorrectionPhase'
import type { Audience } from '@/lib/types'
import type { PracticeQuestion, PracticeSession } from '@/types/practice'

export type PracticeFooterContext = {
  audience: Audience
  wrongAttemptsOnCurrentQuestion: number
  questionType?: PracticeQuestion['type']
  isWrongLimitAdvance: boolean
  correctionPhase?: PracticeChoiceCorrectionPhase
}

export function buildPracticeCorrectionChipsFooterHint(audience: Audience): string {
  return audience === 'child'
    ? 'Если выбрал неверно — скажи правильную фразу вслух.'
    : 'После неверного выбора закрепите правильную фразу вслух.'
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
  correctionPhase?: PracticeChoiceCorrectionPhase
}): string | null {
  if (params.state === 'correction') {
    if (params.questionType === 'choice') {
      const phase = params.correctionPhase ?? 'idle'
      if (phase === 'chips') {
        return buildPracticeCorrectionChipsFooterHint(params.audience)
      }
      if (phase !== 'voiceReady') {
        return null
      }
      if (params.wrongAttemptsOnCurrentQuestion >= 2) {
        return params.audience === 'child'
          ? 'Попробуй ещё раз. Карандаш - текст.'
          : 'Попробуйте снова. Текст - карандаш.'
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
