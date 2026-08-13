import {
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
  | 'no_xp'
  | 'complete'
  | 'complete_zero'
  | 'post_complete'
  | 'post_complete_zero'

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
}): string {
  const { remaining, status } = params
  if (status === 'completed') return '🏁'
  return `🎯${Math.max(0, Math.floor(remaining))}`
}

export function resolveCommunicationFooterMoment(params: {
  loading: boolean
  lastOutcome: 'success' | 'no_xp' | null
  session: CommunicationSessionState
  justCompleted: boolean
}): CommunicationFooterMoment {
  const { loading, lastOutcome, session, justCompleted } = params
  if (loading) return 'checking'
  const zeroXp = session.sessionXpAwarded <= 0
  if (justCompleted || (session.status === 'completed' && session.progress >= session.target)) {
    if (justCompleted) return zeroXp ? 'complete_zero' : 'complete'
    return zeroXp ? 'post_complete_zero' : 'post_complete'
  }
  if (lastOutcome === 'success') return 'success'
  if (lastOutcome === 'no_xp') return 'no_xp'
  return 'idle'
}

export function buildCommunicationFooterView(params: {
  session: CommunicationSessionState
  moment: CommunicationFooterMoment
  audience: CommunicationFooterCopyAudience
  lastAwardedXp?: number
  /** When idle at 0, prefer voice TOP from AppShell instead of economy idle. */
  voiceTopOverride?: string | null
}): CommunicationFooterView {
  const { session, moment, audience, lastAwardedXp = 0, voiceTopOverride } = params
  const n = session.progress
  const target = session.target || COMMUNICATION_SESSION_LENGTH
  const remaining = Math.max(0, target - n)
  const copyKey = moment === 'idle' && n > 0 ? 'idle_mid' : moment
  const topTemplate = COMMUNICATION_FOOTER_TOP[copyKey][audience]
  let dynamicText = formatCommunicationFooterTop(topTemplate, {
    n,
    r: remaining,
    xp:
      moment === 'complete' || moment === 'complete_zero'
        ? lastAwardedXp || session.sessionXpAwarded
        : session.sessionXpAwarded,
  })
  if (moment === 'idle' && n === 0 && voiceTopOverride && voiceTopOverride.trim()) {
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
      }),
      fillPercent: communicationFillPercent(n, target),
    },
    typingKey: `communication-footer-${moment}-${n}-${session.status}`,
  }
}
