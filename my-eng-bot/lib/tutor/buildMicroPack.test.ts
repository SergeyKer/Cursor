import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildTutorMicroPackFromExplain,
  inferContrastCorrectIndex,
} from '@/lib/tutor/buildMicroPack'
import {
  canOfferTutorMicro,
  isJunkMicroPrompt,
  isTutorMicroPackEligible,
} from '@/lib/tutor/microEligible'
import { normalizeTutorExplain } from '@/lib/tutor/normalizeExplain'
import {
  resetLearningMemoryStoragePort,
  setLearningMemoryStoragePort,
} from '@/lib/learningMemory/port'
import { recordTutorMicroWrongSignal } from '@/lib/learningMemory/record'
import type { LearningSignal } from '@/lib/learningMemory/types'

describe('inferContrastCorrectIndex', () => {
  it('picks Perfect for have + result marker', () => {
    expect(
      inferContrastCorrectIndex('I have lost my keys.', 'Present Perfect', 'Past Simple')
    ).toBe(0)
  })

  it('picks Past Simple for yesterday', () => {
    expect(
      inferContrastCorrectIndex('I lost my keys yesterday.', 'Present Perfect', 'Past Simple')
    ).toBe(1)
  })

  it('returns null when unsure', () => {
    expect(inferContrastCorrectIndex('Hello.', 'Present Perfect', 'Past Simple')).toBeNull()
  })
})

describe('buildTutorMicroPackFromExplain', () => {
  it('builds pack from contrast explain without junk prompts', () => {
    const answer = normalizeTutorExplain(
      {
        answerKind: 'contrast',
        title: 'PP vs PS',
        paragraphs: ['a', 'b'],
        examplesEn: ['I have lost my keys.', 'I lost my keys yesterday.'],
        contrastPair: ['Present Perfect', 'Past Simple'],
        rememberRu: 'Результат сейчас → Perfect.',
        topicAnchor: { title: 'PP vs PS', canonicalKey: 'pp_vs_ps', skillTagIds: ['tense.pp'] },
      },
      { audience: 'child' }
    )
    expect(answer).not.toBeNull()
    const pack = buildTutorMicroPackFromExplain(answer!)
    expect(pack?.items.length).toBeGreaterThanOrEqual(2)
    expect(pack?.summaryRu.length).toBeGreaterThan(0)
    for (const item of pack!.items) {
      expect(isJunkMicroPrompt(item.promptRu)).toBe(false)
      expect(item.correctIndex).toBeGreaterThanOrEqual(0)
      expect(item.correctIndex).toBeLessThan(item.options.length)
    }
    expect(isTutorMicroPackEligible(pack!, answer!)).toBe(true)
  })

  it('returns null for thin translate without contrast', () => {
    const answer = normalizeTutorExplain(
      {
        answerKind: 'translate',
        title: 'Как сказать',
        paragraphs: ['Скажи так.'],
        examplesEn: ['Nice to meet you.'],
        rememberRu: 'Вежливое приветствие.',
        topicAnchor: { title: 'Приветствие', canonicalKey: 'greeting' },
      },
      { audience: 'adult' }
    )
    expect(answer).not.toBeNull()
    expect(buildTutorMicroPackFromExplain(answer!)).toBeNull()
    expect(canOfferTutorMicro(answer!, { llmEnabled: false })).toBe(false)
  })

  it('does not invent тема сейчас fallback', () => {
    const answer = normalizeTutorExplain(
      {
        answerKind: 'grammar',
        title: 'Articles',
        paragraphs: ['Правило короткое.', 'Ещё чуть-чуть.'],
        examplesEn: ['an honest man'],
        rememberRu: 'Silent h → an.',
        topicAnchor: { title: 'Articles', canonicalKey: 'articles' },
      },
      { audience: 'child' }
    )
    expect(answer).not.toBeNull()
    const pack = buildTutorMicroPackFromExplain(answer!)
    expect(pack).toBeNull()
  })

  it('builds choice pack from age be examples', () => {
    const answer = normalizeTutorExplain(
      {
        answerKind: 'grammar',
        title: 'Возраст',
        paragraphs: ['Возраст через be.', 'Не через have.'],
        examplesEn: ['I am 20 years old.', 'She is 18 years old.'],
        rememberRu: 'Возраст - I am … years old.',
        topicAnchor: {
          title: 'Возраст',
          canonicalKey: 'age_be',
          skillTagIds: ['present-simple'],
        },
      },
      { audience: 'adult' }
    )
    expect(answer).not.toBeNull()
    const pack = buildTutorMicroPackFromExplain(answer!)
    expect(pack).not.toBeNull()
    expect(pack!.items.length).toBeGreaterThanOrEqual(2)
    expect(pack!.items.every((item) => item.kind === 'choice')).toBe(true)
    expect(pack!.items[0]!.options).toContain('I am 20 years old')
    expect(pack!.items[0]!.options).toContain('I have 20 years')
    expect(pack!.items[0]!.correctIndex).toBe(1)
    for (const item of pack!.items) {
      expect(isJunkMicroPrompt(item.promptRu)).toBe(false)
      expect(item.promptRu).not.toMatch(/Почему|Как сказать/i)
      expect(item.skillTagId).toBe('present-simple')
    }
    expect(canOfferTutorMicro(answer!, { llmEnabled: false, localPack: pack })).toBe(false)
    expect(canOfferTutorMicro(answer!, { llmEnabled: true, localPack: pack })).toBe(true)
  })

  it('builds pack from age phrase contrastPair with concrete options', () => {
    const answer = normalizeTutorExplain(
      {
        answerKind: 'grammar',
        title: 'Возраст',
        paragraphs: ['Возраст через be.', 'Не через have.'],
        examplesEn: ['I am 20 years old.'],
        contrastPair: ['I have 20 years', 'I am 20 years old'],
        rememberRu: 'Возраст - I am … years old.',
        topicAnchor: { title: 'Возраст', canonicalKey: 'age_be', skillTagIds: ['present-simple'] },
      },
      { audience: 'adult' }
    )
    expect(answer).not.toBeNull()
    const pack = buildTutorMicroPackFromExplain(answer!)
    expect(pack).not.toBeNull()
    expect(pack!.items.length).toBeGreaterThanOrEqual(2)
    for (const item of pack!.items) {
      expect(item.options.every((opt) => !opt.includes('…') && !opt.includes('...'))).toBe(true)
    }
  })

  it('does not offer pack for will / going to phrase stubs', () => {
    const answer = normalizeTutorExplain(
      {
        answerKind: 'contrast',
        title: 'Will vs going to',
        paragraphs: ['Will - решение сейчас.', 'Going to - план.'],
        examplesEn: ['I will call you.', 'I am going to call you.'],
        contrastPair: ['will', 'going to'],
        rememberRu: 'План - going to.',
        topicAnchor: { title: 'Will vs going to', canonicalKey: 'will_going_to' },
      },
      { audience: 'adult' }
    )
    expect(answer).not.toBeNull()
    expect(buildTutorMicroPackFromExplain(answer!)).toBeNull()
  })
})

describe('canOfferTutorMicro', () => {
  it('offers chip for LLM flag on strong kind even without local pack', () => {
    const answer = normalizeTutorExplain(
      {
        answerKind: 'grammar',
        title: 'Articles',
        paragraphs: ['Правило короткое.', 'Ещё чуть-чуть.'],
        examplesEn: ['an honest man'],
        rememberRu: 'Silent h → an.',
        topicAnchor: { title: 'Articles', canonicalKey: 'articles' },
      },
      { audience: 'child' }
    )
    expect(answer).not.toBeNull()
    expect(canOfferTutorMicro(answer!, { llmEnabled: false, localPack: null })).toBe(false)
    expect(canOfferTutorMicro(answer!, { llmEnabled: true, localPack: null })).toBe(true)
  })
})

describe('recordTutorMicroWrongSignal', () => {
  afterEach(() => {
    resetLearningMemoryStoragePort()
    vi.unstubAllGlobals()
  })

  it('raises errorCount in AttentionZones (mixed pipeline)', () => {
    vi.stubGlobal('window', {
      requestIdleCallback: (cb: () => void) => {
        cb()
        return 1
      },
    })
    const saved: LearningSignal[] = []
    setLearningMemoryStoragePort({
      listSignals: () => saved,
      saveSignal: (input) => {
        const signal: LearningSignal = {
          id: 'test',
          at: new Date().toISOString(),
          source: input.source,
          detector: input.detector,
          utteranceHash: input.utteranceHash,
          rawTopicIds: input.rawTopicIds,
          rawTopicTitles: input.rawTopicTitles,
          lessonIdHint: input.lessonIdHint,
          skillTagIds: input.skillTagIds,
          snippet: input.snippet,
        }
        saved.push(signal)
        return signal
      },
      clearSignals: () => {
        saved.length = 0
      },
      loadMasteryMap: () => ({}),
      saveMasteryMap: () => undefined,
      clearMasteryMap: () => undefined,
      markSkillsResolved: () => undefined,
      clearSkillResolved: () => undefined,
    })

    recordTutorMicroWrongSignal({
      skillTagId: 'tense.pp',
      topicTitle: 'Present Perfect',
      userAnswer: 'I lost my keys',
      correctAnswer: 'I have lost my keys',
      canonicalKey: 'pp_vs_ps',
    })

    expect(saved.some((s) => s.source === 'tutor' && s.detector === 'tutor_micro')).toBe(true)
    expect(saved[0]?.skillTagIds).toContain('tense.pp')
  })
})
