import type { PostLessonOption } from '@/types/lesson'

export const DEFAULT_POST_LESSON_OPTIONS: PostLessonOption[] = [
  { action: 'repeat_variant', label: 'Еще вариант', icon: '🔁' },
  { action: 'learn_interesting', label: 'Фишки', icon: '✨' },
  { action: 'independent_practice', label: 'Практика', icon: '🎯' },
  { action: 'myeng_training', label: 'Тренировка в Engvo', icon: '🤖' },
]
