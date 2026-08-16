import type { MyPlanAction } from '@/lib/myPlan/types'

export type DailyStarModeId = 'communication' | 'translation' | 'dialogue' | 'engvo'

export type DailyStarModeMeter = {
  status: string
  progress: number
  target: number
  completedAt?: string | null
}

export type DailyStarPickInput = {
  todayDate: string
  communication: DailyStarModeMeter
  translation: DailyStarModeMeter
  dialogue: DailyStarModeMeter
  engvo: DailyStarModeMeter
  practiceInProgress: boolean
  engvoVoiceEnabled: boolean
}

const IDLE_ORDER: DailyStarModeId[] = ['communication', 'engvo', 'translation', 'dialogue']

function actionForMode(mode: DailyStarModeId): MyPlanAction {
  if (mode === 'translation') return { kind: 'open_translation' }
  if (mode === 'dialogue') return { kind: 'open_dialogue' }
  if (mode === 'engvo') return { kind: 'open_engvo' }
  return { kind: 'open_communication' }
}

function remainingRatio(meter: DailyStarModeMeter): number {
  const target = Math.max(1, Math.floor(meter.target) || 1)
  const progress = Math.max(0, Math.min(target, Math.floor(meter.progress) || 0))
  return (target - progress) / target
}

function isInProgressToday(meter: DailyStarModeMeter, today: string): boolean {
  if (meter.completedAt === today) return false
  return meter.status === 'in_progress'
}

export function pickDailyStarAction(input: DailyStarPickInput | undefined): MyPlanAction {
  if (!input) return { kind: 'open_communication' }

  const modes: DailyStarModeId[] = ['communication', 'translation', 'dialogue', 'engvo']
  let best: { mode: DailyStarModeId; ratio: number } | null = null
  for (const mode of modes) {
    if (mode === 'engvo' && !input.engvoVoiceEnabled) continue
    const meter = input[mode]
    if (!isInProgressToday(meter, input.todayDate)) continue
    const ratio = remainingRatio(meter)
    if (!best || ratio < best.ratio) best = { mode, ratio }
  }
  if (best) return actionForMode(best.mode)

  if (input.practiceInProgress) return { kind: 'quick_practice', entrySource: 'my_plan' }

  for (const mode of IDLE_ORDER) {
    if (mode === 'engvo' && !input.engvoVoiceEnabled) continue
    if (input[mode].completedAt === input.todayDate) continue
    return actionForMode(mode)
  }
  return { kind: 'open_communication' }
}

export function dailyStarActionTitle(action: MyPlanAction): string {
  switch (action.kind) {
    case 'open_translation':
      return 'Перевод 8/8'
    case 'open_dialogue':
      return 'Диалог 8/8'
    case 'open_engvo':
      return 'Звонок 7/7'
    case 'quick_practice':
      return 'Практика'
    default:
      return 'Общение 8/8'
  }
}
