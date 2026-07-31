import {
  TRANSLATION_DAILY_GLOBAL_XP_CAP,
  TRANSLATION_SESSION_LENGTH,
  translationFillPercent,
  type TranslationSessionState,
  type TranslationSessionStatus,
} from '@/lib/translation/translationSessionEconomy'
import {
  TRANSLATION_FOOTER_STATUS,
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

function statusLabelFor(
  status: TranslationSessionStatus,
  dailyXpAwarded: number,
  audience: TranslationFooterCopyAudience,
  progress: number
): string {
  if (dailyXpAwarded >= TRANSLATION_DAILY_GLOBAL_XP_CAP && status !== 'completed') {
    return TRANSLATION_FOOTER_STATUS.capped[audience]
  }
  if (status === 'completed') return TRANSLATION_FOOTER_STATUS.done[audience]
  if (status === 'in_progress' && progress > 0) return TRANSLATION_FOOTER_STATUS.active[audience]
  return TRANSLATION_FOOTER_STATUS.goal[audience]
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
  return {
    dynamicText,
    sessionMeter: {
      current: Math.min(n, target),
      target,
      sessionXp: session.sessionXpAwarded,
      statusLabel: statusLabelFor(session.status, session.dailyXpAwarded, audience, n),
      fillPercent: translationFillPercent(n, target),
    },
    typingKey: `translation-footer:${moment}:${n}:${session.sessionXpAwarded}`,
  }
}
