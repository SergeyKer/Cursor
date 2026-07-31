import type { LevelId } from '@/lib/types'

export type SupportedCefrLevel = Exclude<LevelId, 'all'>

export interface CefrLevelConfig {
  level: SupportedCefrLevel
  displayName: string
  listening: string
  reading: string
  dialogue: string
  monologue: string
  writing: string
  grammarKey: string
  allowedVocabulary: string
  avoidVocabulary: string
  forbiddenOrStrictlyLimited: string
  sentenceLengthGuideline: string
  questionStyle: string
  correctionPriority: string
}

export const DEFAULT_CONFIGS: Record<SupportedCefrLevel, CefrLevelConfig> = {
  starter: {
    level: 'starter',
    displayName: 'Pre-A1',
    listening: '',
    reading: '',
    dialogue: '',
    monologue: '',
    writing: '',
    grammarKey: 'Basic sentence forms and very short clauses.',
    allowedVocabulary: 'Very basic daily words, concrete nouns, frequent verbs.',
    avoidVocabulary: 'Abstract and formal phrasing.',
    forbiddenOrStrictlyLimited: 'Rare advanced academic/business words.',
    sentenceLengthGuideline: 'Short phrases, one idea per sentence.',
    questionStyle: 'Very short direct personal questions.',
    correctionPriority: 'Word order and core verb forms first, vocabulary second.',
  },
  a1: {
    level: 'a1',
    displayName: 'A1',
    listening: 'Понимает знакомые слова и базовые фразы при медленной четкой речи',
    reading: 'Узнает знакомые имена/слова и простые предложения',
    dialogue: 'Поддерживает очень простой разговор при помощи собеседника',
    monologue: 'Описывает себя, место жительства, близкое окружение простыми фразами',
    writing: 'Подписывает открытку, заполняет базовые анкеты',
    grammarKey: 'Present Simple basics, short clauses. Present/Past/Future Simple (acquaintance).',
    allowedVocabulary: 'Common everyday words for family, home, food, routine.',
    avoidVocabulary: 'Abstract terms, rare synonyms, idioms.',
    forbiddenOrStrictlyLimited: 'C1/C2 vocabulary and heavy academic words.',
    sentenceLengthGuideline: 'Short phrases, one idea per sentence.',
    questionStyle: 'Short direct questions about personal life and routine.',
    correctionPriority: 'Core grammar first, then vocabulary.',
  },
  a2: {
    level: 'a2',
    displayName: 'A2',
    listening: 'Понимает часто употребимые слова и короткие простые высказывания',
    reading: 'Читает короткие бытовые тексты (меню, расписания, объявления), простые письма',
    dialogue: 'Ведет короткие диалоги в типичных жизненных ситуациях',
    monologue: 'Кратко рассказывает о себе, семье, жилье, учебе, работе',
    writing: 'Пишет короткие записки/сообщения и простые личные письма',
    grammarKey: 'Simple/Continuous basics and basic modal forms.',
    allowedVocabulary: 'Everyday words plus simple descriptive vocabulary.',
    avoidVocabulary: 'Overly technical jargon and overloaded phrasing.',
    forbiddenOrStrictlyLimited: 'High abstraction and rare idioms.',
    sentenceLengthGuideline: 'Short-to-medium phrases with simple connectors.',
    questionStyle: 'Questions about plans, recent events, preferences.',
    correctionPriority: 'Simple/Continuous usage first, wording precision second.',
  },
  b1: {
    level: 'b1',
    displayName: 'B1',
    listening: 'Понимает общий смысл рассказов на знакомые темы, большинство программ о текущих событиях',
    reading: 'Понимает повседневные тексты и письма с описанием событий/чувств',
    dialogue: 'Общается в большинстве ситуаций в поездке без подготовки',
    monologue: 'Рассказывает о событиях, планах, обосновывает мнение',
    writing: 'Пишет простой связный текст и личные письма о событиях',
    grammarKey: 'Common tenses and practical conditional patterns.',
    allowedVocabulary: 'Broader everyday words for opinions, reasons, experiences.',
    avoidVocabulary: 'Overly formal academic style.',
    forbiddenOrStrictlyLimited: 'Rare C2 idioms without need.',
    sentenceLengthGuideline: 'Medium length with clear structure.',
    questionStyle: 'Why/How questions with short explanation prompts.',
    correctionPriority: 'Meaning and tense correctness first, style second.',
  },
  b2: {
    level: 'b2',
    displayName: 'B2',
    listening: 'Понимает длинные речи/дискуссии и большинство новостных программ',
    reading: 'Читает публицистику и неадаптированную прозу',
    dialogue: 'Уверенно общается с носителями, активно участвует в дискуссии',
    monologue: 'Дает подробные описания, аргументирует плюсы/минусы',
    writing: 'Пишет подробные тексты, эссе/отчеты, личные и несложные официальные письма',
    grammarKey: 'Flexible natural structures with style control.',
    allowedVocabulary: 'More precise topic vocabulary with natural collocations.',
    avoidVocabulary: 'Template and robotic phrasing.',
    forbiddenOrStrictlyLimited: 'Overly heavy C2 archaic wording.',
    sentenceLengthGuideline: 'Medium-to-long but not overloaded.',
    questionStyle: 'Nuanced open questions and argument comparison.',
    correctionPriority: 'Precision first, register second.',
  },
  c1: {
    level: 'c1',
    displayName: 'C1',
    listening: 'Понимает развернутую речь даже при неявной структуре',
    reading: 'Понимает длинные сложные и специализированные тексты',
    dialogue: 'Говорит свободно, точно и эффективно в быту и профессии',
    monologue: 'Дает ясные подробные описания сложных понятий, формулирует выводы',
    writing: 'Пишет структурированные письма/эссе/доклады под целевую аудиторию',
    grammarKey: 'Advanced grammar with nuanced register control.',
    allowedVocabulary: 'Advanced precise vocabulary and discourse markers.',
    avoidVocabulary: 'Excessive simplification.',
    forbiddenOrStrictlyLimited: 'Unnecessary complexity for complexity sake.',
    sentenceLengthGuideline: 'Flexible length by task.',
    questionStyle: 'Precise analytical and reflective questions.',
    correctionPriority: 'Precision of meaning and register.',
  },
  c2: {
    level: 'c2',
    displayName: 'C2',
    listening: 'Понимает практически любую устную речь, включая быструю',
    reading: 'Читает практически любые тексты, включая сложные абстрактные',
    dialogue: 'Участвует в любой беседе/дискуссии без трудностей, использует идиомы',
    monologue: 'Строит ясный связный аргументированный монолог с четкой логикой',
    writing: 'Пишет сложные логично структурированные письма/доклады/статьи, обзоры/резюме',
    grammarKey: 'Full grammar range with natural fluency.',
    allowedVocabulary: 'Near-full range with idiomatic nuance.',
    avoidVocabulary: 'Heavy verbosity without value.',
    forbiddenOrStrictlyLimited: 'No formal bans, only relevance constraints.',
    sentenceLengthGuideline: 'Flexible by rhetorical goal.',
    questionStyle: 'Context-tuned, refined natural questioning.',
    correctionPriority: 'Pragmatics, style, naturalness.',
  },
}

export function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]/gi, '')
}

export function mapLevel(raw: unknown): SupportedCefrLevel | null {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (!value) return null
  const normalized = value.replace(/[^a-z0-9]/g, '')
  if (normalized === 'starter' || normalized === 'prea1' || normalized === 'pre-a1') return 'starter'
  if (normalized === 'a1') return 'a1'
  if (normalized === 'a2') return 'a2'
  if (normalized === 'b1') return 'b1'
  if (normalized === 'b2') return 'b2'
  if (normalized === 'c1') return 'c1'
  if (normalized === 'c2') return 'c2'
  return null
}

export function pick(row: Record<string, unknown>, keys: string[]): string {
  const keyMap = new Map<string, unknown>()
  for (const [k, v] of Object.entries(row)) keyMap.set(normalizeKey(k), v)
  for (const key of keys) {
    const value = keyMap.get(normalizeKey(key))
    if (value == null) continue
    const text = String(value).trim()
    if (text) return text
  }
  return ''
}

export function mergeConfig(
  base: CefrLevelConfig,
  summaryRow?: Record<string, unknown>,
  rulesRow?: Record<string, unknown>
): CefrLevelConfig {
  const row = { ...(summaryRow ?? {}), ...(rulesRow ?? {}) }
  return {
    ...base,
    displayName:
      pick(row, ['Название', 'Name', 'displayName']) ||
      base.displayName,
    listening: pick(row, ['Аудирование', 'Listening']) || base.listening,
    reading: pick(row, ['Чтение', 'Reading']) || base.reading,
    dialogue: pick(row, ['Диалог', 'Dialogue']) || base.dialogue,
    monologue: pick(row, ['Монолог', 'Monologue']) || base.monologue,
    writing: pick(row, ['Письмо', 'Writing']) || base.writing,
    grammarKey:
      pick(row, ['Грамматика (ключевое)', 'Грамматика_ключевое', 'Grammar', 'GrammarKey']) ||
      base.grammarKey,
    allowedVocabulary:
      pick(row, ['AllowedVocabulary']) || base.allowedVocabulary,
    avoidVocabulary:
      pick(row, ['AvoidVocabulary']) || base.avoidVocabulary,
    forbiddenOrStrictlyLimited:
      pick(row, ['ForbiddenOrStrictlyLimited']) || base.forbiddenOrStrictlyLimited,
    sentenceLengthGuideline:
      pick(row, ['SentenceLengthGuideline']) || base.sentenceLengthGuideline,
    questionStyle:
      pick(row, ['QuestionStyle']) || base.questionStyle,
    correctionPriority:
      pick(row, ['CorrectionPriority']) || base.correctionPriority,
  }
}
