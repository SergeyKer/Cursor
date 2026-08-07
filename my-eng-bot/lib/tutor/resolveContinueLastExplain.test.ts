import { describe, expect, it } from 'vitest'
import { canOfferTutorMicro } from '@/lib/tutor/microEligible'
import {
  isWeakContinueAnswerKind,
  resolveContinueLastExplain,
  shouldRetainLastExplainOnDeepen,
} from '@/lib/tutor/resolveContinueLastExplain'
import type { TutorExplainAnswer } from '@/lib/tutor/types'

function explain(
  kind: TutorExplainAnswer['answerKind'],
  title = 'Topic'
): TutorExplainAnswer {
  return {
    answerKind: kind,
    title,
    paragraphs: ['x'],
    examplesEn: ['Hello.'],
    topicAnchor: { title, canonicalKey: 'topic' },
    cheatsheetVisibility: kind === 'grammar' || kind === 'contrast' || kind === 'form' ? 'primary' : 'hidden',
  }
}

describe('shouldRetainLastExplainOnDeepen', () => {
  it('keeps strong prev when next is how_to_say / translate / other', () => {
    const prev = explain('grammar', 'You')
    expect(shouldRetainLastExplainOnDeepen(prev, explain('how_to_say', 'Examples'))).toBe(true)
    expect(shouldRetainLastExplainOnDeepen(prev, explain('translate'))).toBe(true)
    expect(shouldRetainLastExplainOnDeepen(prev, explain('other'))).toBe(true)
    expect(shouldRetainLastExplainOnDeepen(explain('form'), explain('other'))).toBe(true)
    expect(shouldRetainLastExplainOnDeepen(explain('orthography'), explain('how_to_say'))).toBe(true)
  })

  it('does not keep when next is also strong', () => {
    expect(shouldRetainLastExplainOnDeepen(explain('grammar'), explain('contrast'))).toBe(false)
    expect(shouldRetainLastExplainOnDeepen(explain('contrast'), explain('grammar'))).toBe(false)
  })

  it('does not keep when prev is already weak', () => {
    expect(shouldRetainLastExplainOnDeepen(explain('how_to_say'), explain('other'))).toBe(false)
    expect(shouldRetainLastExplainOnDeepen(explain('translate'), explain('how_to_say'))).toBe(false)
  })
})

describe('resolveContinueLastExplain', () => {
  it('returns prev on grammar → how_to_say and preserves chip eligibility', () => {
    const prev = explain('grammar', 'You pronoun')
    const next = explain('how_to_say', 'More examples')
    const resolved = resolveContinueLastExplain(prev, next)
    expect(resolved).toBe(prev)
    expect(resolved.cheatsheetVisibility).toBe('primary')
    expect(canOfferTutorMicro(resolved, { llmEnabled: true })).toBe(true)
  })

  it('returns next on strong → strong', () => {
    const prev = explain('grammar')
    const next = explain('contrast', 'Negation')
    expect(resolveContinueLastExplain(prev, next)).toBe(next)
  })

  it('returns next on weak → weak (no fake strong)', () => {
    const prev = explain('how_to_say')
    const next = explain('other', 'More')
    expect(resolveContinueLastExplain(prev, next)).toBe(next)
    expect(canOfferTutorMicro(next, { llmEnabled: true })).toBe(false)
  })
})

describe('isWeakContinueAnswerKind', () => {
  it('flags satellite kinds only', () => {
    expect(isWeakContinueAnswerKind('how_to_say')).toBe(true)
    expect(isWeakContinueAnswerKind('translate')).toBe(true)
    expect(isWeakContinueAnswerKind('other')).toBe(true)
    expect(isWeakContinueAnswerKind('grammar')).toBe(false)
    expect(isWeakContinueAnswerKind('orthography')).toBe(false)
  })
})
