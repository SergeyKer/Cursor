import { describe, expect, it } from 'vitest'
import {
  practiceAnswersToQuickTestRecords,
  quickTestToPracticeSession,
} from '@/lib/practice/adapters/quickTestToPracticeSession'
import { shuffleOptionsDeterministic } from '@/lib/quickTest/shuffleOptions'
import { getQuickTestBankBySlug } from '@/lib/quickTest/catalog'

describe('quickTestToPracticeSession', () => {
  it('maps who-likes variant-1 to 5 choice questions with quick_test entry', () => {
    const result = quickTestToPracticeSession({ slug: 'who-likes', variantId: 'variant-1' })
    expect(result).not.toBeNull()
    expect(result!.session.entrySource).toBe('quick_test')
    expect(result!.session.questions).toHaveLength(5)
    expect(result!.session.instructionAcknowledged).toBe(true)
    expect(result!.session.mode).toBe('balanced')
    expect(result!.session.generationSource).toBe('local')
    expect(result!.metaByQuestionId.size).toBe(5)

    for (const question of result!.session.questions) {
      expect(question.type).toBe('choice')
      expect(question.options).toHaveLength(3)
      expect(question.acceptedAnswers).toEqual([question.targetAnswer])
      expect(question.hint).toBeUndefined()
      expect(question.explanation?.length).toBeGreaterThan(0)
      const meta = result!.metaByQuestionId.get(question.id)
      expect(meta?.explanationRu).toBe(question.explanation)
      expect(meta?.mistakeTag).toBeTruthy()
    }
  })

  it('uses deterministic shuffle matching SSR seed', () => {
    const bank = getQuickTestBankBySlug('who-likes')!
    const raw = bank.variants[0]!.questions[0]!
    const result = quickTestToPracticeSession({ slug: 'who-likes', variantId: 'variant-1' })!
    const mapped = result.session.questions[0]!
    const expected = shuffleOptionsDeterministic(raw.options, raw.correctIndex, `variant-1:${raw.id}`)
    expect(mapped.options).toEqual([...expected.options])
    expect(mapped.targetAnswer).toBe(expected.options[expected.correctIndex])
  })

  it('returns null for unknown slug', () => {
    expect(quickTestToPracticeSession({ slug: 'no-such', variantId: 'variant-1' })).toBeNull()
  })

  it('maps practice answers to quick-test records via side-map', () => {
    const result = quickTestToPracticeSession({ slug: 'who-likes', variantId: 'variant-1' })!
    const q = result.session.questions[0]!
    const records = practiceAnswersToQuickTestRecords(
      [
        {
          questionId: q.id,
          userAnswer: q.targetAnswer,
          correctAnswer: q.targetAnswer,
          isCorrect: true,
          corrected: false,
          xpEarned: 10,
          responseTimeMs: 100,
          timestamp: 1,
        },
      ],
      result.metaByQuestionId
    )
    expect(records[0]).toMatchObject({
      questionId: q.id,
      correct: true,
      mistakeTag: result.metaByQuestionId.get(q.id)!.mistakeTag,
    })
  })
})
