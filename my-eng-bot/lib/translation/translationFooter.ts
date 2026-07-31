import {
  TRANSLATION_DAILY_GLOBAL_XP_CAP,
  TRANSLATION_SESSION_LENGTH,
  translationFillPercent,
  type TranslationSessionState,
} from '@/lib/translation/translationSessionEconomy'
import {
  TRANSLATION_FOOTER_TOP,
  formatTranslationFooterTop,
  type TranslationFooterCopyAudience,
} from '@/lib/uiCopy/translationFooter'

export type TranslationFooterMoment =
  | 'idle'
  | 'checking'
  | 'error'
  | 'soft_fail'
  | 'success'
  | 'complete'
  | 'post_complete'
  | 'daily_cap'

export type TranslationSessionMeter = {
  current: number
  target: number
  sessionXp: number
  statusLabel: string
  fillPercent: number
}

export type TranslationFooterView = {
  dynamicText: string
  sessionMeter: TranslationSessionMeter
  typingKey: string
}

export function translationStatusLabel(params: {
  moment: TranslationFooterMoment
  remaining: number
  status: TranslationSessionState['status']
  dailyXpAwarded: number
}): string {
  const { moment, remaining, status, dailyXpAwarded } = params
  if (status === 'completed') return '🏁'
  if (dailyXpAwarded >= TRANSLATION_DAILY_GLOBAL_XP_CAP) return '👍'
  if (moment === 'error') return '🔁'
  return `🎯${Math.max(0, Math.floor(remaining))}`
}

export function resolveTranslationFooterMoment(params: {
  loading: boolean
  protocolStatus: 'prompt_only' | 'success' | 'error_repeat' | 'junk_repeat' | 'soft_fail_advance' | null
  session: TranslationSessionState
  justCompleted: boolean
}): TranslationFooterMoment {
  const { loading, protocolStatus, session, justCompleted } = params
  if (loading) return 'checking'
  if (justCompleted || (session.status === 'completed' && session.progress >= session.target)) {
    if (justCompleted) return 'complete'
    return 'post_complete'
  }
  if (
    session.dailyXpAwarded >= TRANSLATION_DAILY_GLOBAL_XP_CAP &&
    session.status === 'in_progress'
  ) {
    return 'daily_cap'
  }
  if (protocolStatus === 'error_repeat' || protocolStatus === 'junk_repeat') return 'error'
  if (protocolStatus === 'soft_fail_advance') return 'soft_fail'
  if (protocolStatus === 'success') return 'success'
  return 'idle'
}

export function buildTranslationFooterView(params: {
  session: TranslationSessionState
  moment: TranslationFooterMoment
  audience: TranslationFooterCopyAudience
  lastAwardedXp?: number
}): TranslationFooterView {
  const { session, moment, audience, lastAwardedXp = 0 } = params
  const n = session.progress
  const topTemplate = TRANSLATION_FOOTER_TOP[moment][audience]
  const dynamicText = formatTranslationFooterTop(topTemplate, {
    n,
    xp: moment === 'complete' ? lastAwardedXp || session.sessionXpAwarded : session.sessionXpAwarded,
  })
  const target = session.target || TRANSLATION_SESSION_LENGTH
  const remaining = Math.max(0, target - n)
  return {
    dynamicText,
    sessionMeter: {
      current: Math.min(n, target),
      target,
      sessionXp: session.sessionXpAwarded,
      statusLabel: translationStatusLabel({
        moment,
        remaining,
        status: session.status,
        dailyXpAwarded: session.dailyXpAwarded,
      }),
      fillPercent: translationFillPercent(n, target),
    },
    typingKey: `translation-footer:${moment}:${n}:${session.sessionXpAwarded}`,
  }
}
