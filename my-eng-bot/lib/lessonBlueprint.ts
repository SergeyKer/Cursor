import type { Audience, LevelId } from '@/lib/types'
import type { LearningLesson, LearningLessonActionId } from '@/lib/learningLessons'

export type LessonOrigin = 'theory' | 'tutor'

export type LessonResolutionContext = {
  origin: LessonOrigin
  requestedTopic: string
  level: LevelId
  audience: Audience
  analysisSummary?: string
}

export type LessonBlueprint = Pick<LearningLesson, 'title' | 'theoryIntro' | 'actions' | 'followups'> & {
  id?: string
}

const REQUIRED_THEORY_MARKERS = ['**Урок:**', '**Правило:**', '**Примеры:**', '**Коротко:**', '**Шаблоны:**'] as const

export function hasRequiredTheoryStructure(theoryIntro: string): boolean {
  if (typeof theoryIntro !== 'string') return false
  let cursor = 0
  for (const marker of REQUIRED_THEORY_MARKERS) {
    const idx = theoryIntro.indexOf(marker, cursor)
    if (idx < 0) return false
    cursor = idx + marker.length
  }
  return true
}

export function isValidLessonBlueprint(input: unknown): input is LessonBlueprint {
  if (!input || typeof input !== 'object') return false
  const row = input as Record<string, unknown>
  if (typeof row.title !== 'string' || typeof row.theoryIntro !== 'string') return false
  if (!hasRequiredTheoryStructure(row.theoryIntro)) return false
  if (!Array.isArray(row.actions) || !row.actions.length) return false
  if (!row.followups || typeof row.followups !== 'object') return false
  const followups = row.followups as Record<string, unknown>
  const required: LearningLessonActionId[] = ['examples', 'fill_phrase', 'repeat_translate', 'write_own_sentence']
  return required.every((id) => typeof followups[id] === 'string')
}
