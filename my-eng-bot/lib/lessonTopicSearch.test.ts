import { describe, expect, it } from 'vitest'
import { findPracticeTopicCandidatesByMenuKeys } from '@/lib/lessonTopicSearch'

describe('lessonTopicSearch', () => {
  it('matches embedded questions from russian wording', () => {
    const candidates = findPracticeTopicCandidatesByMenuKeys('вложенные вопросы', 'adult')

    expect(candidates[0]?.lessonId).toBe('3')
  })

  it('matches embedded questions regardless of audience', () => {
    const candidates = findPracticeTopicCandidatesByMenuKeys('вложенные', 'child')

    expect(candidates[0]?.lessonId).toBe('3')
  })

  it('matches who-question topic from mixed wording', () => {
    const candidates = findPracticeTopicCandidatesByMenuKeys('вопросы с who', 'adult')

    expect(candidates[0]?.lessonId).toBe('2')
  })

  it('returns empty list when no menu topic matches', () => {
    const candidates = findPracticeTopicCandidatesByMenuKeys('квантовая запутанность', 'adult')

    expect(candidates).toEqual([])
  })

  it('does not map broad grammar requests to random lesson', () => {
    const candidates = findPracticeTopicCandidatesByMenuKeys('present perfect', 'adult')

    expect(candidates).toEqual([])
  })

  it('does not map short tense fragment to random lesson', () => {
    const candidates = findPracticeTopicCandidatesByMenuKeys('is doing', 'adult')

    expect(candidates).toEqual([])
  })
})
