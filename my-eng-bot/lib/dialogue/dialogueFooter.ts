import {
  DIALOGUE_SESSION_LENGTH,
  dialogueFillPercent,
  type DialogueSessionState,
} from '@/lib/dialogue/dialogueSessionEconomy'
import {
  DIALOGUE_FOOTER_TOP,
  formatDialogueFooterTop,
  type DialogueFooterCopyAudience,
} from '@/lib/uiCopy/dialogueFooter'

export type DialogueFooterMoment =
  | 'idle'
  | 'checking'
  | 'error'
  | 'recovered'
  | 'success'
  | 'complete'
  | 'post_complete'

export type DialogueSessionMeter = {
  current: number
  target: number
  sessionXp: number
  statusLabel: string
  fillPercent: number
}

export type DialogueFooterView = {
  dynamicText: string
  sessionMeter: DialogueSessionMeter
  typingKey: string
}

const REPEAT_LINE_RE = /(^|\n)\s*(Скажи|Say|Повтори|Repeat)\s*:/im

export function dialogueStatusLabel(params: {
  moment: DialogueFooterMoment
  remaining: number
  status: DialogueSessionState['status']
}): string {
  const { moment, remaining, status } = params
  if (status === 'completed') return '🏁'
  if (moment === 'error') return '🔁'
  return `🎯${Math.max(0, Math.floor(remaining))}`
}

export function resolveDialogueFooterMoment(params: {
  loading: boolean
  lastAssistantContent: string | null
  lastOutcome: 'success' | 'recovered' | null
  session: DialogueSessionState
  justCompleted: boolean
}): DialogueFooterMoment {
  const { loading, lastAssistantContent, lastOutcome, session, justCompleted } = params
  if (loading) return 'checking'
  if (justCompleted || (session.status === 'completed' && session.progress >= session.target)) {
    if (justCompleted) return 'complete'
    return 'post_complete'
  }
  if (lastAssistantContent && REPEAT_LINE_RE.test(lastAssistantContent)) return 'error'
  if (lastOutcome === 'recovered') return 'recovered'
  if (lastOutcome === 'success') return 'success'
  return 'idle'
}

export function buildDialogueFooterView(params: {
  session: DialogueSessionState
  moment: DialogueFooterMoment
  audience: DialogueFooterCopyAudience
  lastAwardedXp?: number
}): DialogueFooterView {
  const { session, moment, audience, lastAwardedXp = 0 } = params
  const n = session.progress
  const target = session.target || DIALOGUE_SESSION_LENGTH
  const remaining = Math.max(0, target - n)
  const copyKey = moment === 'idle' && n > 0 ? 'idle_mid' : moment
  const topTemplate = DIALOGUE_FOOTER_TOP[copyKey][audience]
  const dynamicText = formatDialogueFooterTop(topTemplate, {
    n,
    r: remaining,
    xp: moment === 'complete' ? lastAwardedXp || session.sessionXpAwarded : session.sessionXpAwarded,
  })
  return {
    dynamicText,
    sessionMeter: {
      current: Math.min(n, target),
      target,
      sessionXp: session.sessionXpAwarded,
      statusLabel: dialogueStatusLabel({
        moment,
        remaining,
        status: session.status,
      }),
      fillPercent: dialogueFillPercent(n, target),
    },
    typingKey: `dialogue-footer:${moment}:${n}:${session.sessionXpAwarded}`,
  }
}
