import type { Audience } from '@/lib/types'
import type { LessonData } from '@/types/lesson'
import type { PracticeQuestion } from '@/types/practice'

const BOSS_MIN_WORDS = 4

function normalizeStrict(value: string): string {
  return value.trim().toLowerCase().replace(/[.,!?;:]/g, '')
}

function wordCount(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasWordBoundaryToken(input: string, token: string): boolean {
  const normalizedToken = token.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!normalizedToken) return false
  if (normalizedToken.includes(' ')) {
    return normalizeStrict(input).includes(normalizeStrict(normalizedToken))
  }
  return new RegExp(`\\b${escapeRegExp(normalizedToken)}\\b`, 'i').test(input)
}

function isThirdPersonVerb(token: string): boolean {
  const lower = token.toLowerCase()
  if (lower === 'is' || lower === 'has' || lower === 'does' || lower === 'goes') return true
  return /(?:ches|shes|sses|xes|zes|ies|[bcdfghjklmnpqrstvwxyz]es|[a-z]s)$/i.test(lower) && !lower.endsWith('ss')
}

function verbAfterTimeTo(input: string): string | null {
  const match = /\btime\s+to\s+([a-z']+)/i.exec(input)
  return match?.[1]?.toLowerCase() ?? null
}

function collectBlueprintMustInclude(lesson: LessonData, targetAnswer: string): string[] {
  const blueprints = lesson.repeatConfig?.stepBlueprints ?? []
  const step6 = blueprints.find((item) => item.stepNumber === 6) ?? blueprints[blueprints.length - 1]
  const mustInclude = step6?.semanticExpectations?.mustInclude ?? []
  const targetNorm = normalizeStrict(targetAnswer)
  return mustInclude
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item && targetNorm.includes(item.replace(/\s+/g, ' ')))
}

function resolveBossPatternFamily(targetAnswer: string, lessonId: string): 'time-to' | 'state' | 'who' | 'i-am' | 'embedded' | 'generic' {
  const normalized = targetAnswer.trim().toLowerCase()
  if (lessonId === '1' || /\btime\s+to\b/.test(normalized)) {
    return /\btime\s+to\b/.test(normalized) ? 'time-to' : 'state'
  }
  if (lessonId === '2' || (/\bwho\b/.test(normalized) && normalized.includes('?'))) return 'who'
  if (lessonId === '4' || /\b(i'?m|i am)\b/.test(normalized)) return 'i-am'
  if (lessonId === '3' || /\b(i know|tell me|do you know)\b/.test(normalized)) return 'embedded'
  return 'generic'
}

export function extractBossSituationKey(prompt: string): string {
  const situation = /(?:Ситуация|Тема)\s*:\s*([^.]*)/iu.exec(prompt)
  const key = (situation?.[1] ?? prompt).trim().toLowerCase().replace(/\s+/g, ' ')
  return key
}

export function resolveBossPatternAnchors(params: {
  lesson: LessonData
  targetAnswer: string
}): string[] {
  const fromBlueprint = collectBlueprintMustInclude(params.lesson, params.targetAnswer)
  if (fromBlueprint.length > 0) return fromBlueprint.slice(0, 4)

  const family = resolveBossPatternFamily(params.targetAnswer, params.lesson.id)
  if (family === 'time-to') return ['time to']
  if (family === 'state') return ["it's"]
  if (family === 'who') return ['who']
  if (family === 'i-am') return ['i am']
  if (family === 'embedded') return ['know', 'but']
  return []
}

function validateSeedLessonPattern(userInput: string, targetAnswer: string, lessonId: string): boolean | null {
  const family = resolveBossPatternFamily(targetAnswer, lessonId)
  const input = userInput.trim()

  if (family === 'time-to') {
    if (!/\btime\s+to\b/i.test(input)) return false
    const verb = verbAfterTimeTo(input)
    if (!verb) return false
    if (isThirdPersonVerb(verb) && verb !== 'is') return false
    return true
  }

  if (family === 'state') {
    return /\b(it'?s|it is|its)\s+[a-z]/i.test(input)
  }

  if (family === 'who') {
    if (targetAnswer.trim().endsWith('?') || /\bwho\b/i.test(targetAnswer)) {
      if (!/\bwho\b/i.test(input)) return false
      if (/\bwho\s+does\b/i.test(input)) return false
      return /\bwho\s+[a-z]+s\b/i.test(input) || /\bwho\s+(is|are|has)\b/i.test(input)
    }
    return /\b(?:likes?|drinks?|reads?|plays?)\b/i.test(input)
  }

  if (family === 'i-am') {
    return /\b(i'?m|i am)\b/i.test(input)
  }

  if (family === 'embedded') {
    if (/\bwhat\s+does\b/i.test(input) || /\bwhere\s+does\b/i.test(input) || /\bwhen\s+does\b/i.test(input)) {
      return false
    }
    const hasLead = /\b(i know|tell me|do you know)\b/i.test(input)
    const hasWh = /\b(what|where|when|who)\b/i.test(input)
    const hasBut = /\bbut\b/i.test(input)
    if (/\bbut\b/i.test(targetAnswer.toLowerCase())) {
      return hasLead && hasWh && hasBut
    }
    return hasLead && hasWh
  }

  return null
}

export function validateBossChallengeAnswer(
  userInput: string,
  question: PracticeQuestion,
  lesson: LessonData
): boolean {
  const input = userInput.trim()
  if (!input) return false
  if (/[а-яё]/iu.test(input)) return false

  const minWords = question.minWords ?? BOSS_MIN_WORDS
  if (wordCount(input) < minWords) return false

  const seed = validateSeedLessonPattern(input, question.targetAnswer, lesson.id)
  if (seed != null) return seed

  const required = collectBlueprintMustInclude(lesson, question.targetAnswer)
  if (required.length > 0) {
    return required.every((token) => hasWordBoundaryToken(input, token))
  }

  const anchors =
    question.keywords?.map((item) => item.trim().toLowerCase()).filter(Boolean) ??
    resolveBossPatternAnchors({ lesson, targetAnswer: question.targetAnswer })
  if (anchors.length === 0) return wordCount(input) >= minWords
  return anchors.some((anchor) => hasWordBoundaryToken(input, anchor))
}

export function getBossPatternHint(params: {
  lesson: LessonData
  targetAnswer: string
  audience?: Audience
}): string {
  const family = resolveBossPatternFamily(params.targetAnswer, params.lesson.id)
  const answer = params.targetAnswer.trim()
  const child = params.audience === 'child'

  if (family === 'time-to') {
    return child
      ? `Почти. Нужно: It's time to + глагол без -s. Образец: ${answer}`
      : `Почти. Нужно: It's time to + глагол без -s. Образец: ${answer}`
  }
  if (family === 'state') {
    return `Почти. Нужно: It's + состояние. Образец: ${answer}`
  }
  if (family === 'who') {
    return `Почти. Нужно: Who + глагол с -s. Образец: ${answer}`
  }
  if (family === 'i-am') {
    return `Почти. Нужно: I am …. Образец: ${answer}`
  }
  if (family === 'embedded') {
    return `Почти. Нужно: I know what … без do/does. Образец: ${answer}`
  }

  const mustInclude = collectBlueprintMustInclude(params.lesson, params.targetAnswer)
  if (mustInclude.length > 0) {
    return `Почти. Нужно: ${mustInclude.slice(0, 2).join(', ')}. Образец: ${answer}`
  }
  return `Почти. Образец: ${answer}`
}

export function resolveBossActionFrame(params: {
  lesson: LessonData
  targetAnswer: string
  audience?: Audience
}): string {
  const child = params.audience === 'child'
  const family = resolveBossPatternFamily(params.targetAnswer, params.lesson.id)

  if (family === 'time-to') {
    return child ? 'Напиши по-английски, что пора сделать.' : 'Напишите по-английски, что пора сделать.'
  }
  if (family === 'state') {
    return child ? 'Напиши по-английски, что сейчас происходит.' : 'Напишите по-английски, что сейчас происходит.'
  }
  if (family === 'who') {
    if (params.targetAnswer.trim().endsWith('?') || /\bwho\b/i.test(params.targetAnswer)) {
      return child ? 'Спроси по ситуации.' : 'Спросите по ситуации.'
    }
    return child ? 'Ответь коротко по ситуации.' : 'Ответьте коротко по ситуации.'
  }
  if (family === 'i-am') {
    return child ? 'Напиши о себе по ситуации.' : 'Напишите о себе по ситуации.'
  }
  if (family === 'embedded') {
    return child
      ? 'Напиши, что ты знаешь по ситуации.'
      : 'Напишите, что вы знаете по ситуации.'
  }
  return child
    ? 'Напиши по-английски своими словами по ситуации.'
    : 'Напишите по-английски своими словами по ситуации.'
}
