import { getGrammarCategoryCatalog, type GrammarCategory } from '@/lib/grammarTaxonomy'
import { getLessonTopicCatalog, getTheoryLessonTopics, type LessonCatalogLevel, type LessonTopicCatalogItem } from '@/lib/lessonCatalog'

export type TheoryTag = {
  id: string
  categoryId: string
  order: number
  /** Подпись в меню (основная строка, RU). */
  menuLabelRu: string
  /** Канонический термин в меню и поиске (EN). */
  menuLabelEn: string
  /** Короткий заголовок для обратной совместимости / чипов. */
  title: string
  focusLine: string
  titleRu?: string
}

const THEORY_TAGS: TheoryTag[] = [
  {
    id: 'present-simple',
    categoryId: 'verbs_and_tenses',
    order: 10,
    menuLabelRu: 'Настоящее простое время',
    menuLabelEn: 'Present Simple',
    title: 'Present Simple',
    focusLine: 'I am / I am from · знакомство',
  },
  {
    id: 'formal-it',
    categoryId: 'sentence_structure',
    order: 10,
    menuLabelRu: 'Формальное подлежащее it',
    menuLabelEn: 'Formal subject',
    title: "It's time to",
    focusLine: 'It’s / It’s time to · состояние и действие',
  },
  {
    id: 'special-questions',
    categoryId: 'questions',
    order: 10,
    menuLabelRu: 'Специальные вопросы с who',
    menuLabelEn: 'Special questions',
    title: 'Who — special',
    focusLine: 'Who …? · вопросы с Wh-',
  },
  {
    id: 'subject-questions',
    categoryId: 'questions',
    order: 20,
    menuLabelRu: 'Вопрос к подлежащему',
    menuLabelEn: 'Subject questions',
    title: 'Who — subject',
    focusLine: 'Who likes …? · подлежащее в вопросе',
  },
  {
    id: 'reported-speech',
    categoryId: 'voice_and_clauses',
    order: 10,
    menuLabelRu: 'Косвенная речь',
    menuLabelEn: 'Reported Speech',
    title: 'Reported speech',
    focusLine: 'I know what … · встроенный вопрос',
  },
  {
    id: 'word-order',
    categoryId: 'sentence_structure',
    order: 20,
    menuLabelRu: 'Порядок слов',
    menuLabelEn: 'Word order',
    title: 'Word order',
    focusLine: 'I know what … · порядок слов во встроенном вопросе',
  },
]

export function getTheoryTagById(id: string): TheoryTag | null {
  return THEORY_TAGS.find((t) => t.id === id) ?? null
}

/** Категории, в которых есть хотя бы один тег, присутствующий на уроке с теорией. */
export function getGrammarCategoriesForMenu(): GrammarCategory[] {
  const theoryTopics = getTheoryLessonTopics()
  const usedCategoryIds = new Set<string>()
  for (const topic of theoryTopics) {
    if (!topic.enabled || !topic.hasTheory) continue
    for (const tagId of topic.tagIds ?? []) {
      const tag = getTheoryTagById(tagId)
      if (tag) usedCategoryIds.add(tag.categoryId)
    }
  }
  return getGrammarCategoryCatalog().filter((c) => usedCategoryIds.has(c.id))
}

/** Все теги из раздела «Теория · по теме» (по всем категориям), без дубликатов. */
export function getAllTheoryTagsForMenu(): TheoryTag[] {
  const out: TheoryTag[] = []
  const seen = new Set<string>()
  for (const cat of getGrammarCategoriesForMenu()) {
    for (const t of getTheoryTagsForCategory(cat.id)) {
      if (seen.has(t.id)) continue
      seen.add(t.id)
      out.push(t)
    }
  }
  return out.sort((a, b) => {
    const byCat = a.categoryId.localeCompare(b.categoryId)
    if (byCat !== 0) return byCat
    return a.order - b.order
  })
}

/** Теги категории, которые реально встречаются на уроках с теорией. */
export function getTheoryTagsForCategory(categoryId: string): TheoryTag[] {
  const theoryTopics = getTheoryLessonTopics()
  const tagIdsWithContent = new Set<string>()
  for (const topic of theoryTopics) {
    if (!topic.enabled || !topic.hasTheory) continue
    for (const tagId of topic.tagIds ?? []) {
      const tag = getTheoryTagById(tagId)
      if (tag?.categoryId === categoryId) tagIdsWithContent.add(tagId)
    }
  }
  return THEORY_TAGS.filter((t) => t.categoryId === categoryId && tagIdsWithContent.has(t.id)).sort((a, b) => a.order - b.order)
}

export type TheoryLessonsByLevel = Partial<Record<LessonCatalogLevel, LessonTopicCatalogItem[]>>

/** Уроки с теорией, у которых есть тег, сгруппированные по CEFR. */
export function getTheoryLessonsByTagGroupedByLevel(tagId: string): TheoryLessonsByLevel {
  const out: TheoryLessonsByLevel = {}
  for (const topic of getTheoryLessonTopics()) {
    if (!topic.enabled || !topic.hasTheory) continue
    if (!(topic.tagIds ?? []).includes(tagId)) continue
    const level = topic.level
    if (!out[level]) out[level] = []
    out[level]!.push(topic)
  }
  for (const k of Object.keys(out) as LessonCatalogLevel[]) {
    out[k]!.sort((a, b) => a.order - b.order)
  }
  return out
}

/** Все теги, встречающиеся на каталожных уроках (для чипов). */
export function getAllTagIdsOnLesson(lessonId: string): string[] {
  const topic = getLessonTopicCatalog().find((t) => t.id === lessonId)
  return topic?.tagIds ? [...topic.tagIds] : []
}
