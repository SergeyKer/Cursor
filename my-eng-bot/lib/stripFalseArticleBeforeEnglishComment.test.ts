import { describe, expect, it } from 'vitest'
import { stripFalseArticleBeforeEnglishComment } from './stripFalseArticleBeforeEnglishComment'

describe('stripFalseArticleBeforeEnglishComment', () => {
  it('removes misleading add the before English when repeat has study English without article', () => {
    const comment =
      'Тут нужно другое слово — "studi" неправильно, нужно "studied". Также нужно добавить "the" перед "English", чтобы было правильно.'
    const repeat = 'I studied English.'
    expect(stripFalseArticleBeforeEnglishComment(comment, repeat)).toBe(
      'Тут нужно другое слово — "studi" неправильно, нужно "studied".',
    )
  })

  it('does not strip when repeat includes the English (e.g. the English exam)', () => {
    const comment = 'Нужен артикль.'
    const repeat = 'I passed the English exam.'
    expect(stripFalseArticleBeforeEnglishComment(comment, repeat)).toBe(comment)
  })
})
