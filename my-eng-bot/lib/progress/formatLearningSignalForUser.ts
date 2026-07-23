import { getTheoryTagById } from '@/lib/lessonTheoryTags'
import type { LearningSignal, LearningSource } from '@/lib/learningMemory/types'
import type { ProgressAudience } from '@/lib/uiCopy/progress'

const SOURCE_LABEL: Record<LearningSource, string> = {
  chat: 'В общении',
  call: 'В звонке',
  teacher: 'В преподавателе',
  translation: 'В переводе',
  guided_dialogue: 'В диалоге',
  practice: 'В практике',
  language_note: 'В разборе',
}

export type LearningSignalFeedItem = {
  id: string
  relativeDay: string
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

export function formatRelativeDayLabel(
  isoAt: string,
  now: number = Date.now(),
  audience: ProgressAudience = 'adult'
): string {
  const at = Date.parse(isoAt)
  if (!Number.isFinite(at)) return audience === 'child' ? 'недавно' : 'недавно'
  const startToday = new Date(now)
  startToday.setHours(0, 0, 0, 0)
  const startAt = new Date(at)
  startAt.setHours(0, 0, 0, 0)
  const diffDays = Math.round((startToday.getTime() - startAt.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays <= 0) return 'сегодня'
  if (diffDays === 1) return 'вчера'
  if (diffDays < 7) return `${diffDays} дн. назад`
  return audience === 'child' ? 'раньше' : 'ранее'
}

export function formatLearningSignalForUser(
  signal: LearningSignal,
  audience: ProgressAudience = 'adult',
  now: number = Date.now()
): LearningSignalFeedItem {
  const relativeDay = formatRelativeDayLabel(signal.at, now, audience)
  const source = SOURCE_LABEL[signal.source] ?? 'В обучении'
  const skillId = signal.skillTagIds[0] ?? signal.rawTopicIds[0] ?? null
  const topic = skillId ? skillTitle(skillId, signal) : null
  const snippet = signal.snippet?.original?.trim()
  const corrected = signal.snippet?.corrected?.trim()

  let line: string
  if (snippet && corrected && audience === 'adult') {
    line = topic
      ? `${source} · ${topic}: «${snippet}» → «${corrected}»`
      : `${source}: «${snippet}» → «${corrected}»`
  } else if (snippet) {
    const noticed = audience === 'child' ? 'Заметили' : 'Заметили'
    line = topic
      ? `${source} · ${topic}. ${noticed}: «${snippet}»`
      : `${source}. ${noticed}: «${snippet}»`
  } else if (topic) {
    line = `${source} · ${topic}`
  } else {
    line = source
  }

  return { id: signal.id, relativeDay, line }
}

export function listLearningSignalFeed(
  signals: LearningSignal[],
  audience: ProgressAudience,
  limit: number = 10,
  now: number = Date.now()
): LearningSignalFeedItem[] {
  return [...signals]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, Math.max(0, limit))
    .map((s) => formatLearningSignalForUser(s, audience, now))
}
