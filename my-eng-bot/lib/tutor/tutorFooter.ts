import {
  TUTOR_FOOTER_TOP,
  formatTutorFooterTop,
  type TutorFooterCopyAudience,
} from '@/lib/uiCopy/tutorFooter'

export type TutorFooterMoment =
  | 'idle'
  | 'triage'
  | 'busy_explain'
  | 'post_explain'
  | 'micro_loading'
  | 'micro_revealing'
  | 'micro_active'
  | 'micro_finale'

export type TutorSessionMeter = {
  current: number
  target: number
  sessionXp: number
  statusLabel: string
  fillPercent: number
}

export type TutorFooterView = {
  dynamicText: string
  /** Empty when meter shown — AppShell supplies compact static outside micro. */
  staticText: string
  sessionMeter: TutorSessionMeter | null
  typingKey: string
}

export type TutorMicroPhaseForFooter = 'idle' | 'revealing' | 'active' | 'finale'

function tutorFillPercent(current: number, target: number): number {
  const safeTarget = Math.max(1, Math.floor(target))
  const safeCurrent = Math.max(0, Math.min(safeTarget, Math.floor(current)))
  return Math.round((safeCurrent / safeTarget) * 100)
}

export function tutorMicroStatusLabel(params: {
  moment: TutorFooterMoment
  remaining: number
}): string {
  if (params.moment === 'micro_finale') return '🏁'
  return `🎯${Math.max(0, Math.floor(params.remaining))}`
}

export function resolveTutorFooterMoment(params: {
  busy: boolean
  loadingMicro: boolean
  microPhase: TutorMicroPhaseForFooter
  hasMicroPack: boolean
  hasLastExplain: boolean
  hasTriageChips: boolean
}): TutorFooterMoment {
  const { busy, loadingMicro, microPhase, hasMicroPack, hasLastExplain, hasTriageChips } = params

  if (loadingMicro && !hasMicroPack) return 'micro_loading'
  if (microPhase === 'revealing' && hasMicroPack) return 'micro_revealing'
  if (microPhase === 'active' && hasMicroPack) return 'micro_active'
  if (microPhase === 'finale' && hasMicroPack) return 'micro_finale'
  if (busy) return 'busy_explain'
  if (hasTriageChips) return 'triage'
  if (hasLastExplain) return 'post_explain'
  return 'idle'
}

export function buildTutorFooterView(params: {
  moment: TutorFooterMoment
  audience: TutorFooterCopyAudience
  microIndex?: number
  microTotal?: number
  /** Visit XP shown on micro meter LEFT. */
  sessionXp?: number
}): TutorFooterView {
  const { moment, audience } = params
  const total = Math.max(0, Math.floor(params.microTotal ?? 0))
  const index = Math.max(0, Math.floor(params.microIndex ?? 0))
  const current = Math.min(index, total)
  const remaining = Math.max(0, total - current)
  const sessionXp = Math.max(0, Math.floor(params.sessionXp ?? 0))

  const topTemplate = TUTOR_FOOTER_TOP[moment][audience]
  const dynamicText = formatTutorFooterTop(topTemplate, {
    n: moment === 'micro_finale' ? total : Math.min(current + 1, Math.max(total, 1)),
    total: Math.max(total, 1),
  })

  const showMeter =
    (moment === 'micro_revealing' || moment === 'micro_active' || moment === 'micro_finale') &&
    total > 0

  const sessionMeter: TutorSessionMeter | null = showMeter
    ? {
        current: moment === 'micro_finale' ? total : current,
        target: total,
        sessionXp,
        statusLabel: tutorMicroStatusLabel({ moment, remaining: moment === 'micro_finale' ? 0 : remaining }),
        fillPercent: tutorFillPercent(moment === 'micro_finale' ? total : current, total),
      }
    : null

  return {
    dynamicText,
    staticText: '',
    sessionMeter,
    typingKey: `tutor-footer:${moment}:${current}:${total}:${sessionXp}`,
  }
}
