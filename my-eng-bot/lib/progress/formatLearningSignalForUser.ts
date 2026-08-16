import { getTheoryTagById } from '@/lib/lessonTheoryTags'
import type { LearningDetector, LearningSignal, LearningSource } from '@/lib/learningMemory/types'
import {
  REMARKS_BODY,
  REMARKS_GENRE,
  ruRazWord,
  type ProgressAudience,
} from '@/lib/uiCopy/progress'

const SOURCE_LABEL: Record<LearningSource, string> = {
  chat: 'В общении',
  call: 'В звонке',
  teacher: 'В преподавателе',
  translation: 'В переводе',
  guided_dialogue: 'В диалоге',
  practice: 'В практике',
  language_note: 'В разборе',
  tutor: 'У репетитора',
}

const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export type LearningSignalFeedItem = {
  id: string
  relativeDay: string
  contextLine: string
  bodyLines: string[]
  why?: string
  repeatCount?: number
  /** Join of context + body (+ why) for older callers. */
  line: string
}

function skillTitle(skillTagId: string, signal: LearningSignal): string {
  const tag = getTheoryTagById(skillTagId)
  if (tag) return tag.title
  const idx = signal.skillTagIds.indexOf(skillTagId)
  if (idx >= 0 && signal.rawTopicTitles[idx]) return signal.rawTopicTitles[idx]!
  const rawIdx = signal.rawTopicIds.indexOf(skillTagId)
  if (rawIdx >= 0 && signal.rawTopicTitles[rawIdx]) return signal.rawTopicTitles[rawIdx]!
  return skillTagId
}

function skillKey(signal: LearningSignal): string {
  return signal.skillTagIds[0] ?? signal.rawTopicIds[0] ?? signal.id
}

export function isReadableLearningSignal(signal: LearningSignal): boolean {
  return Boolean(signal.snippet?.original?.trim() || signal.snippet?.corrected?.trim())
}

function isPhraseDetector(detector: LearningDetector): boolean {
  return (
    detector === 'silent_assess' || detector === 'language_note' || detector === 'teacher_correction'
  )
}

function isTaskDetector(detector: LearningDetector): boolean {
  return detector === 'tutor_micro' || detector === 'practice'
}

function isTranslationDetector(detector: LearningDetector): boolean {
  return detector === 'translation_parse'
}

function quote(text: string): string {
  return `«${text}»`
}

function joinFeedLine(item: Omit<LearningSignalFeedItem, 'line'>): string {
  return [item.contextLine, ...item.bodyLines, item.why].filter(Boolean).join(' · ')
}

function formatCalendarDayLabel(at: Date, now: Date): string {
  const day = at.getDate()
  const month = MONTHS_RU[at.getMonth()] ?? ''
  if (at.getFullYear() !== now.getFullYear()) return `${day} ${month} ${at.getFullYear()}`
  return `${day} ${month}`
}

export function formatRelativeDayLabel(
  isoAt: string,
  now: number = Date.now(),
  _audience: ProgressAudience = 'adult'
): string {
  const atMs = Date.parse(isoAt)
  if (!Number.isFinite(atMs)) return 'недавно'
  const nowDate = new Date(now)
  const at = new Date(atMs)
  const startToday = new Date(nowDate)
  startToday.setHours(0, 0, 0, 0)
  const startAt = new Date(at)
  startAt.setHours(0, 0, 0, 0)
  const diffDays = Math.round((startToday.getTime() - startAt.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays <= 0) return 'сегодня'
  if (diffDays === 1) return 'вчера'
  return formatCalendarDayLabel(at, nowDate)
}

export function formatLearningSignalForUser(
  signal: LearningSignal,
  audience: ProgressAudience = 'adult',
  now: number = Date.now(),
  repeatCount?: number
): LearningSignalFeedItem | null {
  if (!isReadableLearningSignal(signal)) return null
  const relativeDay = formatRelativeDayLabel(signal.at, now, audience)
  const source = SOURCE_LABEL[signal.source] ?? 'В обучении'
  const skillId = signal.skillTagIds[0] ?? signal.rawTopicIds[0] ?? null
  const topic = skillId ? skillTitle(skillId, signal) : null
  const original = signal.snippet?.original?.trim() ?? ''
  const corrected = signal.snippet?.corrected?.trim() ?? ''
  const why = signal.snippet?.why?.trim() || undefined
  const countSuffix =
    repeatCount && repeatCount > 1 ? ` · ${repeatCount} ${ruRazWord(repeatCount)}` : ''

  let contextLine: string
  let bodyLines: string[]

  if (audience === 'child') {
    contextLine = `${source}${countSuffix}`
    bodyLines = corrected
      ? [`${REMARKS_BODY.need}: ${quote(corrected)}`]
      : [`${REMARKS_BODY.noticed}: ${quote(original)}`]
  } else if (isTaskDetector(signal.detector)) {
    contextLine = topic
      ? `${source} · ${REMARKS_GENRE.task} «${topic}»${countSuffix}`
      : `${source} · ${REMARKS_GENRE.task}${countSuffix}`
    bodyLines = []
    if (original) bodyLines.push(`${REMARKS_BODY.chose}: ${quote(original)}`)
    if (corrected) bodyLines.push(`${REMARKS_BODY.correct}: ${quote(corrected)}`)
  } else if (isPhraseDetector(signal.detector)) {
    contextLine = `${source} · ${REMARKS_GENRE.phrase}${countSuffix}`
    bodyLines =
      original && corrected
        ? [`${quote(original)} → ${quote(corrected)}`]
        : original
          ? [quote(original)]
          : [quote(corrected)]
  } else if (isTranslationDetector(signal.detector)) {
    contextLine = `${source}${countSuffix}`
    bodyLines =
      original && corrected
        ? [`${quote(original)} → ${quote(corrected)}`]
        : original
          ? [quote(original)]
          : [quote(corrected)]
  } else {
    contextLine = `${source}${countSuffix}`
    if (original && corrected) bodyLines = [`${quote(original)} → ${quote(corrected)}`]
    else if (original) bodyLines = [quote(original)]
    else bodyLines = [quote(corrected)]
  }

  const item = {
    id: signal.id,
    relativeDay,
    contextLine,
    bodyLines,
    why: audience === 'adult' ? why : undefined,
    repeatCount,
  }
  return { ...item, line: joinFeedLine(item) }
}

export function listLearningSignalFeed(
  signals: LearningSignal[],
  audience: ProgressAudience,
  limit: number = 10,
  now: number = Date.now()
): LearningSignalFeedItem[] {
  return [...signals]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .map((s) => formatLearningSignalForUser(s, audience, now))
    .filter((item): item is LearningSignalFeedItem => item != null)
    .slice(0, Math.max(0, limit))
}

function previewKind(detector: LearningDetector): 'phrase' | 'task' | 'translation' | 'other' {
  if (isPhraseDetector(detector)) return 'phrase'
  if (isTaskDetector(detector)) return 'task'
  if (isTranslationDetector(detector)) return 'translation'
  return 'other'
}

function taskRepeatCount(signals: LearningSignal[], latest: LearningSignal): number {
  const key = skillKey(latest)
  return signals.filter((s) => isTaskDetector(s.detector) && skillKey(s) === key).length
}

/** Overview: up to 3 slots (phrase, task, translation), then fill from other skills. */
export function listRemarksPreview(
  signals: LearningSignal[],
  audience: ProgressAudience,
  now: number = Date.now()
): LearningSignalFeedItem[] {
  const sorted = [...signals]
    .filter(isReadableLearningSignal)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  const used = new Set<string>()
  const out: LearningSignalFeedItem[] = []

  const take = (signal: LearningSignal | undefined, count?: number) => {
    if (!signal || used.has(signal.id) || out.length >= 3) return
    const item = formatLearningSignalForUser(signal, audience, now, count)
    if (!item) return
    used.add(signal.id)
    out.push(item)
  }

  const firstPhrase = sorted.find((s) => previewKind(s.detector) === 'phrase')
  const firstTask = sorted.find((s) => previewKind(s.detector) === 'task')
  const firstTranslation = sorted.find((s) => previewKind(s.detector) === 'translation')

  take(firstPhrase)
  take(firstTask, firstTask ? taskRepeatCount(sorted, firstTask) : undefined)
  take(firstTranslation)

  for (const signal of sorted) {
    if (out.length >= 3) break
    if (used.has(signal.id)) continue
    if (isTaskDetector(signal.detector) && firstTask && skillKey(signal) === skillKey(firstTask)) {
      continue
    }
    const count = isTaskDetector(signal.detector) ? taskRepeatCount(sorted, signal) : undefined
    take(signal, count)
  }

  return out
}
