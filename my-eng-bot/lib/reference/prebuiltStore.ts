import { buildReferenceSheetByLessonId } from '@/lib/reference/buildReferenceSheet'
import type { ReferenceSheet } from '@/lib/reference/types'

/**
 * Git-backed Wave3 registry. These are curated adult sheets, not a full
 * syllabus export. A lesson-linked topic may also be present here as a
 * fallback, but resolveReferenceTarget always gives the lesson intro priority.
 */
export const PREBUILT_SCHEMA_VERSION = 1

type PrebuiltSheetSeed = Omit<ReferenceSheet, 'id'>

function seed(
  title: string,
  teaser: string,
  level: ReferenceSheet['level'],
  rule: string[],
  formula: string[],
  traps: string[],
  examples: ReferenceSheet['examples'],
  selfCheck: string
): PrebuiltSheetSeed {
  return {
    title,
    teaser,
    level,
    hasPractice: false,
    hook: teaser,
    rule,
    formula,
    traps,
    examples,
    selfCheck,
    relatedLessonId: null,
  }
}

const PREBUILT_SHEETS: Record<string, PrebuiltSheetSeed> = {
  to_be: seed(
    'Глагол to be',
    'I am, you are, she is.',
    'A1',
    ['Use am, is, or are to describe a person or thing.', 'The form agrees with the subject.'],
    ['I am …', 'he / she / it is …; you / we / they are …'],
    ['Do not use is with I.'],
    [{ en: 'They are ready.', ru: 'Они готовы.', note: 'plural subject' }],
    'Who is the subject?'
  ),
  have_got: seed(
    'Have / have got',
    'I have a bike. I’ve got a bike.',
    'A1',
    ['Have and have got both show possession.', 'Use has / has got with he, she, and it.'],
    ['I / you / we / they have + noun.', 'He / she / it has + noun.'],
    ['Do not say “I have got” with do in the same question.'],
    [
      { en: 'Have you got a pen?', ru: 'У тебя есть ручка?', note: 'question' },
      { en: 'She has a new phone.', ru: 'У неё новый телефон.', note: 'third person' },
    ],
    'Ask: Have you got a …?'
  ),
  articles: seed(
    'Articles a / an / the',
    'A dog is outside. The dog is friendly.',
    'A1',
    ['Use a / an for one non-specific thing.', 'Use the when the listener knows which thing.'],
    ['a + consonant sound: a book.', 'an + vowel sound: an apple.'],
    ['Do not use a with plural or uncountable nouns.'],
    [{ en: 'I need an umbrella.', ru: 'Мне нужен зонт.', note: 'vowel sound' }],
    'Is this one new thing or a known thing?'
  ),
  there_is: seed(
    'There is / there are',
    'There is one chair. There are two chairs.',
    'A1',
    ['There is introduces one thing.', 'There are introduces more than one thing.'],
    ['There is + singular noun.', 'There are + plural noun.'],
    ['The verb agrees with the noun after there.'],
    [{ en: 'There are two cups on the table.', ru: 'На столе две чашки.', note: 'plural' }],
    'Look around: what is there?'
  ),
  can_ability: seed(
    'Can — умение и просьба',
    'I can swim. Can you help?',
    'A1',
    ['Can shows ability or a simple request.', 'The verb after can has no to.'],
    ['Subject + can + base verb.', 'Can + subject + base verb?'],
    ['Do not add -s after can: She can, not she cans.'],
    [{ en: 'Can you open the window?', ru: 'Ты можешь открыть окно?', note: 'request' }],
    'What can you do?'
  ),
  would_like: seed(
    'Would like',
    'I’d like a coffee.',
    'A1',
    ['Would like is a polite way to say what you want.', 'Use a noun or to + verb after would like.'],
    ['I’d like + noun.', 'I’d like to + verb.'],
    ['Do not use want and would like together.'],
    [{ en: 'I’d like to book a room.', ru: 'Я хотел бы забронировать номер.', note: 'polite request' }],
    'What would you like?'
  ),
  possessive_s: seed(
    'Притяжательный ’s',
    'Anna’s book means the book belongs to Anna.',
    'A1',
    ['Use ’s to show who owns or relates to something.'],
    ['person + ’s + thing.', 'plural ending in s + apostrophe: friends’ house.'],
    ['The apostrophe is not the same as a plural ending.'],
    [{ en: 'This is my brother’s room.', ru: 'Это комната моего брата.', note: 'ownership' }],
    'Whose thing is it?'
  ),
  object_pronouns: seed(
    'Объектные местоимения',
    'Use me, him, her, us, and them after a verb or preposition.',
    'A1',
    ['Object pronouns receive the action.', 'They usually follow a verb or preposition.'],
    ['verb + me / him / her / us / them.', 'preposition + object pronoun.'],
    ['Do not use I or he after a verb as the object.'],
    [{ en: 'Please call me tomorrow.', ru: 'Позвони мне завтра.', note: 'object' }],
    'Who receives the action?'
  ),
  frequency_adverbs: seed(
    'How often / частота',
    'Always, usually, sometimes, and never show frequency.',
    'A1',
    ['Frequency adverbs usually go before the main verb.', 'With be, they usually go after be.'],
    ['I usually work here.', 'She is always ready.'],
    ['Do not put the adverb in the same position with every verb.'],
    [{ en: 'We often eat at home.', ru: 'Мы часто едим дома.', note: 'main verb' }],
    'How often does it happen?'
  ),
  past_simple: seed(
    'Прошедшее простое',
    'Past Simple tells what happened and finished in the past.',
    'A2',
    ['Use the past form for finished past actions.', 'Use did for questions and negatives.'],
    ['I worked yesterday.', 'Did you work yesterday?'],
    ['After did, use the base verb: did go, not did went.'],
    [{ en: 'I saw her last week.', ru: 'Я видел её на прошлой неделе.', note: 'finished past' }],
    'When did it happen?'
  ),
  present_perfect_experience: seed(
    'Present Perfect — опыт',
    'Have you ever been to London?',
    'A2',
    ['Present Perfect links a past experience to now.', 'Use it when the exact finished time is not important.'],
    ['have / has + past participle.', 'Have you ever + past participle?'],
    ['Use Past Simple with a finished time: yesterday, in 2020.'],
    [{ en: 'She has never tried sushi.', ru: 'Она никогда не пробовала суши.', note: 'life experience' }],
    'Have you ever done it?'
  ),
  future: seed(
    'Будущее: will / going to',
    'Use will for a decision now and going to for a plan.',
    'A2',
    ['Will often expresses a new decision or prediction.', 'Going to presents an existing plan or clear sign.'],
    ['I’ll + base verb.', 'I’m going to + base verb.'],
    ['Do not use going to without a form of be.'],
    [{ en: 'I’m going to call him tonight.', ru: 'Я собираюсь позвонить ему сегодня вечером.', note: 'plan' }],
    'Was the plan made before now?'
  ),
  should_advice: seed(
    'Should — совет',
    'You should take a break.',
    'A2',
    ['Should gives advice, not a strong order.', 'The verb after should stays in the base form.'],
    ['Subject + should + base verb.', 'Should I + base verb?'],
    ['Do not add to or -s after should.'],
    [{ en: 'You should check the address.', ru: 'Тебе стоит проверить адрес.', note: 'advice' }],
    'What would be a helpful idea?'
  ),
}

const LESSON_SEED_KEYS: Array<{ topicKey: string; lessonId: string }> = [
  { topicKey: 'its_time_to', lessonId: '1' },
  { topicKey: 'weather_it', lessonId: '1' },
  { topicKey: 'вопросы_и_порядок_слов', lessonId: '2' },
  { topicKey: 'wh_subject_questions', lessonId: '2' },
  { topicKey: 'questions_do_does', lessonId: '2' },
  { topicKey: 'word_order', lessonId: '3' },
  { topicKey: 'reported_speech', lessonId: '3' },
  { topicKey: 'reported_statements', lessonId: '3' },
  { topicKey: 'present_simple', lessonId: '4' },
  { topicKey: 'to_be', lessonId: '4' },
]

/** @deprecated no-op kept for callers. */
export function seedPrebuiltFromLessons(): void {}

export function hasStaticPrebuiltSheet(topicKey: string): boolean {
  const key = topicKey.trim()
  return Boolean(key && (key in PREBUILT_SHEETS || LESSON_SEED_KEYS.some((s) => s.topicKey === key)))
}

export function getPrebuiltSheet(topicKey: string): ReferenceSheet | null {
  const key = topicKey.trim()
  if (!key) return null
  const staticSheet = PREBUILT_SHEETS[key]
  if (staticSheet) {
    return {
      ...staticSheet,
      id: `prebuilt:v${PREBUILT_SCHEMA_VERSION}:${key}`,
    }
  }
  const lessonSeed = LESSON_SEED_KEYS.find((s) => s.topicKey === key)
  if (!lessonSeed) return null
  const sheet = buildReferenceSheetByLessonId(lessonSeed.lessonId)
  if (!sheet) return null
  return {
    ...sheet,
    id: `prebuilt:${key}`,
    relatedLessonId: lessonSeed.lessonId,
  }
}

export function listStaticPrebuiltSheetKeys(): string[] {
  return Object.keys(PREBUILT_SHEETS)
}

export function clearPrebuiltSheetsForTests(): void {}
