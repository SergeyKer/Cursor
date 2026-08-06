import { describe, expect, it } from 'vitest'
import {
  buildTutorFollowUpPlaceholder,
  compressSiblingToFollowUpHint,
  resolveFollowUpTopicKey,
  TUTOR_FOLLOW_UP_PLACEHOLDER_MAX,
} from '@/lib/tutor/buildFollowUpPlaceholder'
import { getLocalFaqById } from '@/lib/tutor/localFaq'
import { routeTutorTurn } from '@/lib/tutor/tutorTurnRouter'
import type { TutorExplainAnswer } from '@/lib/tutor/types'
import { FOLLOW_UP_CONTINUE_BANK, followUpPlaceholderPrefix } from '@/lib/uiCopy/tutorChat'

const haveGotExplain: TutorExplainAnswer = {
  answerKind: 'contrast',
  title: 'Чем I have отличается от I’ve got',
  paragraphs: ['В британском часто I’ve got.'],
  examplesEn: ['I have a car.', "I've got a car."],
  rememberRu: 'Have и have got — про одно.',
  contrastPair: ['I have a car', "I've got a car"],
  topicAnchor: {
    title: 'have / have got',
    canonicalKey: 'have_got',
  },
  cheatsheetVisibility: 'primary',
}

describe('resolveFollowUpTopicKey', () => {
  it('returns exact known canonicalKey', () => {
    expect(resolveFollowUpTopicKey(haveGotExplain)).toBe('have_got')
  })

  it('finds known key inside LLM-like slug', () => {
    expect(
      resolveFollowUpTopicKey({
        ...haveGotExplain,
        topicAnchor: { title: 'x', canonicalKey: 'i_have_vs_ive_got_have_got_car' },
      })
    ).toBe('have_got')
  })
})

describe('compressSiblingToFollowUpHint', () => {
  it('compresses question-form sibling', () => {
    const entry = getLocalFaqById('a1.have_got.094')
    expect(entry).toBeTruthy()
    expect(compressSiblingToFollowUpHint(entry!)).toBe('А в вопросе?')
  })

  it('compresses she has got sibling to short EN or angle', () => {
    const entry = getLocalFaqById('a1.have_got.095')
    expect(entry).toBeTruthy()
    const hint = compressSiblingToFollowUpHint(entry!)
    expect(hint).toBeTruthy()
    expect(hint!.length).toBeLessThanOrEqual(TUTOR_FOLLOW_UP_PLACEHOLDER_MAX)
  })
})

describe('buildTutorFollowUpPlaceholder', () => {
  it('returns themed hint for have_got, not idle', () => {
    const hint = buildTutorFollowUpPlaceholder({
      answer: haveGotExplain,
      level: 'a1',
      audience: 'adult',
      excludeQuestionRu: 'Чем «I have a car» отличается от «I’ve got a car»?',
    })
    expect(hint).toBeTruthy()
    expect(hint).not.toMatch(/Спросите/)
    expect(hint!.length).toBeLessThanOrEqual(TUTOR_FOLLOW_UP_PLACEHOLDER_MAX)
    expect(hint).toMatch(/Например:|А в |А «/)
  })

  it('falls back to kind bank when topicKey unknown', () => {
    const hint = buildTutorFollowUpPlaceholder({
      answer: {
        ...haveGotExplain,
        answerKind: 'grammar',
        topicAnchor: { title: 'Weird', canonicalKey: 'xyz_no_such_topic_abc' },
      },
      level: 'a1',
      seed: 0,
    })
    expect(hint).toBeTruthy()
    expect(hint).toContain(FOLLOW_UP_CONTINUE_BANK.grammar[0]!)
  })

  it('returns null for translate', () => {
    expect(
      buildTutorFollowUpPlaceholder({
        answer: {
          ...haveGotExplain,
          answerKind: 'translate',
          topicAnchor: { title: 't', canonicalKey: 'xyz_no_such_topic_abc' },
        },
        level: 'a1',
      })
    ).toBeNull()
  })

  it('excludes current FAQ question from sibling', () => {
    const hint = buildTutorFollowUpPlaceholder({
      answer: haveGotExplain,
      level: 'a1',
      excludeQuestionRu: 'Чем «I have a car» отличается от «I’ve got a car»?',
      seed: 1,
    })
    expect(hint).toBeTruthy()
    expect(hint).not.toContain('I have a car')
  })
})

describe('FOLLOW_UP_CONTINUE_BANK continue-safe', () => {
  it('every bank phrase routes as continue with live topic', () => {
    const phrases = Object.values(FOLLOW_UP_CONTINUE_BANK).flat()
    expect(phrases.length).toBeGreaterThan(0)
    for (const phrase of phrases) {
      expect(routeTutorTurn({ query: phrase, lastExplain: haveGotExplain }).kind).toBe('continue')
    }
  })

  it('prefix is stable', () => {
    expect(followUpPlaceholderPrefix('adult')).toBe('Например: ')
    expect(followUpPlaceholderPrefix('child')).toBe('Например: ')
  })
})
