import { loadLessonProgressMap } from '@/lib/lessonProgressStorage'
import { getPracticeTopicProgress } from '@/lib/practice/practiceTopicProgressStorage'

export function countTopicCupStats(): { cups: number; withMedal: number } {
  const lessonProgressMap = loadLessonProgressMap()
  const rows = Object.values(lessonProgressMap).filter((row) => row.medal)
  let cups = 0
  for (const row of rows) {
    const progress = getPracticeTopicProgress(row.lessonId)
    if (progress.cupClaimed) cups += 1
  }
  return { cups, withMedal: rows.length }
}
