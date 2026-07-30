import { describe, expect, it } from 'vitest'
import { localTutorTriage, resolvePendingTriageFollowUp } from '@/lib/tutor/localTriage'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'

describe('localTutorTriage', () => {
  it('routes clear questions to A', () => {
    expect(localTutorTriage('Зачем Present Perfect, если есть Past Simple?').kind).toBe('A')
  })

  it('routes Cyrillic contrast / why questions without ? to A', () => {
    expect(localTutorTriage('Почему I have a car и I have got a car').kind).toBe('A')
    expect(localTutorTriage('Разница между I have a car и I have got a car').kind).toBe('A')
    expect(localTutorTriage('Зачем Present Perfect').kind).toBe('A')
    expect(localTutorTriage('В чём разница have и have got').kind).toBe('A')
  })

  it('routes translate / how_to_say to A before broad C', () => {
    expect(localTutorTriage('Как сказать «я уже сделал»?').kind).toBe('A')
    expect(localTutorTriage('Переведи: я люблю плавать').kind).toBe('A')
  })

  it('routes narrow topic labels to B chips', () => {
    const r = localTutorTriage('Present Perfect')
    expect(r.kind).toBe('B')
    if (r.kind === 'B') expect(r.chips.length).toBeGreaterThan(0)
    expect(localTutorTriage('have got').kind).toBe('B')
  })

  it('routes bare interrogatives to C, not empty Explain', () => {
    expect(localTutorTriage('почему').kind).toBe('C')
    expect(localTutorTriage('когда').kind).toBe('C')
  })

  it('routes bare word to C intent chips', () => {
    const r = localTutorTriage('cars')
    expect(r.kind).toBe('C')
  })

  it('routes short EN tokens to C, not noise D', () => {
    expect(localTutorTriage('do').kind).toBe('C')
    expect(localTutorTriage('go').kind).toBe('C')
    expect(localTutorTriage('a').kind).toBe('C')
    expect(localTutorTriage('I').kind).toBe('C')
  })

  it('routes noise to D', () => {
    const r = localTutorTriage('???')
    expect(r.kind).toBe('D')
    if (r.kind === 'D') expect(r.clarifyPromptRu).toBe(TUTOR_CHAT_COPY.clarifyDefault)
  })

  it('routes meta teach to C with meta chips', () => {
    const r = localTutorTriage('научи англицкому')
    expect(r.kind).toBe('C')
    if (r.kind === 'C') {
      expect(r.chips.some((c) => c.labelRu === 'Слово')).toBe(true)
      expect(r.chips.some((c) => c.labelRu === 'Что значит')).toBe(false)
    }
  })

  it('routes broad глаголы to C', () => {
    expect(localTutorTriage('глаголы').kind).toBe('C')
  })

  it('gates off-topic before A', () => {
    const r = localTutorTriage('кто президент США')
    expect(r.kind).toBe('D')
    if (r.kind === 'D') expect(r.clarifyPromptRu).toBe(TUTOR_CHAT_COPY.outOfScopeFallback)
  })

  it('does not gate how_to_say with president word', () => {
    expect(localTutorTriage('как сказать президент по-английски?').kind).toBe('A')
  })
})

describe('resolvePendingTriageFollowUp', () => {
  const haveGotAsk = 'Почему I have a car и I have got a car'

  it('combines angle replies with anchor', () => {
    const r = resolvePendingTriageFollowUp(haveGotAsk, 'Скажи разницу')
    expect(r).toEqual({ kind: 'explain', query: `${haveGotAsk}: Скажи разницу` })
  })

  it('keeps anchor for когда ставить even when standalone triage is A', () => {
    const r = resolvePendingTriageFollowUp('Present Perfect', 'когда ставить')
    expect(r).toEqual({ kind: 'explain', query: 'Present Perfect: когда ставить' })
  })

  it('combines short C-like follow-ups instead of re-triaging chips', () => {
    expect(resolvePendingTriageFollowUp('have got', 'отличие').kind).toBe('explain')
    expect(resolvePendingTriageFollowUp('have got', 'Какая форма').kind).toBe('explain')
    expect(resolvePendingTriageFollowUp('have got', 'have got').kind).toBe('explain')
  })

  it('combines stub how_to_say without object', () => {
    const r = resolvePendingTriageFollowUp('have got', 'Как сказать')
    expect(r).toEqual({ kind: 'explain', query: 'have got: Как сказать' })
  })

  it('falls through on full new how_to_say / gate / empty', () => {
    expect(resolvePendingTriageFollowUp('have got', 'Как сказать hello?').kind).toBe('fallthrough')
    expect(resolvePendingTriageFollowUp('have got', 'спасибо').kind).toBe('fallthrough')
    expect(resolvePendingTriageFollowUp('have got', '').kind).toBe('fallthrough')
  })
})
