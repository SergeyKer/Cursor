import type { LessonIntro } from '@/types/lesson'

const MAX_QUICK_ITEMS = 3
const MAX_EXAMPLES = 3

function asStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
}

function normalizeTopic(topic: string): string {
  return topic.replace(/\s+/g, ' ').trim()
}

export function buildFallbackLessonIntro(topic: string): LessonIntro {
  const safeTopic = normalizeTopic(topic) || 'выбранная тема'
  return {
    topic: safeTopic,
    kind: 'concept',
    complexity: 'medium',
    quick: {
      why: [
        `${safeTopic} помогает точнее выразить мысль в английском.`,
        'Сначала важно понять смысл, а уже потом запоминать форму.',
        'В уроке мы сразу проверим правило на коротких фразах.',
      ],
      how: [
        'Смотри на ситуацию: что именно нужно сказать?',
        'Выбери рабочий шаблон и не добавляй лишнюю грамматику.',
        'Если сомневаешься, сравни пример с переводом.',
      ],
      examples: [
        {
          en: `This example is about ${safeTopic}.`,
          ru: 'Этот пример про выбранную тему.',
          note: 'видим тему в короткой фразе',
        },
        {
          en: `I can practice ${safeTopic}.`,
          ru: 'Я могу потренировать эту тему.',
          note: 'переходим от смысла к практике',
        },
      ],
      takeaway: `Думай так: сначала смысл ${safeTopic}, потом форма.`,
    },
    details: {
      points: [
        'Не пытайся выучить все случаи сразу: начни с главной ситуации.',
        'В хорошей практике правило видно в короткой фразе, а не в длинной таблице.',
        'Ошибки полезны: они показывают, где правило смешивается с похожей темой.',
      ],
      examples: [
        {
          en: 'I understand the pattern.',
          ru: 'Я понимаю шаблон.',
          note: 'сначала узнаем шаблон',
        },
      ],
    },
    deepDive: {
      commonMistakes: [
        'Запоминать форму без ситуации.',
        'Смешивать тему с похожим правилом.',
        'Пытаться строить длинные фразы до коротких примеров.',
      ],
      selfCheckRule: 'Если можешь объяснить, зачем нужна тема, можно начинать практику.',
    },
    learningPlan: {
      grammarFocus: [safeTopic],
      firstPracticeGoal: `Узнать ${safeTopic} в коротком контексте.`,
    },
  }
}

export function isValidLessonIntro(input: unknown): input is LessonIntro {
  if (!input || typeof input !== 'object') return false
  const row = input as Record<string, unknown>
  if (typeof row.topic !== 'string' || !row.topic.trim()) return false
  if (
    row.kind !== 'single_rule' &&
    row.kind !== 'contrast' &&
    row.kind !== 'concept' &&
    row.kind !== 'tense' &&
    row.kind !== 'structure'
  ) {
    return false
  }
  if (row.complexity !== 'simple' && row.complexity !== 'medium' && row.complexity !== 'advanced') return false
  if (!row.quick || typeof row.quick !== 'object') return false

  const quick = row.quick as Record<string, unknown>
  const why = asStringArray(quick.why, MAX_QUICK_ITEMS)
  const how = asStringArray(quick.how, MAX_QUICK_ITEMS)
  if (why.length === 0 || how.length === 0 || typeof quick.takeaway !== 'string' || !quick.takeaway.trim()) {
    return false
  }
  if (!Array.isArray(quick.examples) || quick.examples.length === 0 || quick.examples.length > MAX_EXAMPLES) return false
  return quick.examples.every((item) => {
    if (!item || typeof item !== 'object') return false
    const example = item as Record<string, unknown>
    return (
      typeof example.en === 'string' &&
      example.en.trim().length > 0 &&
      typeof example.ru === 'string' &&
      example.ru.trim().length > 0 &&
      typeof example.note === 'string' &&
      example.note.trim().length > 0
    )
  })
}
