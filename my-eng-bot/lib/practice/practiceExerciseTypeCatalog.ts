import type { PracticeExerciseType } from '@/types/practice'

/**
 * Канонический порядок типов практики (1–12), совпадает с объявлением `PracticeExerciseType` в `types/practice.ts`.
 * При добавлении нового типа — расширить union и этот массив.
 */
export const PRACTICE_EXERCISE_TYPES_CATALOG_ORDER: readonly PracticeExerciseType[] = [
  'choice',
  'voice-shadow',
  'dropdown-fill',
  'listening-select',
  'sentence-surgery',
  'free-response',
  'word-builder-pro',
  'dictation',
  'roleplay-mini',
  'boss-challenge',
  'speed-round',
  'context-clue',
] as const

type CatalogMember = (typeof PRACTICE_EXERCISE_TYPES_CATALOG_ORDER)[number]
type _CatalogMatchesPracticeExerciseType = Exclude<PracticeExerciseType, CatalogMember> extends never ? true : never
const _exhaustiveCatalog: _CatalogMatchesPracticeExerciseType = true

const CATALOG_NUMBER_BY_TYPE: ReadonlyMap<PracticeExerciseType, number> = new Map(
  PRACTICE_EXERCISE_TYPES_CATALOG_ORDER.map((type, index) => [type, index + 1])
)

/** Номер типа по каталогу кода: 1 … 12 */
export function getPracticeExerciseTypeCatalogNumber(type: PracticeExerciseType): number {
  const n = CATALOG_NUMBER_BY_TYPE.get(type)
  if (n == null) {
    throw new Error(`Неизвестный тип практики: ${String(type)}`)
  }
  return n
}

export const PRACTICE_EXERCISE_TYPE_CATALOG_SIZE = PRACTICE_EXERCISE_TYPES_CATALOG_ORDER.length
