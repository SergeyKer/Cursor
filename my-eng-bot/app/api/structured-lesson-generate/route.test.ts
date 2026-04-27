import { beforeEach, describe, expect, it, vi } from 'vitest'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'

const callProviderChatMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/callProviderChat', () => ({
  callProviderChat: callProviderChatMock,
}))

import { POST } from './route'

const lesson1RecentVariantIds =
  itsTimeToLesson.repeatConfig?.variantProfiles?.filter((profile) => profile.id !== itsTimeToLesson.variantId).map((profile) => profile.id) ?? []

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/structured-lesson-generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function toModelSteps() {
  return itsTimeToLesson.steps.map((step) => ({
    stepNumber: step.stepNumber,
    bubbles: step.bubbles.map((bubble) => ({ ...bubble })),
    ...(step.exercise
      ? {
          exercise: {
            question: step.exercise.question,
            options: step.exercise.options,
            correctAnswer: step.exercise.correctAnswer,
            acceptedAnswers: step.exercise.acceptedAnswers,
            hint: step.exercise.hint,
          },
        }
      : {}),
    footerDynamic: step.footerDynamic,
  }))
}

describe('POST /api/structured-lesson-generate', () => {
  beforeEach(() => {
    callProviderChatMock.mockReset()
  })

  it('accepts a semantically valid structured lesson payload', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({ steps: toModelSteps() }),
    })

    const res = await POST(makeRequest({ lessonId: '1', recentVariantIds: lesson1RecentVariantIds }) as never)
    const data = (await res.json()) as { generated: boolean; fallback: boolean; lesson?: { runKey?: string } }

    expect(res.status).toBe(200)
    expect(data.generated).toBe(true)
    expect(data.fallback).toBe(false)
    expect(typeof data.lesson?.runKey).toBe('string')
  })

  it('falls back and audit-logs when semantic validation rejects the lesson', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const brokenSteps = toModelSteps()
    brokenSteps[4] = {
      ...brokenSteps[4],
      exercise: {
        ...brokenSteps[4].exercise!,
        hint: "Правильный ответ: It's time to go home.",
      },
    }
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({ steps: brokenSteps }),
    })

    const res = await POST(makeRequest({ lessonId: '1', recentVariantIds: lesson1RecentVariantIds }) as never)
    const data = (await res.json()) as { generated: boolean; fallback: boolean; lesson?: { runKey?: string } }

    expect(res.status).toBe(200)
    expect(data.generated).toBe(false)
    expect(data.fallback).toBe(true)
    expect(typeof data.lesson?.runKey).toBe('string')
    expect(warnSpy).toHaveBeenCalled()
    expect(warnSpy.mock.calls[0]?.[0]).toContain('hint_reveals_answer')

    warnSpy.mockRestore()
  })

  it('does not false-reject a normalized but natural variant', async () => {
    const steps = toModelSteps()
    steps[4] = {
      ...steps[4],
      exercise: {
        ...steps[4].exercise!,
        correctAnswer: 'It is time to go home.',
        acceptedAnswers: ['It is time to go home.'],
      },
    }
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({ steps }),
    })

    const res = await POST(makeRequest({ lessonId: '1', recentVariantIds: lesson1RecentVariantIds }) as never)
    const data = (await res.json()) as { generated: boolean; fallback: boolean }

    expect(res.status).toBe(200)
    expect(data.generated).toBe(true)
    expect(data.fallback).toBe(false)
  })

  it('falls back when payload exceeds CEFR lexical ceiling for A2', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const steps = toModelSteps()
    steps[4] = {
      ...steps[4],
      exercise: {
        ...steps[4].exercise!,
        correctAnswer: "It's time to discuss quarterly monetization strategy.",
        acceptedAnswers: ["It's time to discuss quarterly monetization strategy."],
      },
    }
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({ steps }),
    })

    const res = await POST(makeRequest({ lessonId: '1', audience: 'adult', recentVariantIds: lesson1RecentVariantIds }) as never)
    const data = (await res.json()) as { generated: boolean; fallback: boolean }

    expect(res.status).toBe(200)
    expect(data.generated).toBe(false)
    expect(data.fallback).toBe(true)
    expect(warnSpy).toHaveBeenCalled()
    expect(warnSpy.mock.calls[0]?.[0]).toContain('cefr_deny_word')

    warnSpy.mockRestore()
  })

  it('falls back when info bubble contains CEFR-blocked english fragment', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const steps = toModelSteps()
    steps[1] = {
      ...steps[1],
      bubbles: [
        steps[1].bubbles[0],
        { type: 'info', content: 'После time to пример такой: quarterly monetization strategy.' },
        steps[1].bubbles[2],
      ],
    }
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({ steps }),
    })

    const res = await POST(makeRequest({ lessonId: '1', audience: 'adult', recentVariantIds: lesson1RecentVariantIds }) as never)
    const data = (await res.json()) as { generated: boolean; fallback: boolean }

    expect(res.status).toBe(200)
    expect(data.generated).toBe(false)
    expect(data.fallback).toBe(true)
    expect(warnSpy).toHaveBeenCalled()
    expect(warnSpy.mock.calls[0]?.[0]).toContain('bubble_content')

    warnSpy.mockRestore()
  })
})
