import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: {
    referenceV1: true,
    referenceGenerate: false,
  },
}))

import {
  materializeReferenceCandidate,
  resolveReferenceOpen,
} from '@/lib/reference/resolveReferenceOpen'

describe('resolveReferenceOpen', () => {
  it('opens have → have_got prebuilt', () => {
    const r = resolveReferenceOpen({ rawQuery: 'have' })
    expect(r.kind).toBe('open')
    if (r.kind === 'open') {
      expect(r.candidate.topicKey).toBe('have_got')
      expect(r.candidate.openKind).toBe('prebuilt')
    }
  })

  it('opens it’s time via lesson search', () => {
    const r = resolveReferenceOpen({ rawQuery: "it's time", audience: 'adult' })
    expect(r.kind).toBe('open')
    if (r.kind === 'open') {
      expect(r.candidate.lessonId).toBe('1')
    }
  })

  it('opens lessonIdHint from explain', () => {
    const r = resolveReferenceOpen({
      rawQuery: '',
      explain: {
        answerKind: 'grammar',
        title: "It's time",
        paragraphs: ['x'],
        examplesEn: [],
        topicAnchor: {
          title: "It's",
          canonicalKey: 'its_time_to',
          lessonIdHint: '1',
        },
        cheatsheetVisibility: 'primary',
      },
    })
    expect(r.kind).toBe('open')
    if (r.kind === 'open') expect(r.candidate.lessonId).toBe('1')
  })

  it('get → choose become vs up', () => {
    const r = resolveReferenceOpen({ rawQuery: 'get' })
    expect(r.kind).toBe('choose')
    if (r.kind === 'choose') {
      expect(r.candidates.map((c) => c.topicKey).sort()).toEqual(['get_become', 'get_up'])
    }
  })

  it('is doing → present_continuous', () => {
    const r = resolveReferenceOpen({ rawQuery: 'is doing' })
    expect(r.kind).toBe('open')
    if (r.kind === 'open') expect(r.candidate.topicKey).toBe('present_continuous')
  })

  it('have been doing → PPC', () => {
    const r = resolveReferenceOpen({ rawQuery: 'have been doing' })
    expect(r.kind).toBe('open')
    if (r.kind === 'open') expect(r.candidate.topicKey).toBe('present_perfect_continuous')
  })

  it('a lot → quantifiers', () => {
    const r = resolveReferenceOpen({ rawQuery: 'a lot' })
    expect(r.kind).toBe('open')
    if (r.kind === 'open') expect(r.candidate.topicKey).toBe('quantifiers')
  })

  it('rejects noise', () => {
    const r = resolveReferenceOpen({ rawQuery: 'аааа' })
    expect(r.kind).toBe('reject')
  })

  it('rejects smalltalk gate', () => {
    const r = resolveReferenceOpen({ rawQuery: 'привет' })
    expect(r.kind).toBe('reject')
    if (r.kind === 'reject') expect(r.reason).toBe('gate')
  })

  it('materialize opens prebuilt sheet', () => {
    const r = resolveReferenceOpen({ rawQuery: 'have' })
    expect(r.kind).toBe('open')
    if (r.kind !== 'open') return
    const m = materializeReferenceCandidate(r.candidate)
    expect(m.kind).toBe('open')
    if (m.kind === 'open') expect(m.sheet.contrast).toBeDefined()
  })
})
