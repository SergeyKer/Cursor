import { describe, expect, it } from 'vitest'
import { isPendingAngleReply, routeTutorTurn } from '@/lib/tutor/tutorTurnRouter'
import type { TutorExplainAnswer } from '@/lib/tutor/types'

const ppExplain: TutorExplainAnswer = {
  answerKind: 'contrast',
  title: 'Present Perfect vs Past Simple',
  paragraphs: [
    'Present Perfect нужен, когда важен результат сейчас.',
    'Past Simple — когда есть точная дата в прошлом.',
  ],
  examplesEn: ['I have lost my keys.', 'I lost my keys yesterday.'],
  rememberRu: 'Есть результат сейчас → Perfect.',
  contrastPair: ['Present Perfect', 'Past Simple'],
  topicAnchor: {
    title: 'Present Perfect vs Past Simple',
    canonicalKey: 'pp_vs_ps',
  },
  cheatsheetVisibility: 'primary',
}

describe('routeTutorTurn', () => {
  it('returns first without lastExplain', () => {
    expect(routeTutorTurn({ query: 'Как сказать hello?', lastExplain: null }).kind).toBe('first')
  })

  it('stops smalltalk and off-topic with live topic', () => {
    expect(routeTutorTurn({ query: 'спасибо', lastExplain: ppExplain }).kind).toBe('stop')
    expect(routeTutorTurn({ query: 'кто президент США', lastExplain: ppExplain }).kind).toBe('stop')
  })

  it('continues deepeners', () => {
    expect(routeTutorTurn({ query: 'а в отрицании?', lastExplain: ppExplain }).kind).toBe('continue')
    expect(routeTutorTurn({ query: 'а пример', lastExplain: ppExplain }).kind).toBe('continue')
    expect(routeTutorTurn({ query: 'почему?', lastExplain: ppExplain }).kind).toBe('continue')
    expect(routeTutorTurn({ query: 'можно пример?', lastExplain: ppExplain }).kind).toBe('continue')
    expect(routeTutorTurn({ query: 'проверь: I have went', lastExplain: ppExplain }).kind).toBe(
      'continue'
    )
  })

  it('switches on new grammar (anti false-continue)', () => {
    expect(routeTutorTurn({ query: 'а зачем Do?', lastExplain: ppExplain }).kind).toBe('switch')
    expect(routeTutorTurn({ query: 'зачем Do в вопросе', lastExplain: ppExplain }).kind).toBe(
      'switch'
    )
    expect(routeTutorTurn({ query: 'а теперь артикли', lastExplain: ppExplain }).kind).toBe('switch')
    expect(routeTutorTurn({ query: 'глаголы', lastExplain: ppExplain }).kind).toBe('switch')
    expect(routeTutorTurn({ query: 'научи англицкому', lastExplain: ppExplain }).kind).toBe('switch')
  })
})

describe('isPendingAngleReply', () => {
  it('accepts short angle replies', () => {
    expect(isPendingAngleReply('когда ставить')).toBe(true)
    expect(isPendingAngleReply('пример')).toBe(true)
  })

  it('rejects explicit new intents', () => {
    expect(isPendingAngleReply('как сказать goat?')).toBe(false)
  })
})
