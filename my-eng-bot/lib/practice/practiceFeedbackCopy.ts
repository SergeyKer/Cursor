import { getBossPatternHint } from '@/lib/practice/bossChallengeAnswerValidation'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { Audience } from '@/lib/types'
import type { PracticeQuestion } from '@/types/practice'

export function buildBossPrimarySuccessFeedback(params: { audience?: Audience }): string {
  return params.audience === 'child' ? 'Засчитано. Молодец!' : 'Засчитано. Хороший ответ.'
}

const PRACTICE_WRONG_LIMIT_ENCOURAGEMENTS_ADULT = [
  (answer: string) =>
    `Третья попытка - не вышло, но ты уже видел правильный вариант: ${answer}. На следующем шаге этот паттерн поймается легче.`,
  (answer: string) =>
    `Снова мимо, зато ты не сдаёшься. Верный ответ: ${answer}. Дальше закрепим на похожем задании - там получится.`,
  (answer: string) =>
    `Здесь коварный момент - с тремя попытками разобрались. Правильно: ${answer}. Следующий шаг - твой шанс сделать лучше.`,
  (answer: string) =>
    `Не сложилось сейчас, но правильный ответ уже на столе: ${answer}. На следующем задании сработает увереннее.`,
  (answer: string) =>
    `Три раза подряд - бывает на сложных местах. Запомни: ${answer}. Впереди похожая задача, там точно выйдет.`,
  (answer: string) =>
    `Этот паттерн пока не поймался - ничего страшного. Правильный вариант: ${answer}. Следующий шаг закрепим спокойнее.`,
] as const

const PRACTICE_WRONG_LIMIT_ENCOURAGEMENTS_CHILD = [
  (answer: string) =>
    `Три раза не вышло - ничего страшного. Правильно: ${answer}. На следующем шаге точно получится лучше.`,
  (answer: string) =>
    `Снова мимо, но ты стараешься - это круто. Верный ответ: ${answer}. Дальше будет проще.`,
  (answer: string) =>
    `Здесь сложно - с тремя попытками разобрались. Правильно: ${answer}. На следующем задании поймаешь этот паттерн.`,
  (answer: string) =>
    `Не получилось сейчас, зато ты уже знаешь ответ: ${answer}. Следующий шаг - твой шанс сделать лучше.`,
  (answer: string) =>
    `Три попытки - нормально. Запомни: ${answer}. Впереди похожая задача, там выйдет.`,
  (answer: string) =>
    `Этот момент пока не поймался. Правильный вариант: ${answer}. Дальше закрепим - и будет легче.`,
] as const

function pickFromEncouragementPool<T>(pool: readonly T[], seed: string): T {
  if (pool.length === 0) {
    throw new Error('Encouragement pool must not be empty')
  }
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return pool[hash % pool.length] ?? pool[0]!
}

export function buildPracticeWrongLimitEncouragement(params: {
  correctAnswer: string
  audience?: Audience
  seed: string
}): string {
  const answer = params.correctAnswer.trim()
  const pool =
    params.audience === 'child'
      ? PRACTICE_WRONG_LIMIT_ENCOURAGEMENTS_CHILD
      : PRACTICE_WRONG_LIMIT_ENCOURAGEMENTS_ADULT
  const template = pickFromEncouragementPool(pool, params.seed)
  return template(answer)
}

export function buildPracticeWrongAnswerFeedback(params: {
  correctAnswer: string
  attemptNumber: 1 | 2
  audience?: Audience
  question?: PracticeQuestion
}): string {
  const answer = params.correctAnswer.trim()
  if (params.question?.type === 'boss-challenge') {
    const lesson = getStructuredLessonById(params.question.lessonId)
    if (lesson) {
      return getBossPatternHint({
        lesson,
        targetAnswer: answer,
        audience: params.audience,
      })
    }
    return `Почти. Образец: ${answer}`
  }
  if (params.attemptNumber === 1) {
    return `Неверно. Правильно: ${answer}`
  }
  const retryLead = params.audience === 'child' ? 'Давай ещё раз' : 'Попробуйте ещё раз'
  return `Неверно. ${retryLead}: ${answer}`
}
