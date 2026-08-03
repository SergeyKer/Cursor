import { describe, expect, it } from 'vitest'
import { shouldPinTutorFeedToTop } from '@/lib/tutor/shouldPinTutorFeedToTop'

describe('shouldPinTutorFeedToTop', () => {
  it('pins top before any explain', () => {
    expect(shouldPinTutorFeedToTop([{ text: 'q' }, { text: 'triage' }], null)).toBe(true)
    expect(shouldPinTutorFeedToTop([], null)).toBe(true)
  })

  it('pins top when first explain is still the last message', () => {
    expect(
      shouldPinTutorFeedToTop(
        [{ text: 'q' }, { text: 'chip' }, { text: 'answer', explain: { title: 't' } }],
        { title: 't' }
      )
    ).toBe(true)
  })

  it('pins top for direct user + explain', () => {
    expect(
      shouldPinTutorFeedToTop([{ text: 'q' }, { text: 'answer', explain: { title: 't' } }], {
        title: 't',
      })
    ).toBe(true)
  })

  it('follows tail after a user message past first explain', () => {
    expect(
      shouldPinTutorFeedToTop(
        [
          { text: 'q' },
          { text: 'answer', explain: { title: 't' } },
          { text: 'second q' },
        ],
        { title: 't' }
      )
    ).toBe(false)
  })

  it('follows tail during micro messages after explain', () => {
    expect(
      shouldPinTutorFeedToTop(
        [
          { text: 'q' },
          { text: 'answer', explain: { title: 't' } },
          { text: 'micro choice' },
          { text: 'ok' },
        ],
        { title: 't' }
      )
    ).toBe(false)
  })

  it('follows tail on second explain', () => {
    expect(
      shouldPinTutorFeedToTop(
        [
          { text: 'q1' },
          { text: 'a1', explain: { title: 't1' } },
          { text: 'q2' },
          { text: 'a2', explain: { title: 't2' } },
        ],
        { title: 't2' }
      )
    ).toBe(false)
  })

  it('follows tail after restore: lastExplain set, messages stripped of explain', () => {
    expect(
      shouldPinTutorFeedToTop(
        [
          { text: 'q' },
          { text: 'long answer without explain field' },
        ],
        { title: 'restored' }
      )
    ).toBe(false)
  })
})
