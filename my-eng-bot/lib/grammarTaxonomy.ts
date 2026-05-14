/** Стабильные категории грамматики (EN id) для меню «Темы». */
export type GrammarCategory = {
  id: string
  parentCategoryId?: string | null
  order: number
  menuTitle: string
  menuTitleRu?: string
  hint?: string
}

const GRAMMAR_CATEGORIES: GrammarCategory[] = [
  {
    id: 'verbs_and_tenses',
    order: 10,
    menuTitle: 'Verbs & tenses',
    menuTitleRu: 'Глагол и время',
    hint: 'Present, past, aspects, modals',
  },
  {
    id: 'sentence_structure',
    order: 20,
    menuTitle: 'Sentence structure',
    menuTitleRu: 'Структура предложения',
    hint: 'Word order, negation',
  },
  {
    id: 'questions',
    order: 30,
    menuTitle: 'Questions',
    menuTitleRu: 'Вопросы',
    hint: 'Wh-, yes/no, embedded',
  },
  {
    id: 'nouns_and_pronouns',
    order: 40,
    menuTitle: 'Nouns & pronouns',
    menuTitleRu: 'Существительные и местоимения',
  },
  {
    id: 'determiners_and_quantifiers',
    order: 50,
    menuTitle: 'Determiners & quantifiers',
    menuTitleRu: 'Артикли и количество',
  },
  {
    id: 'prepositions_and_particles',
    order: 60,
    menuTitle: 'Prepositions & particles',
    menuTitleRu: 'Предлоги и частицы',
  },
  {
    id: 'adjectives_and_adverbs',
    order: 70,
    menuTitle: 'Adjectives & adverbs',
    menuTitleRu: 'Прилагательные и наречия',
  },
  {
    id: 'voice_and_clauses',
    order: 80,
    menuTitle: 'Voice & clauses',
    menuTitleRu: 'Залог и придаточные',
    hint: 'Passive, reported speech, relative clauses',
  },
]

export function getGrammarCategoryCatalog(): GrammarCategory[] {
  return [...GRAMMAR_CATEGORIES].sort((a, b) => a.order - b.order)
}

export function getGrammarCategoryById(id: string): GrammarCategory | null {
  return GRAMMAR_CATEGORIES.find((c) => c.id === id) ?? null
}
