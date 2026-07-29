import { describe, expect, it } from 'vitest'
import {
  cheatsheetVisibilityForAnswerKind,
  chipsFromLabels,
  normalizeTutorCuriosityEntry,
  normalizeTutorExplain,
  normalizeTutorExplainResult,
  normalizeTutorMicroPack,
  normalizeTutorTriage,
  buildOpenTutorAction,
  normalizeTutorCardViewModel,
} from '@/lib/tutor'

describe('normalizeTutorTriage', () => {
  it('accepts A with query', () => {
    expect(normalizeTutorTriage({ kind: 'A', query: 'Зачем Present Perfect?' })).toEqual({
      kind: 'A',
      query: 'Зачем Present Perfect?',
    })
  })

  it('requires chips for B/C', () => {
    expect(normalizeTutorTriage({ kind: 'B', topicHint: 'артикли', chips: [] })).toBeNull()
    const b = normalizeTutorTriage({
      kind: 'B',
      topicHint: 'артикли',
      chips: chipsFromLabels(['когда the', 'когда a']),
    })
    expect(b?.kind).toBe('B')
    if (b?.kind === 'B') expect(b.chips).toHaveLength(2)
  })

  it('accepts D clarify', () => {
    const d = normalizeTutorTriage({ kind: 'D', clarifyPromptRu: 'Что именно спросить?' })
    expect(d).toEqual({ kind: 'D', clarifyPromptRu: 'Что именно спросить?' })
  })

  it('rejects unknown', () => {
    expect(normalizeTutorTriage(null)).toBeNull()
    expect(normalizeTutorTriage({ kind: 'Z' })).toBeNull()
  })
})

describe('normalizeTutorExplain', () => {
  const childFixture = {
    answerKind: 'contrast',
    title: 'Present Perfect vs Past Simple',
    paragraphs: [
      'Present Perfect нужен, когда важен результат сейчас, а не точная дата.',
      'Past Simple — когда действие закончилось в известное время в прошлом.',
      'Сигналы: already / yet / ever — чаще Perfect; yesterday / in 2010 — Simple.',
    ],
    examplesEn: ['I have lost my keys.', 'I lost my keys yesterday.'],
    contrastPair: ['Present Perfect', 'Past Simple'],
    rememberRu: 'Есть результат сейчас → Perfect.',
    topicAnchor: {
      title: 'Present Perfect vs Past Simple',
      canonicalKey: 'pp_vs_ps',
      skillTagIds: ['tense.present_perfect'],
    },
  }

  it('normalizes child fixture (2–5 paragraphs, 1–2 examples)', () => {
    const answer = normalizeTutorExplain(childFixture, { audience: 'child' })
    expect(answer).not.toBeNull()
    expect(answer?.paragraphs.length).toBeGreaterThanOrEqual(2)
    expect(answer?.paragraphs.length).toBeLessThanOrEqual(5)
    expect(answer?.examplesEn).toHaveLength(2)
    expect(answer?.cheatsheetVisibility).toBe('primary')
    expect(answer?.contrastPair).toEqual(['Present Perfect', 'Past Simple'])
  })

  it('rejects child with too few paragraphs or examples', () => {
    expect(
      normalizeTutorExplain(
        { ...childFixture, paragraphs: ['Один абзац мало.'] },
        { audience: 'child' }
      )
    ).toBeNull()
    expect(
      normalizeTutorExplain({ ...childFixture, examplesEn: [] }, { audience: 'child' })
    ).toBeNull()
  })

  it('adult may be shorter; translate hides cheatsheet', () => {
    const answer = normalizeTutorExplain(
      {
        answerKind: 'translate',
        title: 'Перевод',
        paragraphs: ['The elephant ate the mouse.'],
        examplesEn: [],
        topicAnchor: { title: 'translate', canonicalKey: 'translate_elephant' },
      },
      { audience: 'adult' }
    )
    expect(answer?.cheatsheetVisibility).toBe('hidden')
    expect(answer?.paragraphs).toHaveLength(1)
  })

  it('clamps examples for child to 2', () => {
    const answer = normalizeTutorExplain(
      {
        ...childFixture,
        examplesEn: ['a', 'b', 'c', 'd'],
      },
      { audience: 'child' }
    )
    expect(answer?.examplesEn).toEqual(['a', 'b'])
  })

  it('maps how_to_say to secondary cheatsheet', () => {
    expect(cheatsheetVisibilityForAnswerKind('how_to_say')).toBe('secondary')
    expect(cheatsheetVisibilityForAnswerKind('orthography')).toBe('secondary')
    expect(cheatsheetVisibilityForAnswerKind('grammar')).toBe('primary')
  })

  it('normalizes out_of_scope without paragraphs', () => {
    const result = normalizeTutorExplainResult({
      scope: 'out_of_scope',
      messageRu: 'Это не про английский.',
    })
    expect(result).toEqual({
      scope: 'out_of_scope',
      messageRu: 'Это не про английский.',
    })
    expect(normalizeTutorExplain({ scope: 'out_of_scope', messageRu: 'x' })).toBeNull()
  })

  it('treats missing scope + valid answer as in_scope', () => {
    const result = normalizeTutorExplainResult(childFixture, { audience: 'child' })
    expect(result?.scope).toBe('in_scope')
    if (result?.scope === 'in_scope') {
      expect(result.answer.title).toContain('Present Perfect')
    }
  })
})

describe('normalizeTutorMicroPack', () => {
  it('accepts valid pack', () => {
    const pack = normalizeTutorMicroPack({
      summaryRu: 'Ты различил Perfect и Simple.',
      items: [
        {
          id: '1',
          kind: 'pick_side',
          promptRu: 'I ___ my keys. (сейчас без ключей)',
          options: ['have lost', 'lost'],
          correctIndex: 0,
          skillTagId: 'tense.present_perfect',
        },
        {
          kind: 'best_fit',
          promptRu: 'Выбери Past Simple',
          options: ['I saw her yesterday.', 'I have seen her.'],
          correctIndex: 0,
        },
      ],
    })
    expect(pack?.items).toHaveLength(2)
    expect(pack?.items[1]?.id).toBe('micro_2')
  })

  it('rejects bad correctIndex or too few items', () => {
    expect(
      normalizeTutorMicroPack({
        summaryRu: 'ok',
        items: [
          { promptRu: 'q', options: ['a', 'b'], correctIndex: 9 },
          { promptRu: 'q2', options: ['a', 'b'], correctIndex: 0 },
        ],
      })
    ).toBeNull()
  })
})

describe('normalizeTutorCuriosityEntry', () => {
  it('accepts valid curiosity (not an error)', () => {
    const entry = normalizeTutorCuriosityEntry({
      id: 'c1',
      topicTitle: 'Present Perfect',
      questionRu: 'Зачем он, если есть Past Simple?',
      createdAtIso: '2026-07-29T10:00:00.000Z',
    })
    expect(entry?.topicTitle).toBe('Present Perfect')
  })

  it('rejects missing / bad dates', () => {
    expect(
      normalizeTutorCuriosityEntry({
        id: 'c1',
        topicTitle: 'x',
        questionRu: 'y',
        createdAtIso: 'not-a-date',
      })
    ).toBeNull()
  })
})

describe('open_tutor stub', () => {
  it('builds MyPlan open_tutor action', () => {
    const action = buildOpenTutorAction({
      prefill: 'Зачем Present Perfect, если есть Past Simple?',
      source: 'error_prompt',
      skillTagId: 'tense.present_perfect',
    })
    expect(action).toEqual({
      kind: 'open_tutor',
      prefill: 'Зачем Present Perfect, если есть Past Simple?',
      source: 'error_prompt',
      skillTagId: 'tense.present_perfect',
    })
  })

  it('normalizes card view-model', () => {
    const card = normalizeTutorCardViewModel({
      title: 'Часто путаешь Present Perfect',
      reason: 'Спросить Репетитора: зачем он, если есть Past Simple?',
      buttonLabel: 'Спросить',
      prefill: 'Зачем Present Perfect, если есть Past Simple?',
      source: 'error_prompt',
      skillTagId: 'tense.present_perfect',
    })
    expect(card?.buttonLabel).toBe('Спросить')
  })
})
