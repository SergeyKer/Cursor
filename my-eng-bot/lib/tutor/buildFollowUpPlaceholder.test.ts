import { describe, expect, it } from 'vitest'
import {
  buildTutorFollowUpChip,
  buildTutorFollowUpPlaceholder,
  compressSiblingToFollowUpHint,
  resolveFollowUpTopicKey,
  stripFollowUpPlaceholderPrefix,
  TUTOR_FOLLOW_UP_CHIP_MAX,
  TUTOR_FOLLOW_UP_PLACEHOLDER_MAX,
} from '@/lib/tutor/buildFollowUpPlaceholder'
import { getLocalFaqById } from '@/lib/tutor/localFaq'
import { routeTutorTurn } from '@/lib/tutor/tutorTurnRouter'
import type { TutorExplainAnswer } from '@/lib/tutor/types'
import {
  FOLLOW_UP_CHIP_BANK,
  FOLLOW_UP_CONTINUE_BANK,
  followUpPlaceholderPrefix,
} from '@/lib/uiCopy/tutorChat'

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

  it('strips Например prefix for chip submit', () => {
    expect(stripFollowUpPlaceholderPrefix('Например: А в отрицании?')).toBe('А в отрицании?')
    expect(stripFollowUpPlaceholderPrefix('А пример?')).toBe('А пример?')
  })
})

function isChipBankOrAngle(chip: string): boolean {
  return (
    chip === FOLLOW_UP_CHIP_BANK.exit ||
    (FOLLOW_UP_CHIP_BANK.angles as readonly string[]).includes(chip)
  )
}

describe('buildTutorFollowUpChip', () => {
  it('have_got returns on-topic sibling or honest exit, not idle placeholder', () => {
    const chip = buildTutorFollowUpChip({
      answer: haveGotExplain,
      level: 'a1',
      audience: 'adult',
      excludeQuestionRu: 'Чем «I have a car» отличается от «I’ve got a car»?',
    })
    expect(chip).toBeTruthy()
    expect(chip!.length).toBeLessThanOrEqual(TUTOR_FOLLOW_UP_CHIP_MAX)
    expect(chip).not.toMatch(/^Например:/)
    expect(chip).not.toMatch(/Спроси/)
    // Full FAQ may switch; bank/angles must continue.
    if (isChipBankOrAngle(chip!)) {
      expect(routeTutorTurn({ query: chip!, lastExplain: haveGotExplain }).kind).toBe('continue')
    } else {
      expect(/have|got|Do you|Have you/i.test(chip!)).toBe(true)
    }
  })

  it('mine/my prefers possessive overlap or exit — not her/she-only popularity trap', () => {
    const mine = getLocalFaqById('a1.pronouns.058')!
    const answer: TutorExplainAnswer = {
      answerKind: 'contrast',
      title: mine.questionRu,
      paragraphs: ['x'],
      examplesEn: mine.enNeedles,
      topicAnchor: { title: 'pronouns', canonicalKey: 'pronouns' },
      cheatsheetVisibility: 'primary',
    }
    const chip = buildTutorFollowUpChip({
      answer,
      level: 'a1',
      excludeQuestionRu: mine.questionRu,
    })
    expect(chip).toBeTruthy()
    expect(chip).not.toMatch(/to she|to her/i)
    expect(
      chip === FOLLOW_UP_CHIP_BANK.exit ||
        /my|mine|its|it.?s|притяжат|I»|me»/i.test(chip!)
    ).toBe(true)
    if (isChipBankOrAngle(chip!)) {
      expect(routeTutorTurn({ query: chip!, lastExplain: answer }).kind).toBe('continue')
    }
  })

  it('phrasal get seed is not misleading А в вопросе?', () => {
    const seed = getLocalFaqById('b1.phrasal_verbs.098')!
    const answer: TutorExplainAnswer = {
      answerKind: 'grammar',
      title: seed.questionRu,
      paragraphs: ['x'],
      examplesEn: seed.enNeedles,
      topicAnchor: { title: 'phrasal verbs', canonicalKey: 'phrasal_verbs' },
      cheatsheetVisibility: 'primary',
    }
    const chip = buildTutorFollowUpChip({
      answer,
      level: 'b1',
      excludeQuestionRu: seed.questionRu,
    })
    expect(chip).toBeTruthy()
    expect(chip).not.toBe('А в вопросе?')
    expect(chip).not.toBe('А в отрицании?')
    expect(
      chip === FOLLOW_UP_CHIP_BANK.exit || /get|up|wake|take|look|give|put|pick/i.test(chip!)
    ).toBe(true)
    if (isChipBankOrAngle(chip!)) {
      expect(routeTutorTurn({ query: chip!, lastExplain: answer }).kind).toBe('continue')
    }
  })

  it('unknown topic falls back to honest exit', () => {
    const chip = buildTutorFollowUpChip({
      answer: {
        ...haveGotExplain,
        topicAnchor: { title: 'x', canonicalKey: 'xyz_no_such_topic_abc' },
      },
      level: 'a1',
    })
    expect(chip).toBe(FOLLOW_UP_CHIP_BANK.exit)
  })

  it('returns null for translate', () => {
    expect(
      buildTutorFollowUpChip({
        answer: { ...haveGotExplain, answerKind: 'translate' },
        level: 'a1',
      })
    ).toBeNull()
  })

  it('chip bank phrases are continue-safe', () => {
    const phrases = [FOLLOW_UP_CHIP_BANK.exit, ...FOLLOW_UP_CHIP_BANK.angles]
    for (const phrase of phrases) {
      expect(routeTutorTurn({ query: phrase, lastExplain: haveGotExplain }).kind).toBe('continue')
    }
  })

  it('does not treat bare не as negation compress', () => {
    const entry = getLocalFaqById('a1.pronouns.058')!
    // «а не» in mine/my question must not force «А в отрицании?»
    const compressed = compressSiblingToFollowUpHint(entry)
    expect(compressed).not.toBe('А в отрицании?')
  })

  it('golden seeds: full FAQ or honest exit; misleading_bank = 0', () => {
    const seeds: Array<{
      id: string
      level: 'a1' | 'b1'
      kind: TutorExplainAnswer['answerKind']
      topicKey: string
      topicTitle: string
    }> = [
      {
        id: 'a1.have_got.093',
        level: 'a1',
        kind: 'contrast',
        topicKey: 'have_got',
        topicTitle: 'have / have got',
      },
      {
        id: 'a1.pronouns.058',
        level: 'a1',
        kind: 'contrast',
        topicKey: 'pronouns',
        topicTitle: 'pronouns',
      },
      {
        id: 'b1.phrasal_verbs.098',
        level: 'b1',
        kind: 'grammar',
        topicKey: 'phrasal_verbs',
        topicTitle: 'phrasal verbs',
      },
      {
        id: 'a1.present_simple.029',
        level: 'a1',
        kind: 'contrast',
        topicKey: 'present_simple',
        topicTitle: 'present simple',
      },
      {
        id: 'a1.articles.016',
        level: 'a1',
        kind: 'grammar',
        topicKey: 'articles',
        topicTitle: 'articles',
      },
    ]

    let misleadingBank = 0
    for (const s of seeds) {
      const entry = getLocalFaqById(s.id)
      expect(entry).toBeTruthy()
      const answer: TutorExplainAnswer = {
        answerKind: s.kind,
        title: entry!.questionRu,
        paragraphs: ['x'],
        examplesEn: entry!.enNeedles,
        topicAnchor: { title: s.topicTitle, canonicalKey: s.topicKey },
        cheatsheetVisibility: 'primary',
      }
      const chip = buildTutorFollowUpChip({
        answer,
        level: s.level,
        excludeQuestionRu: entry!.questionRu,
      })
      expect(chip).toBeTruthy()
      expect(chip).not.toMatch(/^Например:/)
      // Angles without thematic sibling = misleading for these dense topics
      if (chip === 'А в вопросе?' || chip === 'А в отрицании?') {
        misleadingBank += 1
      }
    }
    expect(misleadingBank).toBe(0)
  })
})
