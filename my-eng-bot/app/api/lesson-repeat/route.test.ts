import { beforeEach, describe, expect, it, vi } from 'vitest'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import { whoLikesLesson } from '@/lib/lessons/who-likes'
import type { GeneratedStepPayload } from '@/lib/structuredLessonFactory'

const callProviderChatMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/callProviderChat', () => ({
  callProviderChat: callProviderChatMock,
}))

import { POST } from './route'

const lesson1RecentVariantIds =
  itsTimeToLesson.repeatConfig?.variantProfiles?.filter((profile) => profile.id !== itsTimeToLesson.variantId).map((profile) => profile.id) ?? []
const lesson2RecentVariantIds =
  whoLikesLesson.repeatConfig?.variantProfiles?.filter((profile) => profile.id !== whoLikesLesson.variantId).map((profile) => profile.id) ?? []

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/lesson-repeat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function toRepeatModelSteps(): GeneratedStepPayload[] {
  return itsTimeToLesson.steps
    .filter((step) => step.stepType !== 'completion')
    .map((step) => ({
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

function toWhoLikesRepeatSteps(): GeneratedStepPayload[] {
  return whoLikesLesson.steps
    .filter((step) => step.stepType !== 'completion')
    .map((step) => ({
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

describe('POST /api/lesson-repeat', () => {
  beforeEach(() => {
    callProviderChatMock.mockReset()
  })

  it('accepts a semantically valid repeat payload', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({ steps: toRepeatModelSteps() }),
    })

    const res = await POST(makeRequest({ lessonId: '1', recentVariantIds: lesson1RecentVariantIds }) as never)
    const data = (await res.json()) as { generated: boolean; fallback: boolean }

    expect(res.status).toBe(200)
    expect(data.generated).toBe(true)
    expect(data.fallback).toBe(false)
  })

  it('falls back and audit-logs when repeat payload drifts semantically', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const brokenSteps = toRepeatModelSteps()
    brokenSteps[0] = {
      ...brokenSteps[0],
      bubbles: [
        { type: 'positive', content: 'Сегодня говорим только про музыку.' },
        { type: 'info', content: 'Никаких состояний и времени действия.' },
        { type: 'task', content: 'Выберите что-то случайное.' },
      ],
      exercise: {
        question: 'Случайный вопрос',
        options: ['Blue', 'Green', 'Red'],
        correctAnswer: 'Blue',
        hint: 'Без связи с темой',
      },
    }

    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({ steps: brokenSteps }),
    })

    const res = await POST(makeRequest({ lessonId: '1', recentVariantIds: lesson1RecentVariantIds }) as never)
    const data = (await res.json()) as { generated: boolean; fallback: boolean }

    expect(res.status).toBe(200)
    expect(data.generated).toBe(false)
    expect(data.fallback).toBe(true)
    expect(warnSpy).toHaveBeenCalled()
    expect(warnSpy.mock.calls[0]?.[0]).toContain('missing_required_semantics')

    warnSpy.mockRestore()
  })

  it('deduplicates concurrent identical repeat requests', async () => {
    callProviderChatMock.mockImplementationOnce(
      async () =>
        await new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, content: JSON.stringify({ steps: toRepeatModelSteps() }) }), 25)
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

  it('falls back when correct english drifts into broken grammar', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const brokenSteps = toWhoLikesRepeatSteps()
    brokenSteps[5] = {
      ...brokenSteps[5],
      exercise: {
        ...brokenSteps[5].exercise!,
        correctAnswer: 'Who like music?',
        acceptedAnswers: ['Who like music?'],
      },
    }

    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({ steps: brokenSteps }),
    })

    const res = await POST(makeRequest({ lessonId: '2', recentVariantIds: lesson2RecentVariantIds }) as never)
    const data = (await res.json()) as { generated: boolean; fallback: boolean }

    expect(res.status).toBe(200)
    expect(data.generated).toBe(false)
    expect(data.fallback).toBe(true)
    expect(warnSpy).toHaveBeenCalled()
    expect(warnSpy.mock.calls[0]?.[0]).toContain('unnatural_english_answer')

    warnSpy.mockRestore()
  })

  it('falls back in child mode when repeat payload uses CEFR-blocked vocabulary', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const brokenSteps = toWhoLikesRepeatSteps()
    brokenSteps[4] = {
      ...brokenSteps[4],
      exercise: {
        ...brokenSteps[4].exercise!,
        correctAnswer: 'Who likes infrastructure? My brother likes infrastructure.',
        acceptedAnswers: ['Who likes infrastructure? My brother likes infrastructure.'],
      },
    }

    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({ steps: brokenSteps }),
    })

    const res = await POST(makeRequest({ lessonId: '2', audience: 'child', recentVariantIds: lesson2RecentVariantIds }) as never)
    const data = (await res.json()) as { generated: boolean; fallback: boolean }

    expect(res.status).toBe(200)
    expect(data.generated).toBe(false)
    expect(data.fallback).toBe(true)
    expect(warnSpy).toHaveBeenCalled()
    expect(warnSpy.mock.calls[0]?.[0]).toContain('cefr_deny_word')

    warnSpy.mockRestore()
  })

  it('falls back when footerDynamic contains CEFR-blocked english fragment', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const brokenSteps = toRepeatModelSteps()
    brokenSteps[4] = {
      ...brokenSteps[4],
      footerDynamic: 'Practice: quarterly monetization strategy',
    }

    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({ steps: brokenSteps }),
    })

    const res = await POST(makeRequest({ lessonId: '1', audience: 'adult', recentVariantIds: lesson1RecentVariantIds }) as never)
    const data = (await res.json()) as { generated: boolean; fallback: boolean }

    expect(res.status).toBe(200)
    expect(data.generated).toBe(false)
    expect(data.fallback).toBe(true)
    expect(warnSpy).toHaveBeenCalled()
    expect(warnSpy.mock.calls[0]?.[0]).toContain('footer_dynamic')

    warnSpy.mockRestore()
  })
})
