import type { PostLessonOption } from '@/types/lesson'

export const DEFAULT_POST_LESSON_OPTIONS: PostLessonOption[] = [
  { action: 'repeat_variant', label: 'Еще вариант' },
  { action: 'learn_interesting', label: 'Фишки' },
  { action: 'independent_practice', label: 'Практика' },
  { action: 'myeng_training', label: 'Тренировка в Engvo' },
]
