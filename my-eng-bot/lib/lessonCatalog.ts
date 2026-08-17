import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { Audience, LevelId } from '@/lib/types'
import type { LessonData } from '@/types/lesson'

export type LessonCatalogLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export interface LessonTopicCatalogItem {
  id: string
  slug: string
  title: string
  level: LessonCatalogLevel
  order: number
  enabled: boolean
  hasTheory: boolean
  hasPractice: boolean
  /** Теги таксономии теории (см. `lib/lessonTheoryTags.ts`). */
  tagIds?: string[]
}

const LESSON_TOPIC_CATALOG: LessonTopicCatalogItem[] = [
  {
    id: '4',
    slug: 'introducing-yourself',
    title: 'I am / I am from',
    level: 'A1',
    order: 5,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '5',
    slug: 'you-are',
    title: 'You are / You’re …',
    level: 'A1',
    order: 6,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '6',
    slug: 'she-is-a-this-is',
    title: 'She is a … / This is …',
    level: 'A1',
    order: 7,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '7',
    slug: 'your-our',
    title: 'Your / Our',
    level: 'A1',
    order: 8,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '8',
    slug: 'are-you',
    title: 'Are you …?',
    level: 'A1',
    order: 9,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '9',
    slug: 'i-am-not',
    title: 'I am not / I’m not',
    level: 'A1',
    order: 10,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '10',
    slug: 'i-can',
    title: 'I can …',
    level: 'A1',
    order: 11,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '11',
    slug: 'i-want-to',
    title: 'I want to',
    level: 'A1',
    order: 12,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '12',
    slug: 'every-day',
    title: 'every day',
    level: 'A1',
    order: 13,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '13',
    slug: 'often',
    title: 'often',
    level: 'A1',
    order: 14,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '1',
    slug: 'its-time-to',
    title: 'It’s / It’s time to',
    level: 'A2',
    order: 20,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['formal-it'],
  },
  {
    id: '2',
    slug: 'who-likes',
    title: 'Who ...?',
    level: 'A2',
    order: 30,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['special-questions', 'subject-questions'],
  },
  {
    id: '14',
    slug: 'i-dont-know-where',
    title: 'I don’t know where …',
    level: 'A2',
    order: 35,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['reported-speech', 'word-order'],
  },
  {
    id: '3',
    slug: 'embedded-questions',
    title: 'I know what she likes',
    level: 'A2',
    order: 40,
    enabled: true,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['reported-speech', 'word-order'],
  },
  {
    id: '15',
    slug: 'whose',
    title: 'Whose …?',
    level: 'A2',
    order: 50,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['special-questions'],
  },
  {
    id: '16',
    slug: 'its-hard-when',
    title: 'It’s hard … / when …',
    level: 'A2',
    order: 60,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['formal-it'],
  },
  {
    id: '17',
    slug: 'never',
    title: 'never',
    level: 'A2',
    order: 70,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '18',
    slug: 'anyone-no-one',
    title: 'anyone / no one',
    level: 'A2',
    order: 80,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '19',
    slug: 'dont-you',
    title: 'Don’t you …?',
    level: 'A2',
    order: 90,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['special-questions'],
  },
  {
    id: '20',
    slug: 'have-time-to',
    title: 'have time to',
    level: 'A2',
    order: 100,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['formal-it'],
  },
  {
    id: '21',
    slug: 'a-bit-of',
    title: 'a bit of / a drop of',
    level: 'B1',
    order: 110,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '22',
    slug: 'less-fewer',
    title: 'less / fewer',
    level: 'B1',
    order: 120,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '23',
    slug: 'what-a',
    title: 'What a …!',
    level: 'B1',
    order: 130,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['word-order'],
  },
  {
    id: '24',
    slug: 'i-think-thinking-about',
    title: 'I think … / thinking about',
    level: 'B1',
    order: 140,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '25',
    slug: 'have-been-for',
    title: 'have been … / for',
    level: 'B1',
    order: 150,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '26',
    slug: 'have-known-since',
    title: 'have known / since',
    level: 'B1',
    order: 160,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '27',
    slug: 'were-doing',
    title: 'were doing / from … to …',
    level: 'B1',
    order: 170,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '28',
    slug: 'one-ones',
    title: 'a … one / ones',
    level: 'B1',
    order: 180,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['word-order'],
  },
  {
    id: '29',
    slug: 'what-for',
    title: 'what … for',
    level: 'B1',
    order: 190,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['special-questions', 'word-order'],
  },
  {
    id: '30',
    slug: 'be-invited',
    title: 'be invited',
    level: 'B1',
    order: 200,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '31',
    slug: 'ive-been-thats-why',
    title: 'I’ve been … / that’s why',
    level: 'B2',
    order: 210,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '32',
    slug: 'smiling',
    title: '…, smiling',
    level: 'B2',
    order: 220,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['word-order'],
  },
  {
    id: '33',
    slug: 'having-i',
    title: 'Having …, I …',
    level: 'B2',
    order: 230,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['word-order'],
  },
  {
    id: '34',
    slug: 'having-grown-up',
    title: 'Having grown up … / stand up for',
    level: 'B2',
    order: 240,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['word-order'],
  },
  {
    id: '35',
    slug: 'because-of-find-it-hard',
    title: 'because of / find it hard to',
    level: 'B2',
    order: 250,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['formal-it'],
  },
  {
    id: '36',
    slug: 'could-you-tell-me',
    title: 'Could you tell me …?',
    level: 'B2',
    order: 260,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['special-questions', 'word-order'],
  },
  {
    id: '37',
    slug: 'if-he-knew-would-have',
    title: 'If he knew … / would have',
    level: 'B2',
    order: 270,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['word-order'],
  },
  {
    id: '38',
    slug: 'i-expected-him-to',
    title: 'I expected him to …',
    level: 'B2',
    order: 280,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['word-order'],
  },
  {
    id: '39',
    slug: 'had-been-waiting-before',
    title: 'had been waiting / before',
    level: 'B2',
    order: 290,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
  {
    id: '40',
    slug: 'be-about-to',
    title: 'be about to',
    level: 'B2',
    order: 300,
    enabled: false,
    hasTheory: true,
    hasPractice: true,
    tagIds: ['present-simple'],
  },
]

export const PRACTICE_TOPICS_BY_AUDIENCE: Record<Audience, Record<string, { short: string; long: string }>> = {
  child: {
    '4': {
      short: 'Знакомство',
      long: 'Кто я, откуда я и какой я — через I am.',
    },
    '5': {
      short: 'Ты какой',
      long: 'Как сказать про тебя: You are / You’re + качество.',
    },
    '6': {
      short: 'Кто она / это',
      long: 'Профессия и «это»: She is a … / This is …',
    },
    '7': {
      short: 'Твой / наш',
      long: 'Чьё это: Your и Our.',
    },
    '8': {
      short: 'Ты …?',
      long: 'Короткий вопрос с to be: Are you …?',
    },
    '9': {
      short: 'Я не …',
      long: 'Отрицание: I am not / I’m not.',
    },
    '10': {
      short: 'Умею',
      long: 'Что умею делать: I can + глагол.',
    },
    '11': {
      short: 'Хочу',
      long: 'Что хочу сделать: I want to + глагол.',
    },
    '12': {
      short: 'Каждый день',
      long: 'Привычка: every day и Present Simple.',
    },
    '13': {
      short: 'Часто',
      long: 'Как часто: often в Present Simple.',
    },
    '1': {
      short: 'Погода и «пора»',
      long: "Как вокруг и что пора делать: It's / time to / time for.",
    },
    '2': {
      short: 'Кто?',
      long: 'Спрашиваем, кто это и кто что делает — через Who.',
    },
    '14': {
      short: 'Не знаю где',
      long: 'Внутри после don’t know — обычный порядок: where he lives.',
    },
    '3': {
      short: 'Вопрос внутри',
      long: 'Внутри не прямой вопрос, а обычный порядок: I know what she likes.',
    },
    '15': {
      short: 'Чей?',
      long: 'Whose …? и ответ с ’s: my dad’s car.',
    },
    '16': {
      short: 'Трудно / когда',
      long: 'It’s hard … и связка when …',
    },
    '17': {
      short: 'Никогда',
      long: 'never в Present Simple.',
    },
    '18': {
      short: 'Никто',
      long: 'anyone и no one в отрицании.',
    },
    '19': {
      short: 'Разве не …?',
      long: 'Отрицательный вопрос: Don’t you …?',
    },
    '20': {
      short: 'Нет времени',
      long: 'have time to + глагол.',
    },
    '21': {
      short: 'Капелька / немного',
      long: 'a bit of / a drop of + неисчисляемое.',
    },
    '22': {
      short: 'Меньше',
      long: 'less для неисчисляемых, fewer для исчисляемых.',
    },
    '23': {
      short: 'Какой …!',
      long: 'Восклицание: What a …!',
    },
    '24': {
      short: 'Думаю / думаешь',
      long: 'I think … и Present Continuous: thinking about.',
    },
    '25': {
      short: 'Уже … for',
      long: 'have been … + for (длительность до сейчас).',
    },
    '26': {
      short: 'Знаю с …',
      long: 'have known + since (состояние с момента).',
    },
    '27': {
      short: 'Делали с … до …',
      long: 'Past Continuous: were doing / from … to …',
    },
    '28': {
      short: 'One / ones',
      long: 'Замена существительного: a blue one / ones.',
    },
    '29': {
      short: 'Чего … for',
      long: 'what … for и предлог в конце.',
    },
    '30': {
      short: 'Меня приглашают',
      long: 'Пассив: be invited.',
    },
    '31': {
      short: 'Потому что возился',
      long: 'I’ve been … и причина: that’s why.',
    },
    '32': {
      short: 'Улыбаясь',
      long: 'Причастие в конце: …, smiling.',
    },
    '33': {
      short: 'Выпив …',
      long: 'Having …, I … — действие до результата.',
    },
    '34': {
      short: 'Выросла с …',
      long: 'Having grown up … и stand up for yourself.',
    },
    '35': {
      short: 'Из-за / трудно',
      long: 'because of … и find it hard to …',
    },
    '36': {
      short: 'Подскажите …?',
      long: 'Вежливый вопрос: Could you tell me …?',
    },
    '37': {
      short: 'Если бы знал',
      long: 'If he knew … / would have …',
    },
    '38': {
      short: 'Ожидал, что',
      long: 'I expected him to …',
    },
    '39': {
      short: 'Ждал до того',
      long: 'had been waiting / before …',
    },
    '40': {
      short: 'Вот-вот',
      long: 'be about to + глагол.',
    },
  },
  adult: {
    '4': {
      short: 'Представление о себе',
      long: "Кто я, откуда я и какой я — через I am (часто I'm).",
    },
    '5': {
      short: 'Описание «ты»',
      long: 'You are / You’re + прилагательное.',
    },
    '6': {
      short: 'Профессия и «это»',
      long: 'She is a …; This is + оценка или факт.',
    },
    '7': {
      short: 'Притяжательные',
      long: 'Your и Our перед существительным.',
    },
    '8': {
      short: 'Вопрос с to be',
      long: 'Are you …? — короткий вопрос и ответ.',
    },
    '9': {
      short: 'Отрицание to be',
      long: "I am not / I'm not + роль или качество.",
    },
    '10': {
      short: 'Умение',
      long: 'I can + инфинитив без to.',
    },
    '11': {
      short: 'Желание',
      long: 'I want to + инфинитив.',
    },
    '12': {
      short: 'Привычка',
      long: 'every day и Present Simple для рутины.',
    },
    '13': {
      short: 'Частотность',
      long: 'often и наречия частоты в Present Simple.',
    },
    '1': {
      short: 'Состояние и «пора»',
      long: "It's + состояние; time to + глагол; time for + событие.",
    },
    '2': {
      short: 'Вопросы с Who',
      long: 'Кто это / кто делает: Who + часто -s в вопросе и ответе.',
    },
    '14': {
      short: 'Не знаю где',
      long: 'I don’t know where … — порядок как в утверждении.',
    },
    '3': {
      short: 'Встроенный вопрос',
      long: 'После what/where/when внутри — порядок как в утверждении.',
    },
    '15': {
      short: 'Чей / ’s',
      long: 'Whose …? и притяжательный падеж: my dad’s.',
    },
    '16': {
      short: 'Трудно / когда',
      long: 'It’s hard (for me) to …; when + обстоятельство.',
    },
    '17': {
      short: 'Never',
      long: 'never и частота в Present Simple.',
    },
    '18': {
      short: 'Anyone / no one',
      long: 'anyone под отрицанием; no one как альтернатива.',
    },
    '19': {
      short: 'Отрицательный вопрос',
      long: 'Don’t you …? — удивление или уточнение.',
    },
    '20': {
      short: 'Have time to',
      long: 'have / don’t have time to + инфинитив.',
    },
    '21': {
      short: 'A bit of',
      long: 'a bit of / a drop of + неисчисляемое.',
    },
    '22': {
      short: 'Less / fewer',
      long: 'less — неисчисляемые; fewer — исчисляемые.',
    },
    '23': {
      short: 'What a …!',
      long: 'Восклицание с What a + существительное.',
    },
    '24': {
      short: 'Think / thinking about',
      long: 'I think (that) …; Present Continuous thinking about.',
    },
    '25': {
      short: 'Have been … for',
      long: 'Present Perfect Continuous + for.',
    },
    '26': {
      short: 'Have known / since',
      long: 'Present Perfect состояния + since.',
    },
    '27': {
      short: 'Were doing',
      long: 'Past Continuous: were doing / from … to …',
    },
    '28': {
      short: 'One / ones',
      long: 'a … one / ones вместо повтора существительного.',
    },
    '29': {
      short: 'What … for',
      long: 'Встроенный вопрос с предлогом: what … for.',
    },
    '30': {
      short: 'Be invited',
      long: 'Пассив Present Simple: be invited.',
    },
    '31': {
      short: 'I’ve been …',
      long: 'Present Perfect Continuous + причина: that’s why.',
    },
    '32': {
      short: '…, smiling',
      long: 'Participial phrase в конце предложения.',
    },
    '33': {
      short: 'Having …, I …',
      long: 'Perfect participle: Having …, I …',
    },
    '34': {
      short: 'Having grown up',
      long: 'Having grown up … / stand up for yourself.',
    },
    '35': {
      short: 'Because of / hard to',
      long: 'because of …; find it hard to …',
    },
    '36': {
      short: 'Could you tell me',
      long: 'Вежливый косвенный вопрос: Could you tell me …?',
    },
    '37': {
      short: 'If he knew / would have',
      long: 'Mixed conditional: If he knew … would have …',
    },
    '38': {
      short: 'Expected him to',
      long: 'I expected him to + инфинитив.',
    },
    '39': {
      short: 'Had been waiting',
      long: 'Past Perfect Continuous + before.',
    },
    '40': {
      short: 'Be about to',
      long: 'be about to + инфинитив (вот-вот).',
    },
  },
}

function byOrder(left: LessonTopicCatalogItem, right: LessonTopicCatalogItem): number {
  return left.order - right.order
}

export function getLessonTopicCatalog(): LessonTopicCatalogItem[] {
  return [...LESSON_TOPIC_CATALOG].sort(byOrder)
}

export function getTheoryLessonTopics(level?: LessonCatalogLevel): LessonTopicCatalogItem[] {
  return getLessonTopicCatalog().filter((topic) => topic.hasTheory && (!level || topic.level === level))
}

export function getPracticeLessonTopics(level?: LessonCatalogLevel): LessonTopicCatalogItem[] {
  return getLessonTopicCatalog().filter((topic) => topic.hasPractice && (!level || topic.level === level))
}

export function getLessonTopicById(lessonId: string): LessonTopicCatalogItem | null {
  return getLessonTopicCatalog().find((topic) => topic.id === lessonId) ?? null
}

/** First playable catalog lesson for the home door (enabled + structured content). */
export function getFirstEnabledPlayableLessonId(): string | null {
  const playable = getLessonTopicCatalog().filter(
    (topic) => topic.enabled && topic.hasTheory && Boolean(getStructuredLessonById(topic.id))
  )
  return playable[0]?.id ?? null
}

export function getLessonTopicBySlug(slug: string): LessonTopicCatalogItem | null {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return null
  return getLessonTopicCatalog().find((topic) => topic.slug === normalized) ?? null
}

/** CEFR уровня урока в каталоге → LevelId для фишек, кэша и CEFR-guard. */
export function catalogLevelToLevelId(level: LessonCatalogLevel): LevelId {
  const map: Record<LessonCatalogLevel, LevelId> = {
    A1: 'a1',
    A2: 'a2',
    B1: 'b1',
    B2: 'b2',
    C1: 'c1',
    C2: 'c2',
  }
  return map[level]
}

export function getPracticeLessonById(lessonId: string): LessonData | null {
  return getStructuredLessonById(lessonId)
}

export function pickQuickStartPracticeTopic(level: LessonCatalogLevel = 'A2'): LessonTopicCatalogItem | null {
  const enabledForLevel = getPracticeLessonTopics(level).filter((topic) => topic.enabled)
  const pool = enabledForLevel.length > 0 ? enabledForLevel : getPracticeLessonTopics().filter((topic) => topic.enabled)
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]
}

export function getPracticeTopicSearchTexts(topic: LessonTopicCatalogItem, audience: Audience): string[] {
  const copy = PRACTICE_TOPICS_BY_AUDIENCE[audience][topic.id]
  return [topic.title, topic.slug, copy?.short ?? '', copy?.long ?? ''].filter(Boolean)
}

function normalizeTopicLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function getMenuTopicCopyByIntroTopic(
  topic: string,
  audience: Audience,
  fallback?: { short?: string; long?: string }
): { title: string; short: string; long: string } {
  const fallbackShort = fallback?.short?.trim() || 'Тема из меню уроков'
  const fallbackLong = fallback?.long?.trim() || 'Открыли выбранный урок.'
  const normalizedTopic = normalizeTopicLabel(topic)
  if (!normalizedTopic) {
    return {
      title: topic.trim() || 'Урок',
      short: fallbackShort,
      long: fallbackLong,
    }
  }
  const catalogTopic = getLessonTopicCatalog().find((item) => normalizeTopicLabel(item.title) === normalizedTopic)
  if (!catalogTopic) {
    return {
      title: topic.trim(),
      short: fallbackShort,
      long: fallbackLong,
    }
  }
  const copy = PRACTICE_TOPICS_BY_AUDIENCE[audience][catalogTopic.id]
  return {
    title: catalogTopic.title,
    short: copy?.short ?? fallbackShort,
    long: copy?.long ?? fallbackLong,
  }
}
