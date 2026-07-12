import type { PracticeChoiceCorrectionPhase } from '@/lib/practice/practiceChoiceCorrectionPhase'
import type { PracticeFooterState } from '@/lib/practice/practiceFooter'
import type { Audience } from '@/lib/types'

export type PracticeCoachIntent =
  | 'correction_pause'
  | 'correction_retry'
  | 'checking'
  | 'wrong_limit'
  | 'success_first_try'
  | 'success_corrected'
  | 'advice'
  | 'completion_reward'
  | 'forgiveness_offer'
  | 'forgiveness_applied'
  | 'forgiveness_zero'

export type PracticeCoachMessage = {
  intent: PracticeCoachIntent
  phraseId: string
  text: string
  tone: 'thinking' | 'supportive' | 'success' | 'neutral'
}

type Phrase = Omit<PracticeCoachMessage, 'intent'>

const PHRASES: Record<Exclude<PracticeCoachIntent, 'completion_reward'>, Record<Audience, Phrase[]>> = {
  forgiveness_offer: {
    adult: [{ phraseId: 'forgive-offer-a', text: 'Можно не считать эту ошибку.', tone: 'supportive' }],
    child: [{ phraseId: 'forgive-offer-c', text: 'Можно не считать эту ошибку.', tone: 'supportive' }],
  },
  forgiveness_applied: {
    adult: [{ phraseId: 'forgive-applied-a', text: 'Ошибку не учитываем.', tone: 'success' }],
    child: [{ phraseId: 'forgive-applied-c', text: 'Ошибку не учитываем.', tone: 'success' }],
  },
  forgiveness_zero: {
    adult: [{ phraseId: 'forgive-zero-a', text: 'Нужна 1 монета.', tone: 'supportive' }],
    child: [{ phraseId: 'forgive-zero-c', text: 'Нужна 1 монета.', tone: 'supportive' }],
  },
  correction_pause: {
    adult: [{ phraseId: 'correction-pause-a', text: 'Секунду — закрепляем фразу.', tone: 'thinking' }],
    child: [{ phraseId: 'correction-pause-c', text: 'Секунду — закрепляем фразу.', tone: 'thinking' }],
  },
  correction_retry: {
    adult: [
      { phraseId: 'correction-retry-a1', text: 'Закрепите правильный вариант.', tone: 'supportive' },
      { phraseId: 'correction-retry-a2', text: 'Попробуйте правильный вариант.', tone: 'supportive' },
    ],
    child: [
      { phraseId: 'correction-retry-c1', text: 'Закрепи правильный вариант.', tone: 'supportive' },
      { phraseId: 'correction-retry-c2', text: 'Попробуй правильный вариант.', tone: 'supportive' },
    ],
  },
  checking: {
    adult: [{ phraseId: 'checking-a', text: 'Проверяю ответ…', tone: 'thinking' }],
    child: [{ phraseId: 'checking-c', text: 'Проверяю ответ…', tone: 'thinking' }],
  },
  wrong_limit: {
    adult: [{ phraseId: 'wrong-limit-a', text: 'Продолжаем. Вернёмся к этому.', tone: 'supportive' }],
    child: [{ phraseId: 'wrong-limit-c', text: 'Идём дальше. Ещё получится.', tone: 'supportive' }],
  },
  success_first_try: {
    adult: [
      { phraseId: 'first-try-a1', text: 'С первой попытки. Отлично.', tone: 'success' },
      { phraseId: 'first-try-a2', text: 'Точно с первого раза.', tone: 'success' },
    ],
    child: [
      { phraseId: 'first-try-c1', text: 'С первого раза. Отлично!', tone: 'success' },
      { phraseId: 'first-try-c2', text: 'Точно! Так держать.', tone: 'success' },
    ],
  },
  success_corrected: {
    adult: [{ phraseId: 'corrected-a', text: 'Исправили и закрепили.', tone: 'supportive' }],
    child: [{ phraseId: 'corrected-c', text: 'Исправили и закрепили.', tone: 'supportive' }],
  },
  advice: {
    adult: [{ phraseId: 'advice-a', text: 'Следующее задание по теме.', tone: 'neutral' }],
    child: [{ phraseId: 'advice-c', text: 'Следующее задание по теме.', tone: 'neutral' }],
  },
}

function pickPhrase(
  intent: Exclude<PracticeCoachIntent, 'completion_reward'>,
  audience: Audience,
  previousPhraseId?: string | null
): PracticeCoachMessage {
  const pool = PHRASES[intent][audience]
  const selected = pool.find((phrase) => phrase.phraseId !== previousPhraseId) ?? pool[0]!
  return { intent, ...selected }
}

export function resolvePracticeFooterTopLine(params: {
  state: PracticeFooterState
  audience: Audience
  correctionPhase?: PracticeChoiceCorrectionPhase
  isWrongLimitAdvance?: boolean
  lastAnswerCorrected?: boolean
  lastAnswerFirstTryCorrect?: boolean
  completionRewardLine?: string | null
  forgivenessIntent?: 'offer' | 'applied' | 'zero' | null
  previousPhraseId?: string | null
}): PracticeCoachMessage {
  if (params.forgivenessIntent === 'applied') {
    return pickPhrase('forgiveness_applied', params.audience, params.previousPhraseId)
  }
  if (params.forgivenessIntent === 'zero') {
    return pickPhrase('forgiveness_zero', params.audience, params.previousPhraseId)
  }
  if (params.state === 'correction') {
    return pickPhrase(
      params.correctionPhase === 'voiceLocked' || params.correctionPhase === 'chips'
        ? 'correction_pause'
        : 'correction_retry',
      params.audience,
      params.previousPhraseId
    )
  }
  if (
    params.state === 'checking' ||
    params.state === 'submitting' ||
    params.state === 'generating' ||
    params.state === 'generating_next'
  ) {
    return pickPhrase('checking', params.audience, params.previousPhraseId)
  }
  if (params.state === 'feedback') {
    if (params.isWrongLimitAdvance) {
      return pickPhrase('wrong_limit', params.audience, params.previousPhraseId)
    }
    return pickPhrase(
      params.lastAnswerCorrected ? 'success_corrected' : 'success_first_try',
      params.audience,
      params.previousPhraseId
    )
  }
  if (params.state === 'completed' && params.completionRewardLine?.trim()) {
    return {
      intent: 'completion_reward',
      phraseId: 'completion-reward',
      text: params.completionRewardLine.trim(),
      tone: 'success',
    }
  }
  if (params.forgivenessIntent === 'offer') {
    return pickPhrase('forgiveness_offer', params.audience, params.previousPhraseId)
  }
  return pickPhrase('advice', params.audience, params.previousPhraseId)
}
