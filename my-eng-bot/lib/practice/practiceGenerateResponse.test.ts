import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  buildFullReferenceFallbackSessionQuestions,
  composePracticeGenerationNotice,
  resolvePracticeQuestionsFromGenerateResponse,
  shouldPrebuildReferenceFallbackSession,
} from '@/lib/practice/practiceGenerateResponse'

describe('practiceGenerateResponse', () => {
  it('composes provider error with fallback notice', () => {
    const notice = composePracticeGenerationNotice({
      fallback: true,
      providerError: 'OpenAI недоступен из вашего региона (403 unsupported_country_region_territory).',
      fallbackNotice: 'ИИ не вернул валидное задание - запущен локальный эталон для отладки (7 одинаковых шагов).',
    })
    expect(notice).toContain('unsupported_country_region_territory')
    expect(notice).toContain('локальный эталон')
  })

  it('prebuilds seven reference fallback questions on first fallback step', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    expect(
      shouldPrebuildReferenceFallbackSession({ mode: 'reference', fallback: true, referenceStepIndex: 0 })
    ).toBe(true)
    expect(
      shouldPrebuildReferenceFallbackSession({ mode: 'reference', fallback: true, referenceStepIndex: 2 })
    ).toBe(false)

    const resolved = resolvePracticeQuestionsFromGenerateResponse(
      {
        questions: [{ id: 'q1' } as never],
        fallback: true,
        providerError: 'OpenAI недоступен из вашего региона.',
      },
      {
        mode: 'reference',
        lesson: lesson!,
        referenceExerciseType: 'choice',
        referenceTotal: 7,
        referenceStepIndex: 0,
        existingQuestions: [],
      }
    )
    expect('error' in resolved).toBe(false)
    if ('error' in resolved) return
    expect(resolved.useLocalGenerationSource).toBe(true)
    expect(resolved.questions).toHaveLength(7)
    expect(resolved.generationNotice).toContain('OpenAI недоступен')
  })

  it('builds seven local reference questions for choice type', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const questions = buildFullReferenceFallbackSessionQuestions(lesson!, 'choice', 7)
    expect(questions).toHaveLength(7)
    expect(questions.every((item) => item.type === 'choice')).toBe(true)
  })

  it('builds seven local reference questions for listening-select type', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const questions = buildFullReferenceFallbackSessionQuestions(lesson!, 'listening-select', 7)
    expect(questions).toHaveLength(7)
    expect(questions.every((item) => item.type === 'listening-select')).toBe(true)
    expect(questions.every((item) => !item.hint)).toBe(true)
    expect(questions.every((item) => (item.options?.length ?? 0) >= 3)).toBe(true)
  })
})
