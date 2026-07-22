import { describe, expect, it } from 'vitest'
import { embeddedQuestionsLesson } from '@/lib/lessons/embedded-questions'
import { introducingYourselfLesson } from '@/lib/lessons/introducing-yourself'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import { whoLikesLesson } from '@/lib/lessons/who-likes'
import { getLearningLessonById } from '@/lib/learningLessons'
import { buildLessonPageTitle } from '@/lib/lessonPageTitle'

const STRUCTURED_LESSONS = [itsTimeToLesson, whoLikesLesson, embeddedQuestionsLesson, introducingYourselfLesson]

const WATCHED_LABELS = new Set([
  'Урок',
  'Теория',
  'Правило',
  'Примеры',
  'Коротко',
  'Шаблоны',
  'Практика',
  'Пазл',
  'Проверка',
  'Карточка',
  'Hook',
  'Theory',
  'Practice',
])

function collectColonSpacingViolations(text: string, source: string): string[] {
  const violations: string[] = []
  for (const label of WATCHED_LABELS) {
    const inlineRe = new RegExp(`(?:^|[\\s"'(\`])${label}:(?![ \\n\\r/])`, 'g')
    if (inlineRe.test(text)) {
      violations.push(`${source}: "${label}:" без пробела после двоеточия`)
    }
    const markdownRe = new RegExp(`\\*\\*${label}:\\*\\*(?![ \\n])`, 'g')
    if (markdownRe.test(text)) {
      violations.push(`${source}: "**${label}:**" без пробела после двоеточия`)
    }
  }
  return violations
}

function collectStrings(value: unknown, path: string, bucket: Array<{ source: string; text: string }>): void {
  if (typeof value === 'string') {
    bucket.push({ source: path, text: value })
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, bucket))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      collectStrings(nested, `${path}.${key}`, bucket)
    }
  }
}

describe('lesson colon spacing', () => {
  it('keeps a visible space after Фишки prefix in tips page titles', () => {
    const view = buildLessonPageTitle({
      stage: 'tips',
      topicTitle: 'I am / I am from',
    })

    expect(view.fullTitle).toBe('Фишки: I am / I am from')
    expect(view.fullTitle).toMatch(/^Фишки:\s+\S/)
  })

  it('uses a space after colon in all learning lesson texts', () => {
    const violations: string[] = []
    for (const lessonId of ['1', '2', '3', '4']) {
      const lesson = getLearningLessonById(lessonId)
      expect(lesson).toBeTruthy()
      const strings: Array<{ source: string; text: string }> = []
      collectStrings(lesson, `learningLessons.${lessonId}`, strings)
      for (const item of strings) {
        violations.push(...collectColonSpacingViolations(item.text, item.source))
      }
    }
    expect(violations).toEqual([])
  })

  it('uses a space after colon in all structured lesson texts', () => {
    const violations: string[] = []
    for (const lesson of STRUCTURED_LESSONS) {
      const strings: Array<{ source: string; text: string }> = []
      collectStrings(lesson, lesson.id, strings)
      for (const item of strings) {
        violations.push(...collectColonSpacingViolations(item.text, item.source))
      }
    }
    expect(violations).toEqual([])
  })
})
