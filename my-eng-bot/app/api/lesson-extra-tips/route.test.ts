import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildFallbackLessonIntro } from '@/lib/lessonIntro'

const callProviderChatMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/callProviderChat', () => ({
  callProviderChat: callProviderChatMock,
}))

import { POST } from './route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/lesson-extra-tips', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const intro = buildFallbackLessonIntro('to be')

describe('POST /api/lesson-extra-tips', () => {
  beforeEach(() => {
    callProviderChatMock.mockReset()
  })

  it('returns normalized tips for a valid model payload', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({
        cards: [
          {
            category: 'native_speech',
            title: 'Как говорят носители',
            rule: 'В речи am часто сокращается.',
            examples: [
              { wrong: 'I am', right: "I'm", note: 'разговорно' },
              { wrong: 'They are', right: "They're", note: 'быстрая речь' },
            ],
          },
          {
            category: 'russian_traps',
            title: 'Ловушки для русскоговорящих',
            rule: 'Не ставь am перед обычным глаголом.',
            examples: [
              { wrong: 'I am agree', right: 'I agree', note: 'agree уже глагол' },
              { wrong: 'I am have', right: 'I have', note: 'have уже глагол' },
            ],
          },
          {
            category: 'questions_negatives',
            title: 'Вопросы и отрицания',
            rule: 'To be сам строит вопрос.',
            examples: [
              { right: 'Are you ready?', note: 'без do' },
              { right: "She isn't ready.", note: 'not после is' },
            ],
          },
          {
            category: 'emphasis_emotion',
            title: 'Эмфаза и эмоции',
            rule: 'Ударение усиливает смысл.',
            examples: [
              { right: 'I AM tired.', note: 'акцент' },
              { right: 'It IS important.', note: 'важность' },
            ],
          },
          {
            category: 'context_culture',
            title: 'Контекст и культура',
            rule: 'В письме лучше полная форма.',
            examples: [
              { wrong: "I'm writing", right: 'I am writing', note: 'формально' },
              { wrong: 'I am ok', right: "I'm ok", note: 'чат' },
            ],
          },
        ],
        quiz: [
          {
            id: 'q1',
            question: 'Как правильно?',
            options: ['I am agree', 'I agree'],
            correctAnswer: 'I agree',
            explanation: 'Agree уже глагол.',
          },
          {
            id: 'q2',
            question: 'Где сокращение уместнее?',
            options: ['В чате', 'В договоре'],
            correctAnswer: 'В чате',
            explanation: 'Чат обычно неформальный.',
          },
        ],
      }),
    })

    const res = await POST(makeRequest({ intro, provider: 'openai', audience: 'adult', mode: 'initial' }) as never)
    const data = (await res.json()) as { tips?: { cards: unknown[] }; generated: boolean; fallback: boolean }

    expect(res.status).toBe(200)
    expect(data.generated).toBe(true)
    expect(data.fallback).toBe(false)
    expect(data.tips?.cards).toHaveLength(5)

    const apiMessages = callProviderChatMock.mock.calls[0][0].apiMessages as Array<{ role: string; content: string }>
    expect(apiMessages[0].content).toContain('UX-копирайтер')
    expect(apiMessages[0].content).toContain('native_speech всегда привязывай к topic')

    const userPrompt = JSON.parse(apiMessages[1].content) as {
      topic: string
      requiredJsonShape: { cards: Array<{ category: string; rule: string; examples: Array<{ wrong: string; note: string }> }> }
    }
    const nativeSpeechShape = userPrompt.requiredJsonShape.cards[0]
    const russianTrapsShape = userPrompt.requiredJsonShape.cards[1]
    const questionsShape = userPrompt.requiredJsonShape.cards[2]
    const emphasisShape = userPrompt.requiredJsonShape.cards[3]
    const contextShape = userPrompt.requiredJsonShape.cards[4]
    expect(userPrompt.topic).toBe(intro.topic)
    expect(nativeSpeechShape.category).toBe('native_speech')
    expect(nativeSpeechShape.rule).toContain('Логика носителя')
    expect(nativeSpeechShape.examples[0].note).toContain('live substitution')
    expect(nativeSpeechShape.examples[1].note).toContain('practical move')
    expect(apiMessages[0].content).toContain('russian_traps пиши как методист')
    expect(russianTrapsShape.category).toBe('russian_traps')
    expect(russianTrapsShape.rule).toContain('Как переключить мышление')
    expect(russianTrapsShape.examples[0].note).toContain('Russian template')
    expect(russianTrapsShape.examples[1].wrong).toContain('mixed Russian-English phrase')
    expect(russianTrapsShape.examples[1].note).toContain('correct option')
    expect(apiMessages[0].content).toContain('Для questions_negatives пиши карточку "Где ошибаются"')
    expect(questionsShape.category).toBe('questions_negatives')
    expect(questionsShape.rule).toContain('Почему так выходит')
    expect(questionsShape.examples[0].wrong).toContain('✗')
    expect(questionsShape.examples[0].note).toContain('5-7 words')
    expect(apiMessages[0].content).toContain('Для emphasis_emotion пиши карточку "Сделай речь ярче"')
    expect(emphasisShape.category).toBe('emphasis_emotion')
    expect(emphasisShape.title).toBe('Сделай речь ярче')
    expect(emphasisShape.rule).toContain('Живые примеры')
    expect(emphasisShape.examples[0].note).toContain('booster')
    expect(apiMessages[0].content).toContain('Для context_culture пиши карточку "Контекст и стиль"')
    expect(contextShape.category).toBe('context_culture')
    expect(contextShape.title).toBe('Контекст и стиль')
    expect(contextShape.rule).toContain('Культурный нюанс')
    expect(contextShape.examples[0].note).toContain('situation')
  })

  it('returns fallback tips when the model payload is not readable JSON', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'not json',
    })

    const res = await POST(makeRequest({ intro, provider: 'openai', audience: 'adult', mode: 'initial' }) as never)
    const data = (await res.json()) as { tips?: { cards: unknown[] }; generated: boolean; fallback: boolean }

    expect(res.status).toBe(200)
    expect(data.generated).toBe(false)
    expect(data.fallback).toBe(true)
    expect(data.tips?.cards).toHaveLength(5)
  })

  it('rejects invalid lesson intro', async () => {
    const res = await POST(makeRequest({ intro: { topic: 'broken' } }) as never)
    const data = (await res.json()) as { error?: string }

    expect(res.status).toBe(400)
    expect(data.error).toContain('intro')
  })
})
