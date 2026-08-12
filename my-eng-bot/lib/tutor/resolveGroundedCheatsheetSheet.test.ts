import { describe, expect, it, vi } from 'vitest'
import { resolveGroundedCheatsheetSheet } from '@/lib/tutor/resolveGroundedCheatsheetSheet'
import type { TutorExplainAnswer } from '@/lib/tutor/types'
import type { ReferenceSheet } from '@/lib/reference/types'

const answer: TutorExplainAnswer = {
  answerKind: 'grammar',
  title: 'since',
  paragraphs: ['Since marks a start.'],
  examplesEn: ['I have lived here since 2010.'],
  topicAnchor: { title: 'since', canonicalKey: 'since', lessonIdHint: null },
  cheatsheetVisibility: 'primary',
}

const generatedSheet = {
  id: 'generated:since',
  title: 'since',
} as ReferenceSheet

const localSheet = {
  id: 'tutor-grounded:since',
  title: 'since',
} as ReferenceSheet

describe('resolveGroundedCheatsheetSheet', () => {
  it('prefers generated sheet over local', async () => {
    const generate = vi.fn(async () => ({ kind: 'generated' as const, sheet: generatedSheet }))
    const buildLocal = vi.fn(() => localSheet)
    const result = await resolveGroundedCheatsheetSheet({
      answer,
      query: 'since',
      level: 'a2',
      audience: 'adult',
      provider: 'openai',
      generate,
      buildLocal,
    })
    expect(result).toEqual({ kind: 'opened', sheet: generatedSheet, source: 'generated' })
    expect(generate).toHaveBeenCalled()
    expect(buildLocal).not.toHaveBeenCalled()
  })

  it('falls back to local when generate rejects', async () => {
    const generate = vi.fn(async () => ({ kind: 'rejected' as const, reason: 'http' as const }))
    const buildLocal = vi.fn(() => localSheet)
    const result = await resolveGroundedCheatsheetSheet({
      answer,
      query: 'since',
      level: 'a2',
      audience: 'adult',
      provider: 'openai',
      generate,
      buildLocal,
    })
    expect(result).toEqual({ kind: 'opened', sheet: localSheet, source: 'local' })
    expect(buildLocal).toHaveBeenCalledWith(answer, 'a2')
  })

  it('returns missing when both fail', async () => {
    const generate = vi.fn(async () => ({ kind: 'rejected' as const, reason: 'output_gate' as const }))
    const buildLocal = vi.fn(() => null)
    const result = await resolveGroundedCheatsheetSheet({
      answer,
      query: 'since',
      level: 'a2',
      audience: 'adult',
      provider: 'openai',
      generate,
      buildLocal,
    })
    expect(result).toEqual({ kind: 'missing' })
  })
})
