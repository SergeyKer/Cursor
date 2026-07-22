import { describe, expect, it } from 'vitest'
import {
  parseReviewTopicTitle,
  resolveReviewChipTopic,
} from '@/lib/languageNote/resolveReviewChipTopic'

describe('parseReviewTopicTitle', () => {
  it('splits on em dash', () => {
    expect(parseReviewTopicTitle('over / on — предлоги места')).toEqual({
      topic: 'over / on',
      gloss: 'предлоги места',
    })
  })

  it('splits on hyphen and en dash', () => {
    expect(parseReviewTopicTitle('I am / I am from - знакомство').topic).toBe('I am / I am from')
    expect(parseReviewTopicTitle('Who ...? – вопросы').topic).toBe('Who ...?')
  })

  it('returns full title when no separator', () => {
    expect(parseReviewTopicTitle('Who likes music')).toEqual({
      topic: 'Who likes music',
      gloss: null,
    })
  })
})

describe('resolveReviewChipTopic', () => {
  it('maps I am to lesson 4', () => {
    const r = resolveReviewChipTopic({ chipTitle: 'I am / I am from — знакомство' })
    expect(r).toEqual({ kind: 'local', lessonId: '4', topic: 'I am / I am from', gloss: 'знакомство' })
  })

  it('maps It\'s time to lesson 1', () => {
    const r = resolveReviewChipTopic({ chipTitle: "It's / It's time to — пора" })
    expect(r.kind).toBe('local')
    if (r.kind === 'local') expect(r.lessonId).toBe('1')
  })

  it('maps Who to lesson 2', () => {
    const r = resolveReviewChipTopic({ chipTitle: 'Who ...? — кто' })
    expect(r.kind).toBe('local')
    if (r.kind === 'local') expect(r.lessonId).toBe('2')
  })

  it('maps embedded to lesson 3', () => {
    const r = resolveReviewChipTopic({ chipTitle: 'I know what she likes — встроенные вопросы' })
    expect(r.kind).toBe('local')
    if (r.kind === 'local') expect(r.lessonId).toBe('3')
  })

  it('generates for over / on', () => {
    const r = resolveReviewChipTopic({ chipTitle: 'over / on — предлоги места' })
    expect(r).toEqual({ kind: 'generate', topic: 'over / on', gloss: 'предлоги места' })
  })

  it('does not false-positive children + like as Who', () => {
    const r = resolveReviewChipTopic({ chipTitle: 'children + like — без -s' })
    expect(r.kind).toBe('generate')
  })

  it('ignores conflicting noteLessonId when allowlist matches', () => {
    const r = resolveReviewChipTopic({
      chipTitle: 'I am / I am from — знакомство',
      noteLessonId: '2',
    })
    expect(r.kind).toBe('local')
    if (r.kind === 'local') expect(r.lessonId).toBe('4')
  })
})
