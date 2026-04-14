/** Словарь русских тематических слов → английский (диалог, выбор темы, mixed-input fallback). */
export const RU_TOPIC_KEYWORD_TO_EN: Record<string, string> = {
  солнце: 'sun',
  солнечный: 'sun',
  погода: 'weather',
  дождь: 'rain',
  снег: 'snow',
  море: 'sea',
  океан: 'ocean',
  река: 'river',
  озеро: 'lake',
  пляж: 'beach',
  гора: 'mountain',
  горы: 'mountains',
  лес: 'forest',
  природа: 'nature',
  спорт: 'sports',
  футбол: 'football',
  теннис: 'tennis',
  баскетбол: 'basketball',
  хоккей: 'hockey',
  плавание: 'swimming',
  бег: 'running',
  велосипед: 'bicycle',
  музыка: 'music',
  песня: 'song',
  песни: 'songs',
  гитара: 'guitar',
  пианино: 'piano',
  фильм: 'movie',
  фильмы: 'movies',
  кино: 'cinema',
  мультик: 'cartoon',
  мультики: 'cartoons',
  книга: 'book',
  книги: 'books',
  школа: 'school',
  урок: 'lesson',
  уроки: 'lessons',
  учёба: 'studies',
  работа: 'work',
  еда: 'food',
  готовка: 'cooking',
  хлеб: 'bread',
  яйцо: 'egg',
  яйца: 'eggs',
  кот: 'cat',
  кошка: 'cat',
  кошки: 'cats',
  собака: 'dog',
  собаки: 'dogs',
  питомец: 'pet',
  питомца: 'pet',
  питомцу: 'pet',
  питомцем: 'pet',
  питомцы: 'pets',
  животные: 'animals',
  семья: 'family',
  /** Склонения «семья», иначе extractPromptKeywords не видит family и alignRepeatKeywords подменяет его на другое слово из промпта. */
  семьи: 'family',
  семье: 'family',
  семью: 'family',
  семьёй: 'family',
  друзья: 'friends',
  друг: 'friend',
  путешествие: 'travel',
  путешествия: 'travel',
  путешествовать: 'travel',
  путешествую: 'travel',
  путешествуешь: 'travel',
  путешествует: 'travel',
  путешествуем: 'travel',
  путешествуете: 'travel',
  путешествуют: 'travel',
  разный: 'different',
  разная: 'different',
  разное: 'different',
  разные: 'different',
  разным: 'different',
  разными: 'different',
  нескольким: 'several',
  несколько: 'several',
  многим: 'many',
  много: 'many',
  город: 'city',
  города: 'cities',
  городам: 'cities',
  страна: 'country',
  страны: 'countries',
  странам: 'countries',
  странах: 'countries',
  дом: 'home',
  машина: 'car',
  компьютер: 'computer',
  телефон: 'phone',
  игра: 'game',
  игры: 'games',
  лето: 'summer',
  зима: 'winter',
  весна: 'spring',
  осень: 'autumn',
  космос: 'space',
  динозавры: 'dinosaurs',
  робот: 'robot',
  роботы: 'robots',

  /** Смешанный ответ (латиница + кириллица): fallback «Повтори» для всех времён. */
  противник: 'opponent',
  противники: 'opponents',
  сильный: 'strong',
  сильная: 'strong',
  сильные: 'strong',
  очень: 'very',
  был: 'was',
  была: 'was',
  были: 'were',
  выиграл: 'won',
  выиграла: 'won',
  выиграли: 'won',
  выиграло: 'won',
  проиграл: 'lost',
  нас: 'us',
  мы: 'we',
  и: 'and',
  что: 'that',
  как: 'how',
  когда: 'when',
  где: 'where',
  почему: 'why',
  радость: 'joy',
  команда: 'team',
  матч: 'match',
  гол: 'goal',
  трудно: 'hard',
  сложно: 'difficult',
  легко: 'easy',
  всегда: 'always',
  никогда: 'never',
  иногда: 'sometimes',
  редко: 'rarely',
  часто: 'often',
  обычно: 'usually',
  сегодня: 'today',
  вчера: 'yesterday',
  завтра: 'tomorrow',
}

export function normalizeTopicToken(token: string): string {
  return token.toLowerCase().replace(/^[^a-zа-яё]+|[^a-zа-яё]+$/gi, '')
}

function pushCandidate(candidates: string[], candidate: string): void {
  if (!candidate) return
  if (!candidates.includes(candidate)) candidates.push(candidate)
}

/**
 * Нормализует русскую словоформу до словарного ключа темы, если это безопасно.
 * Если уверенного совпадения нет, возвращает обычный normalizeTopicToken().
 */
export function normalizeRuTopicKeyword(token: string): string {
  const normalized = normalizeTopicToken(token)
  if (!normalized) return ''
  if (RU_TOPIC_KEYWORD_TO_EN[normalized]) return normalized

  const candidates: string[] = [normalized]
  if (normalized.endsWith('у')) {
    pushCandidate(candidates, `${normalized.slice(0, -1)}а`)
    pushCandidate(candidates, normalized.slice(0, -1))
  }
  if (normalized.endsWith('ю')) {
    pushCandidate(candidates, `${normalized.slice(0, -1)}я`)
    pushCandidate(candidates, normalized.slice(0, -1))
  }
  if (normalized.endsWith('е')) {
    pushCandidate(candidates, `${normalized.slice(0, -1)}а`)
    pushCandidate(candidates, normalized.slice(0, -1))
  }
  if (normalized.endsWith('ой')) pushCandidate(candidates, `${normalized.slice(0, -2)}а`)
  if (normalized.endsWith('ей')) pushCandidate(candidates, `${normalized.slice(0, -2)}я`)
  if (normalized.endsWith('ами') || normalized.endsWith('ями') || normalized.endsWith('ьми')) {
    pushCandidate(candidates, normalized.slice(0, -2))
  }
  if (normalized.endsWith('ом') || normalized.endsWith('ем')) {
    pushCandidate(candidates, normalized.slice(0, -2))
  }
  if (normalized.endsWith('ам') || normalized.endsWith('ям')) {
    pushCandidate(candidates, `${normalized.slice(0, -2)}а`)
    pushCandidate(candidates, `${normalized.slice(0, -2)}я`)
    pushCandidate(candidates, normalized.slice(0, -2))
  }

  for (const candidate of candidates) {
    if (RU_TOPIC_KEYWORD_TO_EN[candidate]) return candidate
  }
  return normalized
}