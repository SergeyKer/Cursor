import { getLessonTopicCatalog } from '@/lib/lessonCatalog'
import { getTheoryTagById } from '@/lib/lessonTheoryTags'
import {
  ATTENTION_WINDOW_MS,
  MAX_ATTENTION_ZONES,
  type AttentionZone,
  type LearningSignal,
  type LearningSource,
  type SkillMasterySlice,
} from '@/lib/learningMemory/types'

const SOURCE_LABEL: Record<LearningSource, string> = {
  chat: 'В общении',
  call: 'В звонке',
  translation: 'В переводе',
  guided_dialogue: 'В диалоге',
  practice: 'В практике',
  language_note: 'В разборе',
}

function skillTitle(skillTagId: string, signals: LearningSignal[]): string {
  const tag = getTheoryTagById(skillTagId)
  if (tag) return tag.title
  for (const s of signals) {
    const idx = s.skillTagIds.indexOf(skillTagId)
    if (idx >= 0 && s.rawTopicTitles[idx]) return s.rawTopicTitles[idx]!
    const rawIdx = s.rawTopicIds.indexOf(skillTagId)
    if (rawIdx >= 0 && s.rawTopicTitles[rawIdx]) return s.rawTopicTitles[rawIdx]!
  }
  return skillTagId
}

function dominantSourceHint(bySource: Partial<Record<LearningSource, number>>): string {
  const entries = Object.entries(bySource) as [LearningSource, number][]
  if (entries.length === 0) return 'В нескольких режимах'
  entries.sort((a, b) => b[1] - a[1])
  const top = entries[0]!
  const second = entries[1]
  if (second && top[1] >= second[1] * 1.5) {
    if (
      (top[0] === 'call' || top[0] === 'chat') &&
      (second[0] === 'guided_dialogue' || second[0] === 'practice')
    ) {
      return `Чаще ${SOURCE_LABEL[top[0]].toLowerCase()}, чем ${SOURCE_LABEL[second[0]].toLowerCase()}`
    }
  }
  return SOURCE_LABEL[top[0]] ?? 'В нескольких режимах'
}

export function buildSkillMasteryFromSignals(
  signals: LearningSignal[],
  masteryOverrides: Record<string, SkillMasterySlice>,
  now: number = Date.now()
): SkillMasterySlice[] {
  const windowStart = now - ATTENTION_WINDOW_MS
  const acc = new Map<string, SkillMasterySlice>()

  for (const signal of signals) {
    const at = Date.parse(signal.at)
    if (!Number.isFinite(at) || at < windowStart) continue
    const skills =
      signal.skillTagIds.length > 0
        ? signal.skillTagIds
        : signal.rawTopicIds.length > 0
          ? signal.rawTopicIds
          : ['unknown']
    for (const skillTagId of skills) {
      const prev = acc.get(skillTagId)
      const bySource = { ...(prev?.bySource ?? {}) }
      bySource[signal.source] = (bySource[signal.source] ?? 0) + 1
      const lastAt = !prev || Date.parse(signal.at) >= Date.parse(prev.lastAt) ? signal.at : prev.lastAt
      acc.set(skillTagId, {
        skillTagId,
        errorCount: (prev?.errorCount ?? 0) + 1,
        bySource,
        lastAt,
        lessonIdHint: signal.lessonIdHint ?? prev?.lessonIdHint ?? null,
        resolvedUntil: masteryOverrides[skillTagId]?.resolvedUntil ?? prev?.resolvedUntil ?? null,
      })
    }
  }

  for (const [id, override] of Object.entries(masteryOverrides)) {
    if (!acc.has(id) && override.resolvedUntil) {
      acc.set(id, { ...override })
    } else if (acc.has(id) && override.resolvedUntil) {
      acc.set(id, { ...acc.get(id)!, resolvedUntil: override.resolvedUntil })
    }
  }

  return [...acc.values()]
}

export function scoreSkill(slice: SkillMasterySlice, now: number = Date.now()): number {
  const resolvedUntil = slice.resolvedUntil ? Date.parse(slice.resolvedUntil) : NaN
  if (Number.isFinite(resolvedUntil) && resolvedUntil > now) return -1

  const lastAt = Date.parse(slice.lastAt) || now
  const ageDays = Math.max(0, (now - lastAt) / (24 * 60 * 60 * 1000))
  const recency = Math.max(0, 14 - ageDays)
  return slice.errorCount * 10 + recency * 2
}

export function getAttentionZones(
  signals: LearningSignal[],
  masteryOverrides: Record<string, SkillMasterySlice>,
  now: number = Date.now()
): AttentionZone[] {
  const slices = buildSkillMasteryFromSignals(signals, masteryOverrides, now)
  const catalog = getLessonTopicCatalog()

  const zones: AttentionZone[] = slices
    .map((slice) => {
      const score = scoreSkill(slice, now)
      if (score < 0) return null
      const lessonFromHint =
        slice.lessonIdHint && catalog.some((c) => c.id === slice.lessonIdHint && c.enabled)
          ? slice.lessonIdHint
          : null
      const lessonFromTag =
        catalog.find((c) => c.enabled && c.tagIds?.includes(slice.skillTagId))?.id ?? null
      const lessonId = lessonFromHint ?? lessonFromTag
      const title = skillTitle(slice.skillTagId, signals)
      const chipActive = Boolean(lessonId)
      return {
        skillTagId: slice.skillTagId,
        title,
        errorCount: slice.errorCount,
        sourceHint: dominantSourceHint(slice.bySource),
        lessonId,
        chipActive,
        suggestionLine: chipActive
          ? 'Открыть урок'
          : 'Когда урок появится в каталоге — откроется отсюда',
        score,
      } satisfies AttentionZone
    })
    .filter((z): z is AttentionZone => z != null)

  zones.sort((a, b) => b.score - a.score || b.errorCount - a.errorCount)
  return zones.slice(0, MAX_ATTENTION_ZONES)
}

export function detectModeGap(
  signals: LearningSignal[],
  now: number = Date.now()
): { skillTagId: string; title: string } | null {
  const windowStart = now - ATTENTION_WINDOW_MS
  const recent = signals.filter((s) => {
    const at = Date.parse(s.at)
    return Number.isFinite(at) && at >= windowStart
  })
  const callChat = recent.filter((s) => s.source === 'call' || s.source === 'chat').length
  const guided = recent.filter((s) => s.source === 'guided_dialogue').length
  if (callChat < 3 || callChat < guided * 2) return null

  const zones = getAttentionZones(recent, {}, now)
  const top = zones[0]
  if (!top) {
    return { skillTagId: 'spoken-fluency', title: 'Живая речь' }
  }
  return { skillTagId: top.skillTagId, title: top.title }
}
