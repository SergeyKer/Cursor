const LESSON_SINGLE_WORD_RU_CUE_BY_ANSWER: Record<string, string> = {
  is: 'находится',
  are: 'находятся',
  lives: 'живет',
  live: 'живут',
  likes: 'нравится',
  like: 'нравится',
  wants: 'хочет',
  want: 'хотят',
  needs: 'нужно',
  need: 'нужно',
  works: 'работает',
  work: 'работают',
  starts: 'начинается',
  start: 'начинают',
  reads: 'читает',
  read: 'читает',
  drinks: 'пьет',
  drink: 'пить',
  plays: 'играет',
  play: 'играть',
  sleeps: 'спит',
  sleep: 'спать',
  studies: 'занимается',
  study: 'заниматься',
  rests: 'отдыхает',
  rest: 'отдыхать',
  cooks: 'готовит',
  cook: 'готовить',
  eats: 'ест',
  eat: 'есть',
  takes: 'берет',
  take: 'брать',
  goes: 'идет',
  go: 'идти',
  calls: 'звонит',
  call: 'звонить',
  opens: 'открывает',
  open: 'открыть',
}

export function getLessonSingleWordRuCue(correctAnswer: string | null | undefined): string | null {
  const key = (correctAnswer ?? '').trim().toLowerCase()
  if (!key) return null
  return LESSON_SINGLE_WORD_RU_CUE_BY_ANSWER[key] ?? null
}

