import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'
import type { PracticeExerciseType } from '@/types/practice'

/**
 * Канонический порядок типов практики (1–12): совпадает с меню «Эталон» и маршрутом Challenge.
 * При добавлении нового типа — расширить union, CHALLENGE_STEP_SPECS и этот каталог.
 */
export const PRACTICE_EXERCISE_TYPES_CATALOG_ORDER: readonly PracticeExerciseType[] = CHALLENGE_STEP_SPECS.map(
  (spec) => spec.type
)

type CatalogMember = (typeof PRACTICE_EXERCISE_TYPES_CATALOG_ORDER)[number]
type _CatalogMatchesPracticeExerciseType = Exclude<PracticeExerciseType, CatalogMember> extends never ? true : never
const _exhaustiveCatalog: _CatalogMatchesPracticeExerciseType = true

const CATALOG_NUMBER_BY_TYPE: ReadonlyMap<PracticeExerciseType, number> = new Map(
  PRACTICE_EXERCISE_TYPES_CATALOG_ORDER.map((type, index) => [type, index + 1])
)

/** Номер типа по каталогу: 1 … 12 (как #N в меню эталона). */
export function getPracticeExerciseTypeCatalogNumber(type: PracticeExerciseType): number {
  const n = CATALOG_NUMBER_BY_TYPE.get(type)
  if (n == null) {
    throw new Error(`Неизвестный тип практики: ${String(type)}`)
  }
  return n
}

export const PRACTICE_EXERCISE_TYPE_CATALOG_SIZE = PRACTICE_EXERCISE_TYPES_CATALOG_ORDER.length
