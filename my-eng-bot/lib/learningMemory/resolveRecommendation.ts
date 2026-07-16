import { getLessonTopicCatalog } from '@/lib/lessonCatalog'
import { getTheoryTagById } from '@/lib/lessonTheoryTags'
import type { SkillRecommendation } from '@/lib/learningMemory/types'

export function resolveRecommendation(params: {
  skillTagId: string
  lessonIdHint?: string | null
  titleFallback?: string
}): SkillRecommendation {
  const catalog = getLessonTopicCatalog()
  const title =
    params.titleFallback?.trim() ||
    getTheoryTagById(params.skillTagId)?.title ||
    params.skillTagId

  const hint =
    params.lessonIdHint && catalog.find((c) => c.id === params.lessonIdHint && c.enabled)
      ? params.lessonIdHint
      : null
  const byTag = catalog.find((c) => c.enabled && c.tagIds?.includes(params.skillTagId))
  const lesson = hint ? catalog.find((c) => c.id === hint)! : byTag

  if (lesson?.hasTheory) {
    return {
      kind: 'open_lesson',
      lessonId: lesson.id,
      title: lesson.title,
      chipActive: true,
      suggestionLine: 'Открыть урок',
    }
  }
  if (lesson?.hasPractice) {
    return {
      kind: 'start_practice',
      lessonId: lesson.id,
      title: lesson.title,
      chipActive: true,
      suggestionLine: 'Запустить практику',
    }
  }

  return {
    kind: 'suggest_text',
    title,
    chipActive: false,
    suggestionLine: 'Когда урок появится в каталоге — откроется отсюда',
  }
}
