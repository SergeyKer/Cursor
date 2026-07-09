import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'
import type { PracticeExerciseType } from '@/types/practice'

export type ReferenceExerciseOption = {
  id: PracticeExerciseType
  label: string
  summary: string
  /** Номер шага в challenge (1–12) — для редакции эталона в порядке маршрута. */
  challengeStep: number
}

const REFERENCE_EXERCISE_META: Record<
  PracticeExerciseType,
  { label: string; summary: string }
> = {
  choice: {
    label: 'Выбор варианта',
    summary: 'Нужно выбрать лучший ответ из нескольких вариантов.',
  },
  'voice-shadow': {
    label: 'Повтори за диктором',
    summary: 'Прослушайте фразу и повторите ее вслух или текстом.',
  },
  'dropdown-fill': {
    label: 'Пропуск в предложении',
    summary: 'Выберите правильный вариант из выпадающего списка.',
  },
  'listening-select': {
    label: 'Слушай и выбирай',
    summary: 'Сначала прослушайте фразу, затем выберите ответ.',
  },
  'sentence-surgery': {
    label: 'Собери предложение',
    summary: 'Соберите правильную фразу из набора слов.',
  },
  'free-response': {
    label: 'Свободный ответ',
    summary: 'Ответьте своим предложением по теме задания.',
  },
  'word-builder-pro': {
    label: 'Конструктор фразы',
    summary: 'Постройте фразу из слов в правильном порядке.',
  },
  dictation: {
    label: 'Диктант',
    summary: 'Прослушайте и напишите фразу по памяти.',
  },
  'roleplay-mini': {
    label: 'Мини-диалог',
    summary: 'Ответьте собеседнику одним-двумя предложениями по шаблону темы.',
  },
  'boss-challenge': {
    label: 'Финальный вызов',
    summary: 'Расширенный ответ с применением темы целиком.',
  },
  'error-fix': {
    label: 'Исправь ошибку',
    summary: 'Исправьте фразу под ситуацию голосом или текстом.',
  },
  'context-clue': {
    label: 'Подсказка по контексту',
    summary: 'Выберите ответ, опираясь на контекст задачи.',
  },
}

/** Эталон в меню: #N = шаг N в challenge (порядок редакции). */
export const REFERENCE_EXERCISE_OPTIONS: ReferenceExerciseOption[] = CHALLENGE_STEP_SPECS.map(
  (spec, index) => ({
    id: spec.type,
    challengeStep: index + 1,
    ...REFERENCE_EXERCISE_META[spec.type],
  })
)

export function getReferenceExerciseChallengeStep(type: PracticeExerciseType): number {
  const match = REFERENCE_EXERCISE_OPTIONS.find((item) => item.id === type)
  return match?.challengeStep ?? 0
}
