import { describe, expect, it } from 'vitest'
import { toSentencePuzzleCards } from '@/lib/sentencePuzzleWords'

describe('toSentencePuzzleCards', () => {
  it('omits trailing period for declarative sentences', () => {
    expect(toSentencePuzzleCards("I'm from Russia.")).toEqual(["I'm", 'from', 'Russia'])
  })

  it('keeps question mark as a separate tile', () => {
    expect(toSentencePuzzleCards('Who likes cats?')).toEqual(['Who', 'likes', 'cats', '?'])
  })

  it('keeps exclamation mark as a separate tile', () => {
    expect(toSentencePuzzleCards('I am happy!')).toEqual(['I', 'am', 'happy', '!'])
  })
})
