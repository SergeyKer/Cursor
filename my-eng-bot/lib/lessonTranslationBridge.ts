import {
  catalogLevelToLevelId,
  getLessonTopicById,
  getPracticeLessonTopics,
  type LessonCatalogLevel,
} from '@/lib/lessonCatalog'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { LevelId, Settings, TenseId, TranslationDrillKind } from '@/lib/types'

type TranslationLevelLockSlice = Pick<
  Settings,
  'mode' | 'translationDrillKind' | 'translationLessonId'
>

/** Уровни меню, допустимые на оси «Урок» в Переводе (без starter/C1/C2). */
export const LESSON_AXIS_MENU_LEVEL_IDS: readonly LevelId[] = ['all', 'a1', 'a2', 'b1', 'b2']

const LESSON_AXIS_CATALOG_LEVELS: readonly LessonCatalogLevel[] = ['A1', 'A2', 'B1', 'B2']

function stableHash32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Жёсткие RU-seed’ы для fallback (не life-topic pool). */
const LESSON_RU_SEEDS: Record<string, string[]> = {
  '4': [
    'Я Анна.',
    'Я из России.',
    'Я учитель.',
    'Я студент.',
    'Я из Мадрида.',
    'Я устал.',
    'Я счастлив.',
    'Я из Испании.',
  ],
  '1': [
    'Сейчас холодно.',
    'Пора идти домой.',
    'Пора спать.',
    'Время для обеда.',
    'Сейчас жарко.',
    'Пора начинать.',
  ],
  '2': [
    'Кто это?',
    'Кто любит чай?',
    'Кто живёт здесь?',
    'Кто играет в футбол?',
    'Кто это человек?',
  ],
  '3': [
    'Я знаю, что она любит.',
    'Я знаю, где он живёт.',
    'Я не знаю, кто он.',
    'Скажи мне, что ты хочешь.',
    'Я знаю, когда начинается урок.',
  ],
}

const LESSON_INFER_TENSE: Record<string, TenseId> = {
  '4': 'present_simple',
  '1': 'present_simple',
  '2': 'present_simple',
  '3': 'present_simple',
}

export function isTranslationLessonTopicKind(
  kind: TranslationDrillKind | string | null | undefined
): boolean {
  return kind === 'lesson_topic'
}

export function normalizeTranslationDrillKind(
  value: unknown
): TranslationDrillKind {
  return value === 'lesson_topic' ? 'lesson_topic' : 'tense_drill'
}

/** Menu LevelId → каталожные CEFR для пула уроков (exact match; all → A1–B2). */
export function menuLevelToCatalogLevels(level: LevelId): LessonCatalogLevel[] {
  if (level === 'all') return [...LESSON_AXIS_CATALOG_LEVELS]
  if (level === 'starter') return ['A1']
  const upper = level.toUpperCase() as LessonCatalogLevel
  if ((LESSON_AXIS_CATALOG_LEVELS as readonly string[]).includes(upper)) {
    return [upper]
  }
  // c1/c2 вне оси — пустой пул (вызывающий код должен clamp’нуть меню)
  return []
}

export function listEnabledTranslationLessonsForLevel(level: LevelId) {
  const catalogs = menuLevelToCatalogLevels(level)
  if (catalogs.length === 0) return []
  return getPracticeLessonTopics()
    .filter((topic) => topic.enabled && catalogs.includes(topic.level))
    .sort((a, b) => a.order - b.order)
}

export function lessonExistsAndEnabled(lessonId: string): boolean {
  const topic = getLessonTopicById(lessonId)
  return Boolean(topic?.enabled && topic.hasPractice)
}

/**
 * Сброс/clamp урока под меню-уровень (зеркало normalizeSingleTenseSelection).
 * `'all'` остаётся, если пул не пуст; иначе first enabled; иначе null.
 */
export function normalizeLessonForLevel(
  lessonId: string | null | undefined,
  level: LevelId
): string | null {
  const pool = listEnabledTranslationLessonsForLevel(level)
  if (lessonId === 'all') {
    return pool.length > 0 ? 'all' : null
  }
  if (lessonId && pool.some((t) => t.id === lessonId)) {
    return lessonId
  }
  return pool[0]?.id ?? null
}

/** Clamp menu level при входе на ось Урок (C1/C2 → a2). */
export function clampLevelForLessonAxis(level: LevelId): LevelId {
  if ((LESSON_AXIS_MENU_LEVEL_IDS as readonly string[]).includes(level)) {
    return level
  }
  if (level === 'starter') return 'a1'
  return 'a2'
}

/**
 * CEFR меню из каталога для конкретного урока перевода.
 * `null` для пустого / `'all'` / неизвестного id.
 */
export function menuLevelIdForConcreteTranslationLesson(
  lessonId: string | null | undefined
): LevelId | null {
  if (lessonId == null || lessonId === '' || lessonId === 'all') return null
  const topic = getLessonTopicById(lessonId)
  return topic ? catalogLevelToLevelId(topic.level) : null
}

/** Конкретный урок на оси «Урок» в Переводе — уровень UI скрыт / lock. */
export function isTranslationLevelLocked(settings: TranslationLevelLockSlice): boolean {
  if (settings.mode !== 'translation') return false
  if ((settings.translationDrillKind ?? 'tense_drill') !== 'lesson_topic') return false
  const id = settings.translationLessonId
  return typeof id === 'string' && id !== '' && id !== 'all'
}

/**
 * Если locked на конкретном уроке — `{ level }` из каталога; иначе `null` (не трогать settings).
 */
export function syncTranslationLevelFromConcreteLesson(
  settings: TranslationLevelLockSlice
): { level: LevelId } | null {
  if (!isTranslationLevelLocked(settings)) return null
  const level = menuLevelIdForConcreteTranslationLesson(settings.translationLessonId)
  return level ? { level } : null
}

export function pickTranslationLessonId(params: {
  level: LevelId
  dialogSeed: string
  drillIndex: number
  excludeId?: string | null
}): string | null {
  const pool = listEnabledTranslationLessonsForLevel(params.level)
  if (pool.length === 0) return null
  let candidates = pool
  if (params.excludeId && pool.length > 1) {
    const filtered = pool.filter((t) => t.id !== params.excludeId)
    if (filtered.length > 0) candidates = filtered
  }
  const seed = stableHash32(
    `${params.dialogSeed}|trl|${params.drillIndex}|${params.level}|${candidates.map((c) => c.id).join(',')}`
  )
  return candidates[seed % candidates.length]?.id ?? candidates[0]?.id ?? null
}

export function resolveEffectiveTranslationLessonId(params: {
  translationLessonId: string | null | undefined
  level: LevelId
  dialogSeed: string
  drillIndex: number
  /** Pin на ERROR-цепочке при `all`. */
  pinnedLessonId?: string | null
  excludeId?: string | null
}): string | null {
  const raw = params.translationLessonId
  if (raw == null || raw === '') return null
  // Конкретный id: не зависит от пула меню-уровня (CEFR дрилла — из meta на route).
  if (raw !== 'all') {
    return lessonExistsAndEnabled(raw) ? raw : null
  }
  const pool = listEnabledTranslationLessonsForLevel(params.level)
  if (pool.length === 0) return null
  if (params.pinnedLessonId && pool.some((t) => t.id === params.pinnedLessonId)) {
    return params.pinnedLessonId
  }
  return pickTranslationLessonId({
    level: params.level,
    dialogSeed: params.dialogSeed,
    drillIndex: params.drillIndex,
    excludeId: params.excludeId,
  })
}

export function getLessonGrammarFocusLines(lessonId: string): string[] {
  const structured = getStructuredLessonById(lessonId)
  const fromPlan = structured?.intro?.learningPlan?.grammarFocus
  if (Array.isArray(fromPlan) && fromPlan.length > 0) {
    return fromPlan.map((s) => String(s).trim()).filter(Boolean)
  }
  const fromRepeat = structured?.repeatConfig?.grammarFocus
  if (Array.isArray(fromRepeat) && fromRepeat.length > 0) {
    return fromRepeat.map((s) => String(s).trim()).filter(Boolean)
  }
  const topic = getLessonTopicById(lessonId)
  return topic ? [topic.title] : []
}

export function getLessonRuSeeds(lessonId: string): string[] {
  const hardcoded = LESSON_RU_SEEDS[lessonId]
  if (hardcoded?.length) return [...hardcoded]
  const structured = getStructuredLessonById(lessonId)
  const fromQuick = structured?.intro?.quick?.examples?.map((e) => e.ru?.trim()).filter(Boolean) as
    | string[]
    | undefined
  if (fromQuick?.length) return fromQuick
  return ['Я учу английский.']
}

export function inferTenseFromLesson(lessonId: string): TenseId {
  return LESSON_INFER_TENSE[lessonId] ?? 'present_simple'
}

export function resolveLessonTranslationMeta(lessonId: string): {
  title: string
  grammarFocusLines: string[]
  gradingTense: TenseId
  catalogLevel: LessonCatalogLevel | null
  menuLevelHint: LevelId | null
} {
  const topic = getLessonTopicById(lessonId)
  return {
    title: topic?.title ?? lessonId,
    grammarFocusLines: getLessonGrammarFocusLines(lessonId),
    gradingTense: inferTenseFromLesson(lessonId),
    catalogLevel: topic?.level ?? null,
    menuLevelHint: topic ? catalogLevelToLevelId(topic.level) : null,
  }
}

export function pickLessonRuSeed(params: {
  lessonId: string
  seedText?: string | null
  excludeRu?: string | null
}): string {
  const seeds = getLessonRuSeeds(params.lessonId)
  if (seeds.length === 0) return 'Я учу английский.'
  let pool = seeds
  if (params.excludeRu && seeds.length > 1) {
    const filtered = seeds.filter((s) => s !== params.excludeRu)
    if (filtered.length > 0) pool = filtered
  }
  const seed = stableHash32(`lesson_ru|${params.lessonId}|${params.seedText ?? ''}`)
  return pool[seed % pool.length] ?? pool[0] ?? 'Я учу английский.'
}
