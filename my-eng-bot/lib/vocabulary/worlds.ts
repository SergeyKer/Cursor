import type { NecessaryWord, ParsedNecessaryWord, VocabularyWorldDefinition, VocabularyWorldId } from '@/types/vocabulary'

export const VOCABULARY_WORLDS: VocabularyWorldDefinition[] = [
  { id: 'home', title: 'Дом и семья', badge: '🏠', description: 'Семья, дом, еда, цвета, животные и тело.' },
  { id: 'school', title: 'Школа и хобби', badge: '🎒', description: 'Учёба, время, игры, музыка и увлечения.' },
  { id: 'travel', title: 'Путешествия', badge: '✈️', description: 'Поездки, транспорт, природа и места.' },
  { id: 'digital', title: 'Цифровой мир', badge: '🎮', description: 'Технологии, интернет и гаджеты.' },
  { id: 'core', title: 'Главные слова', badge: '🌟', description: 'Базовые глаголы, местоимения и полезные связки.' },
]

type WorldKeywordMap = Record<VocabularyWorldId, Set<string>>

const WORLD_KEYWORDS: WorldKeywordMap = {
  home: new Set([
    'family', 'mother', 'mum', 'father', 'dad', 'brother', 'sister', 'grandma', 'grandpa', 'baby', 'friend',
    'home', 'house', 'room', 'door', 'window', 'bed', 'floor', 'box', 'bag', 'kitchen', 'food', 'apple', 'pizza',
    'drink', 'water', 'coffee', 'tea', 'breakfast', 'dinner', 'dessert', 'meat', 'sweet', 'cat', 'dog', 'bird',
    'fish', 'horse', 'cow', 'pig', 'rabbit', 'fox', 'lion', 'tiger', 'body', 'head', 'eye', 'ear', 'nose', 'mouth',
    'tooth', 'teeth', 'hair', 'face', 'hand', 'arm', 'leg', 'foot', 'feet', 'finger', 'heart', 'health', 'doctor',
    'safe', 'dangerous', 'red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'pink', 'orange', 'purple',
    'grey', 'clean', 'dirty', 'hot', 'cold', 'happy', 'sad',
  ]),
  school: new Set([
    'school', 'student', 'teacher', 'class', 'lesson', 'homework', 'test', 'exam', 'grade', 'subject', 'math',
    'science', 'history', 'geography', 'language', 'english', 'russian', 'library', 'book', 'notebook', 'pen',
    'pencil', 'eraser', 'ruler', 'backpack', 'desk', 'chair', 'board', 'clock', 'watch', 'alarm', 'timer', 'time',
    'day', 'week', 'month', 'year', 'morning', 'afternoon', 'evening', 'night', 'hobby', 'game', 'play', 'movie',
    'film', 'story', 'quest', 'mission', 'challenge', 'puzzle', 'idea', 'creative', 'music', 'song', 'artist', 'band',
    'singer', 'melody', 'rhythm', 'laugh', 'smile', 'goal', 'plan', 'practice', 'train',
  ]),
  travel: new Set([
    'travel', 'trip', 'journey', 'vacation', 'holiday', 'tour', 'flight', 'airport', 'passport', 'visa', 'luggage',
    'baggage', 'suitcase', 'backpack', 'check', 'security', 'refund', 'exchange', 'currency', 'cash', 'card', 'receipt',
    'bill', 'car', 'vehicle', 'truck', 'bus', 'taxi', 'train', 'station', 'ticket', 'map', 'gps', 'north', 'south',
    'east', 'west', 'left', 'right', 'beach', 'coast', 'island', 'mountain', 'hill', 'valley', 'forest', 'desert',
    'river', 'lake', 'ocean', 'sea', 'weather', 'season', 'spring', 'summer', 'autumn', 'fall', 'winter', 'sky',
    'cloud', 'rain', 'snow', 'wind', 'storm', 'arrive', 'depart', 'leave', 'stay', 'move', 'road', 'bridge',
  ]),
  digital: new Set([
    'computer', 'laptop', 'tablet', 'phone', 'app', 'website', 'internet', 'online', 'search', 'google', 'youtube',
    'email', 'message', 'text', 'video', 'photo', 'picture', 'image', 'file', 'document', 'pdf', 'word', 'excel',
    'presentation', 'projector', 'technology', 'tech', 'gadget', 'device', 'machine', 'smartphone', 'keyboard',
    'mouse', 'monitor', 'screen', 'display', 'camera', 'webcam', 'microphone', 'speaker', 'headphone', 'charger',
    'cable', 'usb', 'wifi', 'bluetooth', 'gps', 'password', 'username', 'login', 'logout', 'share', 'send', 'receive',
    'upload', 'download', 'stream', 'buffer', 'lag', 'glitch', 'bug', 'error', 'fix', 'reset', 'restart', 'click',
    'tap', 'swipe', 'scroll', 'emoji', 'sticker', 'gif', 'meme',
  ]),
  core: new Set([
    'the', 'a', 'an', 'be', 'and', 'if', 'or', 'but', 'because', 'so', 'after', 'before', 'than', 'until', 'to',
    'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'into', 'through', 'over', 'inside', 'above', 'across',
    'between', 'near', 'except', 'despite', 'there', 'here', 'when', 'where', 'as', 'out', 'up', 'only', 'then',
    'how', 'why', 'already', 'yet', 'yesterday', 'tomorrow', 'today', 'tonight', 'back', 'still', 'too', 'down',
    'less', 'rather', 'also', 'well', 'soon', 'again', 'almost', 'always', 'sometimes', 'enough', 'ever', 'never',
    'really', 'very', 'once', 'all', 'that', 'i', 'any', 'it', 'he', 'you', 'this', 'my', 'him', 'your', 'some',
    'me', 'our', 'her', 'these', 'us', 'their', 'she', 'we', 'they', 'who', 'what', 'which', 'can', 'must', 'may',
    'have', 'do', 'say', 'get', 'make', 'go', 'know', 'take', 'see', 'come', 'think', 'look', 'want', 'give', 'use',
    'find', 'tell', 'ask', 'work', 'seem', 'feel', 'try', 'call', 'keep', 'let', 'begin', 'start', 'help', 'show',
    'hear', 'run', 'move', 'live', 'write', 'sit', 'stand', 'lose', 'pay', 'meet', 'learn', 'change', 'understand',
    'watch', 'follow', 'stop', 'speak', 'read', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'teach', 'remember',
    'buy', 'send', 'build', 'stay', 'fall', 'cut', 'reach', 'return', 'explain', 'develop', 'break', 'receive', 'eat',
    'cover', 'catch', 'draw', 'choose', 'wait', 'study', 'love', 'prepare', 'manage', 'visit', 'care', 'hold',
  ]),
}

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]+/g, '').trim()
}

export function tokenizeEnglish(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map(normalizeToken)
    .filter(Boolean)
}

export function inferWorlds(word: ParsedNecessaryWord): { primaryWorld: VocabularyWorldId; secondaryWorld?: VocabularyWorldId; tags: string[] } {
  const tokens = tokenizeEnglish(word.en)
  const tokenSet = new Set(tokens)
  const scores: Record<VocabularyWorldId, number> = {
    home: 0,
    school: 0,
    travel: 0,
    digital: 0,
    core: 0,
  }

  for (const worldId of Object.keys(WORLD_KEYWORDS) as VocabularyWorldId[]) {
    for (const token of tokenSet) {
      if (WORLD_KEYWORDS[worldId].has(token)) scores[worldId] += 1
    }
  }

  if (word.id >= 40 && word.id <= 220) scores.core += 1
  if (word.id >= 180 && word.id <= 220) scores.school += 1
  if (word.id >= 221 && word.id <= 299) scores.home += 1
  if (word.id >= 260 && word.id <= 299) scores.school += 1
  if (word.id >= 300 && word.id <= 419) scores.travel += 2
  if (word.id >= 420 && word.id <= 579) scores.home += 1
  if (word.id >= 820 && word.id <= 883) scores.digital += 2
  if (word.id >= 884) scores.core += 2

  const sorted = (Object.entries(scores) as Array<[VocabularyWorldId, number]>)
    .sort((left, right) => right[1] - left[1] || WORLD_PRIORITY.indexOf(left[0]) - WORLD_PRIORITY.indexOf(right[0]))

  const primary = sorted[0]?.[1] ? sorted[0][0] : 'core'
  const secondary = sorted[1]?.[1] ? sorted[1][0] : undefined

  const tags = Array.from(
    new Set(
      [primary, secondary, ...tokens.slice(0, 3)]
        .filter((value): value is string => Boolean(value))
    )
  )

  return { primaryWorld: primary, secondaryWorld: secondary, tags }
}

const WORLD_PRIORITY: VocabularyWorldId[] = ['home', 'school', 'travel', 'digital', 'core']

export function countActiveWordsByWorld(words: NecessaryWord[]): Record<VocabularyWorldId, number> {
  return words.reduce<Record<VocabularyWorldId, number>>(
    (acc, word) => {
      if (word.status !== 'active') return acc
      acc[word.primaryWorld] += 1
      return acc
    },
    { home: 0, school: 0, travel: 0, digital: 0, core: 0 }
  )
}
