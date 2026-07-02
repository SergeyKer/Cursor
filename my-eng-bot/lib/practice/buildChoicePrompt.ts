import { lessonForPracticeStep, pickVariantProfileForStep } from '@/lib/practice/buildPracticeDiversity'
import type { Exercise, LessonData, LessonStep } from '@/types/lesson'

const ABSTRACT_CHOICE_QUESTION_PATTERNS = [
  /^какое предложение подходит/i,
  /^какой ответ подходит/i,
  /^какой вариант/i,
  /^выберите правильное предложение\.?$/i,
  /^выберите правильное/i,
  /^выберите правильную фразу\.?$/i,
  /^дополните предложение\.?$/i,
  /^pick one\.?$/i,
  /^choose the best/i,
] as const

const GENERIC_TASK_PATTERNS = [
  /^выберите правильное предложение\.?$/i,
  /^выберите правильный вариант\.?$/i,
  /^выберите правильную фразу\.?$/i,
] as const

const LESSON_CHOICE_FRAMES: Record<string, string> = {
  '1': 'Что описывает состояние, а не действие?',
  '2': 'Какой ответ подходит на вопрос с Who?',
  '3': 'Какая фраза звучит правильно во вложенном вопросе?',
  '4': 'Какой ответ про настроение?',
}

export function findLessonStepBubbleContent(step: LessonStep, type: 'task' | 'info'): string {
  for (let index = step.bubbles.length - 1; index >= 0; index -= 1) {
    const bubble = step.bubbles[index]
    if (bubble?.type === type && bubble.content.trim()) {
      return bubble.content.trim()
    }
  }
  return ''
}

export function isAbstractChoiceQuestion(question: string): boolean {
  const normalized = question.trim()
  if (!normalized) return true
  return ABSTRACT_CHOICE_QUESTION_PATTERNS.some((pattern) => pattern.test(normalized))
}

function isGenericTaskContent(task: string): boolean {
  const normalized = task.trim()
  if (!normalized) return true
  return GENERIC_TASK_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function extractSituationLabel(task: string): string | null {
  const situationMatch = task.match(/(?:ситуации|ситуация)\s*:?\s*"([^"]+)"/i)
  if (situationMatch?.[1]) {
    return `Ситуация: ${situationMatch[1].replace(/[.!?…]+$/u, '')}.`
  }
  const quotedMatch = task.match(/"([^"]{4,})"/)
  if (quotedMatch?.[1]) {
    return `Ситуация: ${quotedMatch[1].replace(/[.!?…]+$/u, '')}.`
  }
  return null
}

function mergeChoicePromptParts(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveChoiceFrame(lessonId: string, question: string): string {
  if (!isAbstractChoiceQuestion(question)) return question.trim()
  return LESSON_CHOICE_FRAMES[lessonId] ?? question.trim()
}

export function buildChoicePrompt(
  step: LessonStep,
  exercise: Exercise,
  lesson: Pick<LessonData, 'id' | 'topic'>
): string {
  const question = exercise.question?.trim() ?? ''
  const taskContent = findLessonStepBubbleContent(step, 'task')
  const situation = extractSituationLabel(taskContent)

  if (question && !isAbstractChoiceQuestion(question) && question.length >= 24) {
    return question
  }

  if (situation) {
    const frame = resolveChoiceFrame(lesson.id, question)
    return mergeChoicePromptParts([situation, frame])
  }

  if (taskContent && !isGenericTaskContent(taskContent)) {
    if (question && !isAbstractChoiceQuestion(question)) {
      return mergeChoicePromptParts([taskContent, question])
    }
    return taskContent
  }

  if (question && !isAbstractChoiceQuestion(question)) {
    return question
  }

  const frame = resolveChoiceFrame(lesson.id, question)
  if (frame) {
    return mergeChoicePromptParts([`Тема: ${lesson.topic}.`, frame])
  }

  if (taskContent) return taskContent
  if (question) return question
  return 'Ответьте по теме урока.'
}

export function choicePromptHasContext(prompt: string): boolean {
  const normalized = prompt.trim()
  if (!normalized) return false
  if (!/[А-Яа-яЁё]/.test(normalized)) return false
  if (isAbstractChoiceQuestion(normalized) && normalized.length < 36) return false
  return true
}

export function findFirstLessonChoiceStep(lesson: LessonData): { step: LessonStep; exercise: Exercise } | null {
  const match = lesson.steps.find((step) => {
    const exercise = step.exercise
    return exercise?.type === 'fill_choice' && Array.isArray(exercise.options) && exercise.options.length >= 2
  })
  if (!match?.exercise) return null
  return { step: match, exercise: match.exercise }
}

export function findLessonChoiceStepForPractice(
  lesson: LessonData,
  stepIndex = 0
): { step: LessonStep; exercise: Exercise; variantProfileId?: string } | null {
  const profile = pickVariantProfileForStep(lesson, stepIndex)
  const scopedLesson = profile ? lessonForPracticeStep(lesson, stepIndex) : lesson
  const source = findFirstLessonChoiceStep(scopedLesson)
  if (!source) return null
  return { ...source, variantProfileId: profile?.id }
}

export function buildEtalonChoicePromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonChoiceStepForPractice(lesson, stepIndex)
  if (!source) return null
  return buildChoicePrompt(source.step, source.exercise, lesson)
}
