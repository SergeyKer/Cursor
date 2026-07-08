import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import {
  isRoleplayAnswerSemanticallyAligned,
  isYesNoScaffoldInterlocutor,
  parseInterlocutorFromPrompt,
  parseRoleIntroFromPrompt,
  resolveLesson2AnswerSubjectEn,
  resolveLessonRoleplayProfile,
  resolveRoleplayTargetAnswer,
} from '@/lib/practice/prompt/roleplayPromptEngine'
import type { LessonData } from '@/types/lesson'
import type { PracticeQuestion } from '@/types/practice'

function normalizeStrict(value: string): string {
  return value.trim().toLowerCase().replace(/[.,!?;:]/g, '')
}

function wordCount(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function isChallengeAnchorQuestion(question: PracticeQuestion): boolean {
  return (
    question.type === 'roleplay-mini' &&
    (question.hint?.includes('Нужна та же фраза') ?? false)
  )
}

function patternChecksForAnswer(targetAnswer: string, lesson: LessonData): RegExp[] {
  const normalized = resolveRoleplayTargetAnswer(targetAnswer, lesson.id).trim().toLowerCase()
  const lessonId = lesson.id

  if (lessonId === '1') {
    if (/\btime\s+to\b/.test(normalized)) {
      return [/\b(it'?s|it is)\b/i, /\btime\s+to\b/i]
    }
    return [/\b(it'?s|it is)\s+[a-z]/i]
  }
  if (lessonId === '2') {
    if (normalized.includes('who') && normalized.includes('?')) {
      return [/\bwho\b/i, /\b[a-z]+s\b/i]
    }
    return [/\b[a-z]+\b/i, /\b(?:likes?|drinks?|reads?|plays?)\b/i]
  }
  if (lessonId === '3') {
    return [/\b(tell|know|say|do)\b/i, /\b(what|where|when|how)\b/i]
  }
  if (lessonId === '4') {
    return [/\b(i'?m|i am)\b/i]
  }
  return []
}

function mustIncludeTokens(question: PracticeQuestion, lesson: LessonData): string[] {
  const profile = resolveLessonRoleplayProfile(lesson)
  const targetNorm = normalizeStrict(question.targetAnswer)
  const fromBlueprint = (profile.stepBlueprint?.semanticExpectations?.mustInclude ?? [])
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item && targetNorm.includes(item.replace(/\s+/g, ' ')))
  const keywords = question.keywords?.map((item) => item.trim().toLowerCase()).filter(Boolean) ?? []
  return Array.from(new Set([...fromBlueprint, ...keywords]))
}

function buildAnswerCandidates(question: PracticeQuestion): string[] {
  const interlocutor = question.prompt ? parseInterlocutorFromPrompt(question.prompt) : null
  const base = [question.targetAnswer, ...question.acceptedAnswers]
    .map((item) => item.trim())
    .filter(Boolean)

  if (!interlocutor || !isYesNoScaffoldInterlocutor(interlocutor)) {
    return base
  }

  const target = question.targetAnswer.trim().replace(/[.!?…]+$/u, '')
  const yesVariant = `Yes, ${target}.`
  return Array.from(new Set([...base, yesVariant]))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isLesson2AnswerSubjectAligned(userInput: string, targetAnswer: string): boolean {
  const subject = resolveLesson2AnswerSubjectEn(targetAnswer)
  if (!subject) return true

  const inputLower = userInput.trim().toLowerCase()
  const subjectPattern = new RegExp(`\\b${escapeRegExp(subject)}\\b`, 'iu')
  return subjectPattern.test(inputLower)
}

export function validateRoleplayAnswer(
  userInput: string,
  question: PracticeQuestion,
  lesson: LessonData
): boolean {
  const candidates = buildAnswerCandidates(question)

  const normalizedInput = normalizeEnglishForLearnerAnswerMatch(userInput, 'translation')
  const exactMatch = candidates.some(
    (candidate) => normalizeEnglishForLearnerAnswerMatch(candidate, 'translation') === normalizedInput
  )
  if (exactMatch) return true

  if (isChallengeAnchorQuestion(question)) return false

  if (lesson.id === '2' && !isLesson2AnswerSubjectAligned(userInput, question.targetAnswer)) {
    return false
  }

  const minWords = question.minWords ?? 2
  if (wordCount(userInput) < minWords) return false

  if (/[а-яё]/iu.test(userInput)) return false

  const targetIsDeclarative = !question.targetAnswer.trim().endsWith('?')
  if (targetIsDeclarative && userInput.trim().endsWith('?')) return false

  const patterns = patternChecksForAnswer(question.targetAnswer, lesson)
  if (patterns.length > 0 && !patterns.every((pattern) => pattern.test(userInput))) {
    return false
  }

  const intro = question.prompt ? parseRoleIntroFromPrompt(question.prompt) : null
  const interlocutor = question.prompt ? parseInterlocutorFromPrompt(question.prompt) : null
  if (intro && interlocutor) {
    if (
      !isRoleplayAnswerSemanticallyAligned({
        userInput,
        roleIntro: intro,
        targetAnswer: question.targetAnswer,
      })
    ) {
      return false
    }
  }

  const required = mustIncludeTokens(question, lesson)
  if (required.length === 0) return true

  const normalizedStrictInput = normalizeStrict(userInput)
  return required.every((token) => {
    const normalizedToken = normalizeStrict(token)
    if (normalizedToken.includes(' ')) {
      return normalizedStrictInput.includes(normalizedToken.replace(/\s+/g, ' '))
    }
    return normalizedStrictInput.includes(normalizedToken)
  })
}
