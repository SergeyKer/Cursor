import type { SentenceType } from './types'

function stableHash32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Отрицание в русском drill-тексте (\\b в JS не привязан к кириллице). */
function hasRussianNegationHint(s: string): boolean {
  const t = s.replace(/\s+/g, ' ').trim()
  if (/(?:^|[\s,;])(?:не|ни|нет|никогда|ничего|никому|нигде)(?=[\s,.!?…]|$)/iu.test(t)) return true
  return /\b(не|ни|нет|никогда|ничего|никому|нигде)\b/i.test(t)
}

function applyRuSentenceTypeForDrill(sentence: string, sentenceType: SentenceType): string {
  const raw = sentence.replace(/\s+/g, ' ').trim()
  if (!raw || sentenceType === 'mixed') return raw

  if (sentenceType === 'general') {
    let u = raw.replace(/\?+\s*$/, '.')
    if (!/[.!?…]$/.test(u)) u += '.'
    return u
  }

  if (sentenceType === 'interrogative') {
    const u = raw.replace(/\.+\s*$/, '').trimEnd()
    return /\?$/.test(u) ? u : `${u}?`
  }

  if (hasRussianNegationHint(raw)) {
    return /[.!?…]$/.test(raw) ? raw : `${raw}.`
  }

  const cyrBoundary = '(?=\\s|[,.!?…]|$)'
  let u = raw
    .replace(new RegExp(`^Я люблю${cyrBoundary}`, 'i'), 'Я не люблю')
    .replace(new RegExp(`^Мне нравится${cyrBoundary}`, 'i'), 'Мне не нравится')
    .replace(new RegExp(`^Мы любим${cyrBoundary}`, 'i'), 'Мы не любим')
    .replace(new RegExp(`^Я работаю${cyrBoundary}`, 'i'), 'Я не работаю')
    .replace(/^Я сейчас ([А-Яа-яЁё]+)/i, 'Я сейчас не $1')
    .replace(/^Мы сейчас ([А-Яа-яЁё]+)/i, 'Мы сейчас не $1')
    .replace(/^Я обычно ([А-Яа-яЁё]+)/i, 'Я обычно не $1')
    .replace(/^Мы обычно ([А-Яа-яЁё]+)/i, 'Мы обычно не $1')
    .replace(/^Я часто ([А-Яа-яЁё]+)/i, 'Я нечасто $1')
    .replace(/^Мы часто ([А-Яа-яЁё]+)/i, 'Мы нечасто $1')
    .replace(/^Вчера я\s+/i, 'Вчера я не ')
    .replace(/^Завтра я\s+/i, 'Завтра я не ')
    .replace(/^Я уже ([А-Яа-яЁё]+)/i, 'Я ещё не $1')
    .replace(/^Мы уже ([А-Яа-яЁё]+)/i, 'Мы ещё не $1')
    .replace(/^Я буду ([А-Яа-яЁё]+)/i, 'Я не буду $1')
    .replace(new RegExp(`^Я пришёл${cyrBoundary}`, 'i'), 'Я не пришёл')

  if (!hasRussianNegationHint(u)) {
    u = u.replace(/^Я ([А-Яа-яЁё][а-яё]*)/i, 'Я не $1').replace(/^Мы ([А-Яа-яЁё][а-яё]*)/i, 'Мы не $1')
  }

  return /[.!?…]$/.test(u) ? u : `${u}.`
}

/** Единая нормализация русской drill-строки под тип предложения (fallback и текст от модели). */
export function normalizeDrillRuSentenceForSentenceType(
  sentence: string,
  sentenceType: SentenceType
): string {
  return normalizeTranslationPracticeSentence(applyRuSentenceTypeForDrill(sentence, sentenceType))
}

export function fallbackTranslationSentenceForContext(params: {
  topic: string
  tense: string
  level: string
  audience: 'child' | 'adult'
  seedText?: string | null
  sentenceType?: SentenceType
}): string {
  const { topic, tense, level, audience, seedText = '', sentenceType = 'mixed' } = params
  const isChild = audience === 'child'
  const seed = stableHash32(`translation_next|${topic}|${tense}|${level}|${audience}|${seedText}`)
  const pick = (variants: string[]) => variants[seed % variants.length] ?? variants[0] ?? ''
  const finish = (ru: string) => normalizeDrillRuSentenceForSentenceType(ru, sentenceType)
  const topicVariants: Record<string, string[]> = {
    food: ['Я люблю готовить дома по вечерам.', 'Я часто пью чай вечером.', 'Мы обычно ужинаем вместе.'],
    family_friends: ['Я люблю проводить время с семьёй.', 'У меня есть хорошие друзья.', 'Мы часто видимся по выходным.'],
    hobbies: ['Я люблю читать по вечерам.', 'Я часто рисую вечером.', 'Я обычно играю в шахматы дома.'],
    movies_series: ['Я люблю смотреть фильмы дома.', 'Я часто смотрю сериалы вечером.', 'Мы обычно смотрим кино по выходным.'],
    music: ['Я люблю слушать музыку в дороге.', 'Я часто слушаю песни дома.', 'Мы обычно поём вместе.'],
    sports: ['Я люблю заниматься спортом.', 'Я часто бегаю по утрам.', 'Мы обычно играем в футбол после школы.'],
    daily_life: ['Я обычно встаю рано.', 'Я часто завтракаю дома.', 'Мы обычно ходим в школу пешком.'],
    travel: ['Я люблю путешествовать.', 'Я часто езжу в новые места.', 'Мы обычно планируем поездки заранее.'],
    work: ['Я работаю в офисе.', 'Я часто пишу письма по работе.', 'Мы обычно встречаемся утром.'],
    technology: ['Я люблю новые приложения.', 'Я часто пользуюсь телефоном.', 'Мы обычно работаем за компьютером.'],
    culture: ['Я люблю ходить в музеи.', 'Я часто читаю о культуре.', 'Мы обычно посещаем выставки.'],
    business: ['Я работаю с клиентами.', 'Я часто отвечаю на письма.', 'Мы обычно обсуждаем планы на встрече.'],
    free_talk: ['Я люблю читать книги.', 'Я часто гуляю вечером.', 'Мы обычно разговариваем дома по-английски.'],
  }
  const basic = level === 'starter' || level === 'a1' || level === 'a2'

  const a1SimplifiedTopicPool: Record<string, string[]> = {
    food: ['Я люблю чай.', 'Я люблю есть дома.', 'Я пью чай вечером.'],
    family_friends: ['У меня есть семья.', 'У меня есть друзья.', 'Я люблю свою семью.'],
    hobbies: ['Я люблю книги.', 'Я люблю рисовать.', 'Я люблю играть дома.'],
    movies_series: ['Я не люблю смотреть фильмы.', 'Я люблю смотреть фильмы.', 'Я люблю фильмы.'],
    music: ['Я люблю музыку.', 'Я слушаю музыку.', 'Я люблю песни.'],
    sports: ['Я люблю спорт.', 'Я люблю бегать.', 'Я играю в футбол.'],
    daily_life: ['Я встаю рано.', 'Я пью чай утром.', 'Я хожу в школу.'],
    travel: ['Я люблю поездки.', 'Я еду в город.', 'Я люблю новые места.'],
    work: ['Я работаю.', 'Я пишу письма.', 'Я встречаюсь с людьми.'],
    technology: ['Я люблю телефон.', 'Я пользуюсь телефоном.', 'Я люблю новые приложения.'],
    culture: ['Я люблю музеи.', 'Я читаю о культуре.', 'Я люблю выставки.'],
    business: ['Я работаю с клиентами.', 'Я пишу письма.', 'Я обсуждаю планы.'],
    free_talk: ['Я не люблю смотреть фильмы.', 'Я люблю смотреть фильмы.'],
  }

  if (tense === 'present_simple') {
    const topicPool = basic && a1SimplifiedTopicPool[topic] ? a1SimplifiedTopicPool[topic] : topicVariants[topic] ?? topicVariants.free_talk
    return finish(pick(topicPool))
  }
  if (tense === 'present_continuous') {
    return finish(
      pick([
        'Я сейчас читаю книгу.',
        'Я сейчас готовлю ужин.',
        'Мы сейчас смотрим фильм.',
        basic ? 'Я сейчас учусь.' : 'Я сейчас работаю над проектом.',
      ])
    )
  }
  if (tense === 'present_perfect') {
    const genericPool = [
      'Я уже прочитал книгу.',
      'Я уже сделал домашнее задание.',
      'Мы уже поужинали.',
      basic ? 'Я уже увидел это.' : 'Я уже решил эту задачу.',
    ]
    const genericQuestionPool = audience === 'child'
      ? [
          'Ты уже прочитал эту книгу?',
          'Ты уже сделал домашнее задание?',
          'Ты уже поужинал?',
        ]
      : [
          'Вы уже прочитали эту книгу?',
          'Вы уже сделали домашнее задание?',
          'Вы уже поужинали?',
        ]
    const topicPresentPerfect: Record<string, string[]> = {
      music: [
        'Я уже слышал эту песню много раз.',
        'Я уже был на живом концерте.',
        'Мы уже послушали новый альбом.',
      ],
      work: [
        'Я уже отправил это письмо клиенту.',
        'Мы уже обсудили этот вопрос на планёрке.',
        'Я уже сдал отчёт в срок.',
      ],
      travel: [
        'Я уже бывал в этой стране дважды.',
        'Ты когда-нибудь летал дальним рейсом?',
        'Мы уже забронировали отель на выходные.',
      ],
      hobbies: [
        'Я уже закончил этот рисунок.',
        'Ты когда-нибудь играл в шахматы всерьёз?',
        'Мы уже собрали новый пазл за вечер.',
      ],
      movies_series: [
        'Я уже смотрел этот фильм три раза.',
        'Ты когда-нибудь досматривал сериал до конца за одну ночь?',
        'Мы уже обсудили финал сериала.',
      ],
    }
    const topicPresentPerfectQuestions: Record<string, { adult: string[]; child: string[] }> = {
      music: {
        adult: [
          'Вы уже слышали эту песню много раз?',
          'Вы когда-нибудь были на живом концерте?',
          'Вы уже послушали новый альбом?',
        ],
        child: [
          'Ты уже слышал эту песню много раз?',
          'Ты когда-нибудь был на живом концерте?',
          'Ты уже послушал новый альбом?',
        ],
      },
      work: {
        adult: [
          'Вы уже отправили это письмо клиенту?',
          'Вы уже обсудили этот вопрос на планёрке?',
          'Вы уже сдали отчёт в срок?',
        ],
        child: [
          'Ты уже отправил это письмо клиенту?',
          'Ты уже обсудил этот вопрос на планёрке?',
          'Ты уже сдал отчёт в срок?',
        ],
      },
      travel: {
        adult: [
          'Вы уже бывали в этой стране?',
          'Вы когда-нибудь летали дальним рейсом?',
          'Вы уже забронировали отель на выходные?',
        ],
        child: [
          'Ты уже бывал в этой стране?',
          'Ты когда-нибудь летал дальним рейсом?',
          'Ты уже забронировал отель на выходные?',
        ],
      },
      hobbies: {
        adult: [
          'Вы уже закончили этот рисунок?',
          'Вы когда-нибудь играли в шахматы всерьёз?',
          'Вы уже собрали новый пазл за вечер?',
        ],
        child: [
          'Ты уже закончил этот рисунок?',
          'Ты когда-нибудь играл в шахматы всерьёз?',
          'Ты уже собрал новый пазл за вечер?',
        ],
      },
      movies_series: {
        adult: [
          'Вы уже смотрели этот фильм три раза?',
          'Вы когда-нибудь досматривали сериал до конца за одну ночь?',
          'Вы уже обсудили финал сериала?',
        ],
        child: [
          'Ты уже смотрел этот фильм три раза?',
          'Ты когда-нибудь досматривал сериал до конца за одну ночь?',
          'Ты уже обсудил финал сериала?',
        ],
      },
    }
    if (sentenceType === 'interrogative') {
      const topicQuestions = topicPresentPerfectQuestions[topic]
      const audienceQuestions = topicQuestions ? (audience === 'child' ? topicQuestions.child : topicQuestions.adult) : []
      const pool = audienceQuestions.length > 0 ? audienceQuestions : genericQuestionPool
      return finish(pick(pool))
    }
    const extra = topicPresentPerfect[topic] ?? []
    const pool = extra.length > 0 ? extra : genericPool
    return finish(pick(pool))
  }
  if (tense === 'present_perfect_continuous') {
    return finish(
      pick([
        'Я уже давно читаю эту книгу.',
        'Я уже несколько часов работаю над проектом.',
        'Мы уже долго ждём тебя.',
        basic ? 'Я уже давно учусь английскому.' : 'Я уже давно занимаюсь этим проектом.',
      ])
    )
  }
  if (tense === 'past_simple') {
    return finish(
      pick([
        'Вчера я прочитал книгу.',
        'Вчера мы смотрели фильм.',
        'Я пришёл домой поздно.',
        basic ? 'Я вчера играл дома.' : 'Я вчера работал допоздна.',
      ])
    )
  }
  if (tense === 'past_continuous') {
    return finish(
      pick([
        'Я читал книгу, когда ты позвонил.',
        'Мы ужинали, когда начался дождь.',
        'Я смотрел фильм, когда пришёл друг.',
        basic ? 'Я играл, когда мама позвала меня.' : 'Я работал над проектом, когда пришло письмо.',
      ])
    )
  }
  if (tense === 'past_perfect') {
    return finish(
      pick([
        'Я уже прочитал книгу до ужина.',
        'Мы уже ушли, когда ты пришёл.',
        'Я уже сделал уроки к вечеру.',
        basic ? 'Я уже поел до прогулки.' : 'Я уже закончил работу до встречи.',
      ])
    )
  }
  if (tense === 'past_perfect_continuous') {
    return finish(
      pick([
        'Я уже давно читал эту книгу до ужина.',
        'Мы уже несколько часов ждали автобус.',
        'Я уже долго работал, когда ты позвонил.',
        basic ? 'Я уже долго играл, когда мама пришла.' : 'Я уже давно занимался этим проектом до звонка.',
      ])
    )
  }
  if (tense === 'future_simple') {
    return finish(
      pick([
        'Завтра я прочитаю книгу.',
        'Завтра мы пойдём в кино.',
        'Я скоро позвоню тебе.',
        basic ? 'Я завтра пойду гулять.' : 'Я на следующей неделе начну новый проект.',
      ])
    )
  }
  if (tense === 'future_continuous') {
    return finish(
      pick([
        'Завтра в это время я буду читать книгу.',
        'Завтра вечером мы будем ужинать.',
        'Я буду работать весь день.',
        basic ? 'Я буду учиться вечером.' : 'Я буду заниматься проектом завтра утром.',
      ])
    )
  }
  if (tense === 'future_perfect') {
    return finish(
      pick([
        'К завтрашнему утру я уже прочитаю книгу.',
        'К вечеру мы уже закончим работу.',
        'К тому времени я уже всё сделаю.',
        basic ? 'Я к вечеру уже вернусь домой.' : 'Я к понедельнику уже завершу задачу.',
      ])
    )
  }
  if (tense === 'future_perfect_continuous') {
    return finish(
      pick([
        'К вечеру я уже буду читать книгу два часа.',
        'К тому времени мы уже будем работать над проектом несколько часов.',
        'К завтрашнему утру я уже буду заниматься этим час.',
        basic ? 'К вечеру я уже буду играть несколько часов.' : 'К сроку я уже буду работать над задачей несколько часов.',
      ])
    )
  }
  return finish(isChild ? 'Я люблю читать книги.' : base)
}

export function normalizeTranslationPracticeSentence(sentence: string): string {
  const trimmed = sentence.replace(/\s+/g, ' ').trim()
  if (!trimmed) return trimmed

  return trimmed
    .replace(/разное время суток/gi, 'в разное время суток')
    .replace(/Мы обычно говорим по-английски дома/gi, 'Мы обычно разговариваем дома по-английски')
}

export function buildTranslationRetryFallback(params: { tense: string; includeRepeat: boolean }): string {
  const { tense, includeRepeat } = params
  void tense
  void includeRepeat
  return 'Комментарий: Некорректный ввод. Введите полное предложение на английском языке.'
}
