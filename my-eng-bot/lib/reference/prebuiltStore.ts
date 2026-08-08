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
  selfCheck: string,
  contrast: string[] = []
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
    contrast,
    examples,
    selfCheck,
    relatedLessonId: null,
  }
}

const PREBUILT_SHEETS: Record<string, PrebuiltSheetSeed> = {
  to_be: seed(
    'Глагол to be',
    'Кто я / какой я — через am, is, are. Форма под подлежащее.',
    'A1',
    [
      'Про себя — I am. Не I is и не I are.',
      'he / she / it — is; you / we / they — are.',
    ],
    ['I am + … → I am ready.', 'he / she / it is + … → She is busy.', 'you / we / they are + … → They are ready.'],
    ['Не I is ready — а I am ready.'],
    [{ en: 'They are ready.', ru: 'Они готовы.', note: 'Много людей — are' }],
    'Кто делает? I → am; he/she/it → is; you/we/they → are.'
  ),
  have_got: seed(
    'Have / have got',
    'Have / have got — «у меня есть». Смысл один, формы две.',
    'A1',
    [
      'Have и have got — одно и то же: «у меня есть».',
      'С he / she / it — has / has got. Не have.',
    ],
    [
      'I / you / we / they have + noun → I have a bike.',
      'He / she / it has + noun → She has a phone.',
      'Have you got + noun? → Have you got a pen?',
    ],
    [
      'Не Do you have got…? — а Have you got…?',
      'Не Do you have got…? — а Do you have…?',
    ],
    [
      { en: 'Have you got a pen?', ru: 'У тебя есть ручка?', note: 'Спросить, есть ли ручка' },
      { en: 'She has a new phone.', ru: 'У неё новый телефон.', note: 'У неё есть' },
    ],
    'Нужно «у тебя есть…?» — Have you got a …? Без do рядом с have got.'
  ),
  articles: seed(
    'Articles a / an / the',
    'a / an — один новый; the — уже понятно, о чём речь.',
    'A1',
    [
      'a / an — про одну вещь, которую ещё не выделяли.',
      'the — когда собеседник уже знает, какую именно.',
      'an — перед гласным звуком: an apple, an hour.',
    ],
    ['a + consonant sound → a book.', 'an + vowel sound → an apple.', 'the + known thing → the dog.'],
    [
      'Не a books — а books / the books.',
      'Не a apple — а an apple.',
    ],
    [{ en: 'I need an umbrella.', ru: 'Мне нужен зонт.', note: 'Гласный звук — an' }],
    'Это «какой-то один» или «тот самый»? Первый раз — a/an; уже ясно какой — the.'
  ),
  there_is: seed(
    'There is / there are',
    'There is / there are — «есть / находятся». Число смотри на существительное.',
    'A1',
    [
      'Одна вещь — There is. Несколько — There are.',
      'Глагол согласуй с тем, что после there: a chair → is; two chairs → are.',
    ],
    ['There is + singular → There is a chair.', 'There are + plural → There are two chairs.'],
    [
      'Не There is two cups — а There are two cups.',
      'Не There are a chair — а There is a chair.',
    ],
    [{ en: 'There are two cups on the table.', ru: 'На столе две чашки.', note: 'Две — are' }],
    'Сколько предметов после there? Один — is, больше — are.'
  ),
  can_ability: seed(
    'Can — умение и просьба',
    'Can — умею или вежливая просьба. После can — голый глагол, без to.',
    'A1',
    [
      'Can — «умею» или «можешь…?» (просьба).',
      'После can глагол без to: can swim, не can to swim.',
    ],
    ['Subject + can + base → I can swim.', 'Can + subject + base? → Can you help?'],
    [
      'Не She cans swim — а She can swim.',
      'Не I can to swim — а I can swim.',
    ],
    [{ en: 'Can you open the window?', ru: 'Ты можешь открыть окно?', note: 'Просьба' }],
    'Хочешь сказать «умею / можешь?» — can + глагол без to.'
  ),
  would_like: seed(
    'Would like',
    'I’d like — вежливое «хочу». Мягче, чем want.',
    'A1',
    [
      'I’d like — вежливо сказать, чего хочешь.',
      'После would like — существительное или to + глагол.',
    ],
    ["I’d like + noun → I’d like a coffee.", "I’d like to + verb → I’d like to book a room."],
    [
      'Не I want would like… — а I’d like…',
      'Не I’d like go — а I’d like to go.',
    ],
    [{ en: 'I’d like to book a room.', ru: 'Я хотел бы забронировать номер.', note: 'Вежливая просьба' }],
    'Нужно вежливо «хочу» — I’d like … или I’d like to …'
  ),
  possessive_s: seed(
    'Притяжательный ’s',
    '’s после человека — «чей»: Anna’s book = книга Анны.',
    'A1',
    [
      'Человек + ’s + вещь — чья это вещь.',
      'Множественное на -s: апостроф после s — friends’ house.',
    ],
    ["person + ’s + thing → Anna’s book.", "plural -s + ’ → friends’ house."],
    [
      'Не Annas book — а Anna’s book.',
      'Не the book of Anna (в простой речи) — а Anna’s book.',
    ],
    [{ en: 'This is my brother’s room.', ru: 'Это комната моего брата.', note: 'Чья комната' }],
    'Чей предмет? Имя + ’s + вещь.'
  ),
  object_pronouns: seed(
    'Объектные местоимения',
    'После глагола/предлога — me, him, her, us, them. Не I / he.',
    'A1',
    [
      'Кому делают или о ком говорят после глагола — object pronoun.',
      'То же после предлога: for me, with them.',
    ],
    ['verb + me / him / her / us / them → Call me.', 'preposition + object → for her.'],
    [
      'Не Call I tomorrow — а Call me tomorrow.',
      'Не This is for he — а This is for him.',
    ],
    [{ en: 'Please call me tomorrow.', ru: 'Позвони мне завтра.', note: 'После глагола — me' }],
    'После глагола или предлога: me / him / her / us / them — не I / he.'
  ),
  frequency_adverbs: seed(
    'How often / частота',
    'always / usually / sometimes / never — как часто. Место зависит от глагола.',
    'A1',
    [
      'Перед основным глаголом: I usually work.',
      'С be — после be: She is always ready.',
    ],
    ['I + adverb + verb → I usually work here.', 'be + adverb → She is always ready.'],
    [
      'Не I am usually work — а I usually work.',
      'Не She always is ready — а She is always ready.',
    ],
    [{ en: 'We often eat at home.', ru: 'Мы часто едим дома.', note: 'Перед основным глаголом' }],
    'Есть be? Наречие после be. Нет — перед основным глаголом.'
  ),
  past_simple: seed(
    'Прошедшее простое',
    'Past Simple — сделал и закончил. Время в прошлом уже закрыто.',
    'A2',
    [
      'Говоришь про законченное в прошлом — past-форма глагола.',
      'Вопрос и отрицание через did; после did — база: did go, не did went.',
    ],
    ['I + past → I worked yesterday.', 'Did + subject + base? → Did you work yesterday?'],
    [
      'Не Did you went…? — а Did you go…?',
      'Не I go yesterday — а I went yesterday.',
    ],
    [{ en: 'I saw her last week.', ru: 'Я видел её на прошлой неделе.', note: 'Уже закончилось' }],
    'Есть вчера / в 2020 / last week — скорее Past Simple, не Present Perfect.',
    [
      'I was there yesterday — Past Simple (уже закончилось).',
      'I have been there — опыт без точной даты (Perfect).',
    ]
  ),
  present_perfect_experience: seed(
    'Present Perfect — опыт',
    'Present Perfect — опыт к сейчас. Точная дата не важна.',
    'A2',
    [
      'Опыт в жизни без точной даты — have / has + V3.',
      'Есть yesterday / in 2020 / last year — бери Past Simple.',
    ],
    ['have / has + V3 → She has tried sushi.', 'Have you ever + V3? → Have you ever been to London?'],
    [
      'Не I have seen her yesterday — а I saw her yesterday.',
      'Не Did you ever been…? — а Have you ever been…?',
    ],
    [{ en: 'She has never tried sushi.', ru: 'Она никогда не пробовала суши.', note: 'Опыт в жизни' }],
    'Нужна точная дата в прошлом? Past Simple. Нет даты, просто опыт — Present Perfect.'
  ),
  future: seed(
    'Будущее: will / going to',
    'will — решил сейчас; going to — план уже был.',
    'A2',
    [
      'will — новое решение или прогноз: I’ll call you.',
      'going to — план заранее или явный признак: I’m going to call him.',
    ],
    ["I’ll + base → I’ll help you.", "I’m going to + base → I’m going to call him."],
    [
      'Не I going to call — а I’m going to call.',
      'Не I will to go — а I will go.',
    ],
    [{ en: 'I’m going to call him tonight.', ru: 'Я собираюсь позвонить ему сегодня вечером.', note: 'План заранее' }],
    'План уже был до разговора? going to. Решил только что? will.'
  ),
  should_advice: seed(
    'Should — совет',
    'should — мягкий совет, не приказ. После should — голый глагол.',
    'A2',
    [
      'should — «стоит / лучше бы». Не жёсткий must.',
      'После should — базовая форма: should go, не should to go / should goes.',
    ],
    ['Subject + should + base → You should rest.', 'Should + subject + base? → Should I call?'],
    [
      'Не You should to check — а You should check.',
      'Не She shoulds go — а She should go.',
    ],
    [{ en: 'You should check the address.', ru: 'Тебе стоит проверить адрес.', note: 'Мягкий совет' }],
    'Даёшь совет — should + глагол без to и без -s.'
  ),
  present_continuous: seed(
    'Present Continuous',
    'Сейчас в процессе: am / is / are + V-ing.',
    'A1',
    [
      'Говоришь про «прямо сейчас» — am / is / are + глагол с -ing.',
      'Не для привычек каждый день — там Present Simple.',
    ],
    [
      'I am + V-ing → I am working.',
      'She is + V-ing → She is reading.',
      'Are you + V-ing? → Are you working now?',
    ],
    [
      'Не I working now — а I am working now.',
      'Не She is work — а She is working.',
    ],
    [
      { en: 'I am doing my homework.', ru: 'Я делаю домашку.', note: 'Сейчас в процессе' },
      { en: 'Look! It is raining.', ru: 'Смотри! Идёт дождь.', note: 'Прямо сейчас' },
    ],
    'Есть now / Look! / at the moment? Скорее Continuous.',
    [
      'I am doing — сейчас. I do — привычка / факт.',
      'Не путай с have been doing — это «уже какое-то время до сейчас».',
    ]
  ),
  present_perfect_continuous: seed(
    'Present Perfect Continuous',
    'have / has been + V-ing — уже какое-то время до сейчас.',
    'B1',
    [
      'Действие началось раньше и всё ещё важно сейчас — have/has been + V-ing.',
      'Часто с for / since: for two hours, since morning.',
    ],
    [
      'I have been + V-ing → I have been waiting.',
      'She has been + V-ing → She has been studying.',
      'Have you been + V-ing? → Have you been working?',
    ],
    [
      'Не I am waiting for two hours — а I have been waiting for two hours.',
      'Не I have been wait — а I have been waiting.',
    ],
    [
      {
        en: 'I have been doing this for an hour.',
        ru: 'Я уже час этим занимаюсь.',
        note: 'Длится до сейчас',
      },
      {
        en: 'She has been working since morning.',
        ru: 'Она работает с утра.',
        note: 'since = с какого момента',
      },
    ],
    'Есть for / since и действие всё ещё «живо»? Скорее have been + V-ing.',
    [
      'I am doing — снимок «сейчас». I have been doing — «уже какое-то время».',
      'Не путай с have got — это «у меня есть», не время.',
    ]
  ),
  quantifiers: seed(
    'Much / many / a lot of',
    'much — неисчисл.; many — исчисл.; a lot of — почти везде в речи.',
    'A2',
    [
      'many — с тем, что можно посчитать: many books.',
      'much — с неисчисляемым: much water / much time.',
      'a lot of — удобно и с books, и с water (особенно в утверждении).',
    ],
    [
      'many + plural → many friends',
      'much + uncountable → much time',
      'a lot of + noun → a lot of people / a lot of water',
    ],
    [
      'Не much friends — а many friends / a lot of friends.',
      'Не many water — а much water / a lot of water.',
    ],
    [
      { en: 'I have a lot of homework.', ru: 'У меня много домашки.', note: 'a lot of — универсально' },
      { en: 'How many books do you have?', ru: 'Сколько у тебя книг?', note: 'many — считаем' },
      { en: 'How much time do we have?', ru: 'Сколько у нас времени?', note: 'much — не считаем штуки' },
    ],
    'Можно посчитать штуки? many. Нельзя (вода, время)? much. Не уверен — a lot of.',
    [
      'a lot of ≈ много в живой речи.',
      'В вопросах часто how much / how many — не how a lot.',
    ]
  ),
  get_become: seed(
    'Get + прилагательное',
    'get tired / get angry — стать каким-то.',
    'A2',
    [
      'get + прилагательное = становиться: get cold, get tired, get hungry.',
      'Не про «вставать с кровати» — это get up.',
    ],
    [
      'get + adj → get tired',
      'I get + adj → I get hungry at noon.',
      'She gets + adj → She gets nervous before tests.',
    ],
    [
      'Не I am get tired — а I get tired / I am getting tired.',
      'Не I become angry every day в простой речи — чаще I get angry.',
    ],
    [
      { en: 'I get tired after school.', ru: 'Я устаю после школы.', note: 'становиться усталым' },
      { en: 'It is getting dark.', ru: 'Темнеет.', note: 'процесс прямо сейчас' },
    ],
    'После get стоит слово «какой?» (tired, dark, ready)? Это get = становиться.',
    [
      'get tired ≠ get up (вставать).',
      'get angry ≠ have got (у меня есть).',
    ]
  ),
  get_up: seed(
    'Get up',
    'get up — вставать (с кровати / на ноги).',
    'A1',
    [
      'get up = вставать, обычно утром с кровати.',
      'Это не get tired («уставать»).',
    ],
    [
      'I get up + time → I get up at 7.',
      'What time do you get up?',
      'She gets up early.',
    ],
    [
      'Не I get up tired как «устаю» — для усталости get tired.',
      'Не I stand up every morning в смысле подъёма с кровати — обычно get up.',
    ],
    [
      { en: 'I get up at seven.', ru: 'Я встаю в семь.', note: 'утро / кровать' },
      { en: 'He gets up late on Sundays.', ru: 'В воскресенье он встаёт поздно.', note: 'привычка' },
    ],
    'Речь про подъём с кровати / «во сколько встаёшь»? get up.',
    [
      'get up ≠ get tired.',
      'get up ≠ have got.',
    ]
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
