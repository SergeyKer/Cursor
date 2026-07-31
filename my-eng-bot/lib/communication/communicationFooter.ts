import {
  COMMUNICATION_DAILY_GLOBAL_XP_CAP,
  COMMUNICATION_SESSION_LENGTH,
  communicationFillPercent,
  type CommunicationSessionState,
} from '@/lib/communication/communicationSessionEconomy'
import {
  COMMUNICATION_FOOTER_TOP,
  formatCommunicationFooterTop,
  type CommunicationFooterCopyAudience,
} from '@/lib/uiCopy/communicationFooter'

export type CommunicationFooterMoment =
  | 'idle'
  | 'checking'
  | 'success'
  | 'complete'
  | 'post_complete'
  | 'daily_cap'

export type CommunicationSessionMeter = {
  current: number
  target: number
  sessionXp: number
  statusLabel: string
  fillPercent: number
}

export type CommunicationFooterView = {
  dynamicText: string
  sessionMeter: CommunicationSessionMeter
  typingKey: string
}

export function communicationStatusLabel(params: {
  remaining: number
  status: CommunicationSessionState['status']
  dailyXpAwarded: number
}): string {
  const { remaining, status, dailyXpAwarded } = params
  if (status === 'completed') return '🏁'
  if (dailyXpAwarded >= COMMUNICATION_DAILY_GLOBAL_XP_CAP) return '👍'
  return `🎯${Math.max(0, Math.floor(remaining))}`
}

export function resolveCommunicationFooterMoment(params: {
  loading: boolean
  lastOutcome: 'success' | null
  session: CommunicationSessionState
  justCompleted: boolean
}): CommunicationFooterMoment {
  const { loading, lastOutcome, session, justCompleted } = params
  if (loading) return 'checking'
  if (justCompleted || (session.status === 'completed' && session.progress >= session.target)) {
    if (justCompleted) return 'complete'
    return 'post_complete'
  }
  if (
    session.dailyXpAwarded >= COMMUNICATION_DAILY_GLOBAL_XP_CAP &&
    session.status === 'in_progress'
  ) {
    return 'daily_cap'
  }
  if (lastOutcome === 'success') return 'success'
  return 'idle'
}

export function buildCommunicationFooterView(params: {
  session: CommunicationSessionState
  moment: CommunicationFooterMoment
  audience: CommunicationFooterCopyAudience
  lastAwardedXp?: number
  /** When idle, prefer voice TOP from AppShell instead of economy idle. */
  voiceTopOverride?: string | null
}): CommunicationFooterView {
  const { session, moment, audience, lastAwardedXp = 0, voiceTopOverride } = params
  const n = session.progress
  const target = session.target || COMMUNICATION_SESSION_LENGTH
  const remaining = Math.max(0, target - n)
  const topTemplate = COMMUNICATION_FOOTER_TOP[moment][audience]
  let dynamicText = formatCommunicationFooterTop(topTemplate, {
    n,
    xp: moment === 'complete' ? lastAwardedXp || session.sessionXpAwarded : session.sessionXpAwarded,
  })
  if (moment === 'idle' && voiceTopOverride && voiceTopOverride.trim()) {
    dynamicText = voiceTopOverride.trim()
  }
  return {
    dynamicText,
    sessionMeter: {
      current: Math.min(n, target),
      target,
      sessionXp: session.sessionXpAwarded,
      statusLabel: communicationStatusLabel({
        remaining,
        status: session.status,
        dailyXpAwarded: session.dailyXpAwarded,
      }),
      fillPercent: communicationFillPercent(n, target),
    },
    typingKey: `communication-footer-${moment}-${n}-${session.status}`,
  }
}
