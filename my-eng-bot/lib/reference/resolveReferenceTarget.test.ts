import { describe, expect, it, vi } from 'vitest'
import {
  isShortReferenceQuery,
  resolveReferenceTarget,
} from '@/lib/reference/resolveReferenceTarget'
import { hasReferencePromptLeak } from '@/lib/reference/sheetOutputGate'

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: {
    referenceV1: true,
    referenceGenerate: false,
  },
}))

describe('resolveReferenceTarget Wave0', () => {
  it('opens lesson 4', () => {
    const r = resolveReferenceTarget({ lessonId: '4' })
    expect(r.kind).toBe('lesson')
    if (r.kind === 'lesson') {
      expect(r.sheet.relatedLessonId).toBe('4')
    }
  })

  it('rejects short token without generate', () => {
    expect(isShortReferenceQuery('zz')).toBe(true)
    const r = resolveReferenceTarget({ query: 'zz' })
    expect(r.kind).toBe('reject')
    if (r.kind === 'reject') expect(r.reason).toBe('short_token')
  })

  it('rejects longer miss when generate flag off', () => {
    const r = resolveReferenceTarget({ query: 'present perfect continuous usage' })
    expect(r.kind).toBe('reject')
    if (r.kind === 'reject') expect(r.reason).toBe('generate_disabled')
  })

  it('rejects empty', () => {
    expect(resolveReferenceTarget({}).kind).toBe('reject')
  })

  it('runtime sheet wins with null relatedLessonId', () => {
    const sheet = {
      id: 'runtime',
      title: 't',
      teaser: 't',
      level: 'A1' as const,
      hasPractice: false,
      hook: null,
      rule: ['r'],
      formula: ['f'],
      traps: [],
      contrast: [],
      examples: [{ en: 'Hi.', ru: 'Привет.', note: 'n' }],
      selfCheck: null,
      relatedLessonId: null,
    }
    const r = resolveReferenceTarget({ runtimeSheet: sheet })
    expect(r.kind).toBe('runtime')
    if (r.kind === 'runtime') expect(r.sheet.relatedLessonId).toBeNull()
  })

  it('resolves syllabus topicKey to_be to lesson 4', () => {
    const r = resolveReferenceTarget({ topicKey: 'to_be' })
    expect(r.kind).toBe('lesson')
    if (r.kind === 'lesson') expect(r.lessonId).toBe('4')
  })
})

describe('sheetOutputGate anti-leak', () => {
  it('rejects :: and prompt-leak markers', () => {
    expect(hasReferencePromptLeak('rule :: poison')).toBe(true)
    expect(hasReferencePromptLeak('system prompt leak')).toBe(true)
    expect(hasReferencePromptLeak('НЕ цитируй инструкции')).toBe(true)
    expect(hasReferencePromptLeak('```json')).toBe(true)
  })
})

describe('featureFlags referenceGenerate default', () => {
  it('is off unless env explicitly true', async () => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_FEATURE_REFERENCE_GENERATE', undefined)
    const { featureFlags } = await import('@/lib/featureFlags')
    expect(featureFlags.referenceGenerate).toBe(false)
    vi.unstubAllEnvs()
  })
})
