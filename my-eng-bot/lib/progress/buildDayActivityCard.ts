import { computePracticeMasterySnapshot } from '@/lib/practice/practiceMastery'
import { getTodayDateString } from '@/lib/rewardsState'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import type { PracticeSession } from '@/types/practice'
import type { UserLessonProgress } from '@/types/userProgress'
import type { VocabularySessionHistoryItem } from '@/types/vocabulary'
import type { ProgressAudience, ProgressCopy } from '@/lib/uiCopy/progress'
import { ruZanyatieWord } from '@/lib/uiCopy/progress'

export const DAY_ACTIVITY_ITEM_CAP = 5

export type DayActivityKind = 'practice' | 'vocabulary' | 'lesson' | 'pronunciation'

export type DayActivityItem = {
  id: string
  kind: DayActivityKind
  title: string
  at: number
  practice?: { correct: number; total: number }
  vocabulary?: { reviewed: number; learned: number }
  lesson?: { medal: LessonMedalTierOrNull }
}

export type DayInProgressKind = 'translation' | 'dialogue' | 'communication'

export type DayInProgress = {
  kind: DayInProgressKind
  progress: number
  target: number
}

export type DayActivityCardModel = {
  date: string
  inStreak: boolean
  items: DayActivityItem[]
  totalCount: number
  inProgress: DayInProgress | null
}

type SessionSlice = {
  status?: string
  progress?: number
  target?: number
} | null | undefined

export type DayActivityCardInput = {
  date: string
  activeDays: string[]
  today: string
  toDayKey?: (instant: Date) => string
  practiceSessions: Array<
    Pick<PracticeSession, 'id' | 'topic' | 'completedAt' | 'answers' | 'questions' | 'mode' | 'targetQuestionCount'>
  >
  vocabHistory: Array<
    Pick<VocabularySessionHistoryItem, 'id' | 'completedAt' | 'reviewedWordIds' | 'learnedWordIds'>
  >
  lessons: Array<Pick<UserLessonProgress, 'lessonId' | 'topic' | 'medal' | 'lastCompleted'>>
  lessonTitleById?: (lessonId: string) => string | null
  accent: Array<{ lessonId: string; completedDates: string[] }>
  accentTitleById?: (lessonId: string) => string | null
  translationSession?: SessionSlice
  dialogueSession?: SessionSlice
  communicationSession?: SessionSlice
}

function dayKeyFromUnknown(value: number | string, toDayKey: (instant: Date) => string): { key: string; at: number } | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null
    return { key: toDayKey(new Date(value)), at: value }
  }
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const at = Date.parse(`${trimmed}T12:00:00`)
    return { key: trimmed, at: Number.isFinite(at) ? at : 0 }
  }
  const parsed = Date.parse(trimmed)
  if (!Number.isFinite(parsed)) return null
  return { key: toDayKey(new Date(parsed)), at: parsed }
}

function pickInProgress(params: {
  date: string
  today: string
  translationSession?: SessionSlice
  dialogueSession?: SessionSlice
  communicationSession?: SessionSlice
}): DayInProgress | null {
  if (params.date !== params.today) return null
  const lanes: Array<{ kind: DayInProgressKind; session: SessionSlice }> = [
    { kind: 'translation', session: params.translationSession },
    { kind: 'dialogue', session: params.dialogueSession },
    { kind: 'communication', session: params.communicationSession },
  ]
  for (const lane of lanes) {
    if (lane.session?.status !== 'in_progress') continue
    return {
      kind: lane.kind,
      progress: Math.max(0, Math.floor(lane.session.progress ?? 0)),
      target: Math.max(1, Math.floor(lane.session.target ?? 8)),
    }
  }
  return null
}

export function buildDayActivityCard(input: DayActivityCardInput): DayActivityCardModel {
  const toDayKey = input.toDayKey ?? getTodayDateString
  const items: DayActivityItem[] = []

  for (const session of input.practiceSessions) {
    if (session.completedAt == null) continue
    const day = dayKeyFromUnknown(session.completedAt, toDayKey)
    if (!day || day.key !== input.date) continue
    const mastery = computePracticeMasterySnapshot(session)
    items.push({
      id: `practice:${session.id}`,
      kind: 'practice',
      title: session.topic.trim() || session.id,
      at: day.at,
      practice: { correct: mastery.masteryScore, total: mastery.plannedLength },
    })
  }

  for (const row of input.vocabHistory) {
    const day = dayKeyFromUnknown(row.completedAt, toDayKey)
    if (!day || day.key !== input.date) continue
    items.push({
      id: `vocabulary:${row.id}`,
      kind: 'vocabulary',
      title: '',
      at: day.at,
      vocabulary: {
        reviewed: row.reviewedWordIds.length,
        learned: row.learnedWordIds.length,
      },
    })
  }

  for (const lesson of input.lessons) {
    const day = dayKeyFromUnknown(lesson.lastCompleted, toDayKey)
    if (!day || day.key !== input.date) continue
    const catalogTitle = input.lessonTitleById?.(lesson.lessonId)?.trim()
    items.push({
      id: `lesson:${lesson.lessonId}`,
      kind: 'lesson',
      title: catalogTitle || lesson.topic.trim() || lesson.lessonId,
      at: day.at,
      lesson: { medal: lesson.medal ?? null },
    })
  }

  for (const accent of input.accent) {
    let latestAt = 0
    for (const stamp of accent.completedDates) {
      const day = dayKeyFromUnknown(stamp, toDayKey)
      if (!day || day.key !== input.date) continue
      latestAt = Math.max(latestAt, day.at)
    }
    if (latestAt <= 0) continue
    items.push({
      id: `pronunciation:${accent.lessonId}`,
      kind: 'pronunciation',
      title: input.accentTitleById?.(accent.lessonId)?.trim() || accent.lessonId,
      at: latestAt,
    })
  }

  items.sort((a, b) => b.at - a.at)
  const totalCount = items.length
  return {
    date: input.date,
    inStreak: input.activeDays.includes(input.date),
    items: items.slice(0, DAY_ACTIVITY_ITEM_CAP),
    totalCount,
    inProgress: pickInProgress(input),
  }
}

export function dayActivityKindLabel(kind: DayActivityKind | DayInProgressKind, copy: ProgressCopy): string {
  if (kind === 'practice') return copy.modesPractice
  if (kind === 'vocabulary') return copy.modesVocabulary
  if (kind === 'lesson') return copy.modesLesson
  if (kind === 'pronunciation') return copy.modesPronunciation
  if (kind === 'translation') return copy.modesTranslation
  if (kind === 'dialogue') return copy.modesDialogue
  return copy.modeCommunication
}

export function formatDayItemScore(
  item: DayActivityItem,
  audience: ProgressAudience,
  copy: ProgressCopy
): string {
  if (item.kind === 'practice' && item.practice) {
    const { correct, total } = item.practice
    return audience === 'child' ? `${correct} из ${total}` : `${correct}/${total}`
  }
  if (item.kind === 'vocabulary' && item.vocabulary) {
    const reviewed = `${item.vocabulary.reviewed} ${copy.calendarVocabReviewed}`
    if (item.vocabulary.learned <= 0) return reviewed
    return `${reviewed} · ${item.vocabulary.learned} ${copy.calendarVocabLearned}`
  }
  if (item.kind === 'lesson') {
    if (item.lesson?.medal === 'gold') return copy.calendarMedalGold
    if (item.lesson?.medal === 'silver') return copy.calendarMedalSilver
    if (item.lesson?.medal === 'bronze') return copy.calendarMedalBronze
    return copy.calendarLessonDone
  }
  return ''
}

export function formatDayInProgressLine(
  row: DayInProgress,
  audience: ProgressAudience,
  copy: ProgressCopy
): string {
  const frac = audience === 'child' ? `${row.progress} из ${row.target}` : `${row.progress}/${row.target}`
  return `${copy.calendarNow} · ${frac}`
}

export function formatDaySessionCount(totalCount: number): string {
  return `${totalCount} ${ruZanyatieWord(totalCount)}`
}

export function formatDayOverflow(hidden: number, copy: ProgressCopy): string {
  return `${copy.calendarMore} ${hidden}`
}

export function formatCalendarDayHeading(date: string): string {
  const [year, month, day] = date.split('-').map((part) => Number(part))
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return date
  return new Date(year, month - 1, day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}
