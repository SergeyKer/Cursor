import type { ParsedNecessaryWord, VocabularyLevelId, VocabularyWorldId } from '@/types/vocabulary'

export const VOCABULARY_LEVELS: Array<{
  id: VocabularyLevelId
  title: string
  prefixLabel: string
  hint?: string
}> = [
  { id: 'a1', title: 'A1', prefixLabel: 'A1 - начальный', hint: 'Базовые слова и короткие фразы.' },
  { id: 'a2', title: 'A2', prefixLabel: 'A2 - элементарный', hint: 'Бытовые темы и простые связки.' },
  { id: 'b1', title: 'B1', prefixLabel: 'B1 - средний', hint: 'Шире лексика и увереннее в типичных ситуациях.' },
  { id: 'b2', title: 'B2', prefixLabel: 'B2 - выше среднего', hint: 'Абстрактнее темы и более точные слова.' },
  { id: 'c1', title: 'C1', prefixLabel: 'C1 - продвинутый', hint: 'Тонкости значения и формальный стиль.' },
  { id: 'c2', title: 'C2', prefixLabel: 'C2 - в совершенстве', hint: 'Редкая лексика и идиомы уверенного пользователя.' },
]

const LEVEL_ORDER: VocabularyLevelId[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']

const WORLD_BASE_LEVEL: Record<VocabularyWorldId, VocabularyLevelId> = {
  core: 'a1',
  home: 'a2',
  school: 'a2',
  travel: 'b1',
  digital: 'b2',
}

function firstEnglishToken(en: string): string {
  const cleaned = en.replace(/^to\s+/i, '').trim()
  return cleaned.split(/\s+/)[0]?.replace(/[^a-z]/gi, '').toLowerCase() ?? ''
}

function bumpLevel(base: VocabularyLevelId, delta: number): VocabularyLevelId {
  const index = LEVEL_ORDER.indexOf(base)
  const next = Math.min(LEVEL_ORDER.length - 1, Math.max(0, index + delta))
  return LEVEL_ORDER[next]!
}

/**
 * Грубая оценка уровня по «миру» из текущего пайплайна и свойствам строки словаря.
 * Слова с id > 1000 считаются расширенным продвинутым слоем (см. english_words_advanced.txt).
 */
export function inferLevel(word: ParsedNecessaryWord, primaryWorld: VocabularyWorldId): VocabularyLevelId {
  let level = WORLD_BASE_LEVEL[primaryWorld] ?? 'a2'

  const token = firstEnglishToken(word.en)
  const tokenLen = token.length
  let bump = 0
  if (tokenLen >= 9) bump += 1
  if (tokenLen >= 12) bump += 1
  if (word.en.trim().split(/\s+/).filter(Boolean).length >= 3) bump += 1

  level = bumpLevel(level, bump)

  if (word.id > 1000) {
    level = bumpLevel(level, 2)
    level = bumpLevel(level, Math.min(2, Math.floor((word.id - 1000) / 80)))
  }

  if (word.id <= 220 && primaryWorld === 'core') {
    level = bumpLevel('a1', Math.min(1, bump))
  }

  return level
}

export function countActiveWordsByLevel(
  words: Array<{ status: string; primaryLevel: VocabularyLevelId }>
): Record<VocabularyLevelId, number> {
  const empty: Record<VocabularyLevelId, number> = {
    a1: 0,
    a2: 0,
    b1: 0,
    b2: 0,
    c1: 0,
    c2: 0,
  }
  return words.reduce((acc, word) => {
    if (word.status !== 'active') return acc
    acc[word.primaryLevel] += 1
    return acc
  }, empty)
}
