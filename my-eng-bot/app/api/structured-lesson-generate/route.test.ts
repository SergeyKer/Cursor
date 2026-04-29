import { beforeEach, describe, expect, it, vi } from 'vitest'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import type { GeneratedStepPayload } from '@/lib/structuredLessonFactory'

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

function toModelSteps(): GeneratedStepPayload[] {
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
            puzzleVariants: step.exercise.puzzleVariants,
            bonusXp: step.exercise.bonusXp,
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
    brokenSteps[5] = {
      ...brokenSteps[5],
      exercise: {
        ...brokenSteps[5].exercise!,
        hint: `Правильный ответ: ${brokenSteps[5].exercise?.correctAnswer ?? ''}`,
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
    steps[5] = {
      ...steps[5],
      exercise: {
        ...steps[5].exercise!,
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

  it('deduplicates concurrent identical generation requests', async () => {
    callProviderChatMock.mockImplementationOnce(
      async () =>
        await new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, content: JSON.stringify({ steps: toModelSteps() }) }), 25)
        )
    )

    const [resA, resB] = await Promise.all([
      POST(makeRequest({ lessonId: '1', recentVariantIds: lesson1RecentVariantIds }) as never),
      POST(makeRequest({ lessonId: '1', recentVariantIds: lesson1RecentVariantIds }) as never),
    ])
    const dataA = (await resA.json()) as { generated: boolean; fallback: boolean }
    const dataB = (await resB.json()) as { generated: boolean; fallback: boolean }

    expect(resA.status).toBe(200)
    expect(resB.status).toBe(200)
    expect(dataA.generated).toBe(true)
    expect(dataB.generated).toBe(true)
    expect(callProviderChatMock).toHaveBeenCalledTimes(1)
  })

  it('falls back when payload exceeds CEFR lexical ceiling for A2', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const steps = toModelSteps()
    steps[5] = {
      ...steps[5],
      exercise: {
        ...steps[5].exercise!,
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
        steps[1].bubbles![0],
        { type: 'info', content: 'После time to пример такой: quarterly monetization strategy.' },
        steps[1].bubbles![2],
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
