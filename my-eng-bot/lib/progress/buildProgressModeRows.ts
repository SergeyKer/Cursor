import type { ProgressLaunchTarget } from '@/lib/progress/progressActions'
import type { RewardsState } from '@/lib/rewardsState'
import type { ProgressAudience, ProgressCopy } from '@/lib/uiCopy/progress'

export type ProgressModeRowId =
  | 'communication'
  | 'engvo'
  | 'lesson'
  | 'practice'
  | 'translation'
  | 'dialogue'
  | 'vocabulary'
  | 'tutor'
  | 'pronunciation'

export type ProgressModeRowFlags = {
  engvoVoiceV1: boolean
  practiceEngineV1: boolean
  tutorChatV1: boolean
  accentTrainerV1: boolean
}

export type ProgressModeRow = {
  id: ProgressModeRowId
  label: string
  metric: string
  target: ProgressLaunchTarget
}

export type VocabProgressMarks = {
  study: number
  mistakes: number
  know: number
}

export type AccentProgressMarks = {
  attempts: number
  bestScore: number
}

type SessionLike = {
  status?: string
  progress?: number
  target?: number
} | null | undefined

export function countVocabProgressMarks(
  words: Record<string, { userMark?: string | null }>,
  mistakeCount: number
): VocabProgressMarks {
  let study = 0
  let know = 0
  for (const row of Object.values(words)) {
    if (row.userMark === 'study') study += 1
    else if (row.userMark === 'know') know += 1
  }
  return {
    study,
    mistakes: Math.max(0, Math.floor(mistakeCount)),
    know,
  }
}

function sessionStatusLabel(status: string | undefined, copy: ProgressCopy): string {
  if (status === 'completed') return copy.statusCompleted
  if (status === 'in_progress') return copy.statusInProgress
  if (status === 'abandoned') return copy.statusAbandoned
  return copy.statusNotStarted
}

function fractionLine(progress: number, target: number, audience: ProgressAudience): string {
  return audience === 'child' ? `${progress} из ${target}` : `${progress}/${target}`
}

function sessionMetric(session: SessionLike, copy: ProgressCopy, audience: ProgressAudience): string {
  const status = session?.status
  const progress = Math.max(0, Math.floor(session?.progress ?? 0))
  const target = Math.max(1, Math.floor(session?.target ?? 8))
  if (!status || status === 'not_started') return copy.statusNotStarted
  return `${fractionLine(progress, target, audience)} · ${sessionStatusLabel(status, copy)}`
}

function goalMetric(
  goal: { status?: string; goalProgress?: number; goalTarget?: number } | undefined,
  copy: ProgressCopy,
  audience: ProgressAudience
): string {
  if (!goal || goal.status === 'not_started' || !goal.status) return copy.statusNotStarted
  const progress = Math.max(0, Math.floor(goal.goalProgress ?? 0))
  const target = Math.max(1, Math.floor(goal.goalTarget ?? 7))
  return `${fractionLine(progress, target, audience)} · ${sessionStatusLabel(goal.status, copy)}`
}

function lessonMetric(
  medals: { gold: number; silver: number; bronze: number },
  copy: ProgressCopy
): string {
  const total = medals.gold + medals.silver + medals.bronze
  if (total <= 0) return copy.statusNotStarted
  return `${total}`
}

function practiceMetric(
  stats: { opened: number; gold: number; total: number },
  nearest: { line: string } | null,
  copy: ProgressCopy
): string {
  if (stats.opened <= 0 && stats.gold <= 0) return copy.statusNotStarted
  if (nearest?.line) return nearest.line
  return `${stats.opened}/${stats.total}`
}

function vocabMetric(marks: VocabProgressMarks, copy: ProgressCopy): string {
  if (marks.study <= 0 && marks.mistakes <= 0 && marks.know <= 0) return copy.statusNotStarted
  return `учу ${marks.study} · ошибки ${marks.mistakes} · умею ${marks.know}`
}

function tutorMetric(count: number, copy: ProgressCopy): string {
  if (count <= 0) return copy.statusNotStarted
  return `${count}`
}

function accentMetric(accent: AccentProgressMarks, copy: ProgressCopy): string {
  if (accent.attempts <= 0) return copy.statusNotStarted
  return `${Math.round(accent.bestScore)}% · ${accent.attempts}`
}

export function buildProgressModeRows(params: {
  copy: ProgressCopy
  audience: ProgressAudience
  flags: ProgressModeRowFlags
  rewardsState: RewardsState | undefined
  medals: { gold: number; silver: number; bronze: number }
  practiceBadgeStats: { opened: number; gold: number; total: number }
  nearestBadge: { emoji: string; line: string } | null
  vocab: VocabProgressMarks
  tutorTodayCount: number
  accent: AccentProgressMarks
}): ProgressModeRow[] {
  const { copy, audience, flags, rewardsState } = params
  const rows: ProgressModeRow[] = [
    {
      id: 'communication',
      label: copy.modeCommunication,
      metric: sessionMetric(rewardsState?.communicationSession, copy, audience),
      target: { kind: 'communication' },
    },
  ]

  if (flags.engvoVoiceV1) {
    rows.push({
      id: 'engvo',
      label: copy.modeEngvo,
      metric: goalMetric(rewardsState?.modeGoals.engvo, copy, audience),
      target: { kind: 'engvo' },
    })
  }

  rows.push(
    {
      id: 'lesson',
      label: copy.modesLesson,
      metric: lessonMetric(params.medals, copy),
      target: { kind: 'detail', detail: 'awards' },
    },
    ...(flags.practiceEngineV1
      ? [
          {
            id: 'practice' as const,
            label: copy.modesPractice,
            metric: practiceMetric(params.practiceBadgeStats, params.nearestBadge, copy),
            target: { kind: 'quick_practice' as const },
          },
        ]
      : []),
    {
      id: 'translation',
      label: copy.modesTranslation,
      metric: sessionMetric(rewardsState?.translationSession, copy, audience),
      target: { kind: 'translation' },
    },
    {
      id: 'dialogue',
      label: copy.modesDialogue,
      metric: sessionMetric(rewardsState?.dialogueSession, copy, audience),
      target: { kind: 'dialogue' },
    },
    {
      id: 'vocabulary',
      label: copy.modesVocabulary,
      metric: vocabMetric(params.vocab, copy),
      target: { kind: 'vocabulary' },
    }
  )

  if (flags.tutorChatV1) {
    rows.push({
      id: 'tutor',
      label: copy.modesTutor,
      metric: tutorMetric(params.tutorTodayCount, copy),
      target: { kind: 'tutor' },
    })
  }

  if (flags.accentTrainerV1) {
    rows.push({
      id: 'pronunciation',
      label: copy.modesPronunciation,
      metric: accentMetric(params.accent, copy),
      target: { kind: 'pronunciation' },
    })
  }

  return rows
}
