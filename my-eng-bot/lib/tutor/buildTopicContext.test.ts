import { describe, expect, it } from 'vitest'
import { buildTutorTopicContext } from '@/lib/tutor/buildTopicContext'
import type { TutorExplainAnswer } from '@/lib/tutor/types'

const answer: TutorExplainAnswer = {
  answerKind: 'grammar',
  title: 'Present Perfect',
  paragraphs: ['Правило.'],
  examplesEn: ['I have done it.'],
  rememberRu: 'Результат сейчас → Perfect.',
  topicAnchor: { title: 'Present Perfect', canonicalKey: 'pp' },
  cheatsheetVisibility: 'primary',
}

describe('buildTutorTopicContext', () => {
  it('keeps anchor and last two turns', () => {
    const ctx = buildTutorTopicContext({
      answer,
      thread: [
        { role: 'user', text: 'q1' },
        { role: 'assistant', text: 'a1' },
        { role: 'user', text: 'q2' },
        { role: 'assistant', text: 'a2' },
      ],
    })
    expect(ctx.anchor.canonicalKey).toBe('pp')
    expect(ctx.anchor.rememberRu).toContain('Perfect')
    expect(ctx.recentTurns).toEqual([
      { role: 'user', text: 'q2' },
      { role: 'assistant', text: 'a2' },
    ])
  })
})
