function stableHash32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function fallbackTranslationSentenceForContext(params: {
  topic: string
  tense: string
  level: string
  audience: 'child' | 'adult'
  seedText?: string | null
}): string {
  const { topic, tense, level, audience, seedText = '' } = params
  const isChild = audience === 'child'
  const seed = stableHash32(`translation_next|${topic}|${tense}|${level}|${audience}|${seedText}`)
  const pick = (variants: string[]) => variants[seed % variants.length] ?? variants[0] ?? ''
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
  const topicPool = topicVariants[topic] ?? topicVariants.free_talk
  const base = pick(topicPool)
  const basic = level === 'starter' || level === 'a1' || level === 'a2'

  if (tense === 'present_simple') return base
  if (tense === 'present_continuous') {
    return pick([
      'Я сейчас читаю книгу.',
      'Я сейчас готовлю ужин.',
      'Мы сейчас смотрим фильм.',
      basic ? 'Я сейчас учусь.' : 'Я сейчас работаю над проектом.',
    ])
  }
  if (tense === 'present_perfect') {
    return pick([
      'Я уже прочитал книгу.',
      'Я уже сделал домашнее задание.',
      'Мы уже поужинали.',
      basic ? 'Я уже увидел это.' : 'Я уже решил эту задачу.',
    ])
  }
  if (tense === 'present_perfect_continuous') {
    return pick([
      'Я уже давно читаю эту книгу.',
      'Я уже несколько часов работаю над проектом.',
      'Мы уже долго ждём тебя.',
      basic ? 'Я уже давно учусь английскому.' : 'Я уже давно занимаюсь этим проектом.',
    ])
  }
  if (tense === 'past_simple') {
    return pick([
      'Вчера я прочитал книгу.',
      'Вчера мы смотрели фильм.',
      'Я пришёл домой поздно.',
      basic ? 'Я вчера играл дома.' : 'Я вчера работал допоздна.',
    ])
  }
  if (tense === 'past_continuous') {
    return pick([
      'Я читал книгу, когда ты позвонил.',
      'Мы ужинали, когда начался дождь.',
      'Я смотрел фильм, когда пришёл друг.',
      basic ? 'Я играл, когда мама позвала меня.' : 'Я работал над проектом, когда пришло письмо.',
    ])
  }
  if (tense === 'past_perfect') {
    return pick([
      'Я уже прочитал книгу до ужина.',
      'Мы уже ушли, когда ты пришёл.',
      'Я уже сделал уроки к вечеру.',
      basic ? 'Я уже поел до прогулки.' : 'Я уже закончил работу до встречи.',
    ])
  }
  if (tense === 'past_perfect_continuous') {
    return pick([
      'Я уже давно читал эту книгу до ужина.',
      'Мы уже несколько часов ждали автобус.',
      'Я уже долго работал, когда ты позвонил.',
      basic ? 'Я уже долго играл, когда мама пришла.' : 'Я уже давно занимался этим проектом до звонка.',
    ])
  }
  if (tense === 'future_simple') {
    return pick([
      'Завтра я прочитаю книгу.',
      'Завтра мы пойдём в кино.',
      'Я скоро позвоню тебе.',
      basic ? 'Я завтра пойду гулять.' : 'Я на следующей неделе начну новый проект.',
    ])
  }
  if (tense === 'future_continuous') {
    return pick([
      'Завтра в это время я буду читать книгу.',
      'Завтра вечером мы будем ужинать.',
      'Я буду работать весь день.',
      basic ? 'Я буду учиться вечером.' : 'Я буду заниматься проектом завтра утром.',
    ])
  }
  if (tense === 'future_perfect') {
    return pick([
      'К завтрашнему утру я уже прочитаю книгу.',
      'К вечеру мы уже закончим работу.',
      'К тому времени я уже всё сделаю.',
      basic ? 'Я к вечеру уже вернусь домой.' : 'Я к понедельнику уже завершу задачу.',
    ])
  }
  if (tense === 'future_perfect_continuous') {
    return pick([
      'К вечеру я уже буду читать книгу два часа.',
      'К тому времени мы уже будем работать над проектом несколько часов.',
      'К завтрашнему утру я уже буду заниматься этим час.',
      basic ? 'К вечеру я уже буду играть несколько часов.' : 'К сроку я уже буду работать над задачей несколько часов.',
    ])
  }
  return isChild ? 'Я люблю читать книги.' : base
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
