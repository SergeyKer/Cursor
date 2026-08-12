import { resolveTutorCheatsheetOpen, abandonCheatsheetGenerate } from '@/lib/tutor/resolveTutorCheatsheetOpen'
import { clearTutorReturnContext, peekTutorReturnContext } from '@/lib/tutor/tutorReturnContext'
import type { TutorExplainAnswer } from '@/lib/tutor/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: {
    referenceV1: true,
    referenceGenerate: false,
  },
}))

const grammarAnswer = (hint: string | null, title = 'Test'): TutorExplainAnswer => ({
  answerKind: 'grammar',
  title,
  paragraphs: ['Para one.', 'Para two.'],
  examplesEn: ['I am Anna.'],
  topicAnchor: {
    title,
    canonicalKey: 'test_topic',
    lessonIdHint: hint,
  },
  cheatsheetVisibility: 'primary',
})

const snapshotBase = (answer: TutorExplainAnswer) => ({
  draft: '',
  thread: [] as Array<{ id: string; role: 'user' | 'assistant'; text: string }>,
  lastExplain: answer,
  anchorQuery: answer.title,
  postExplainChips: true,
})

describe('resolveTutorCheatsheetOpen P0-1', () => {
  beforeEach(() => {
    clearTutorReturnContext()
  })

  it('opens and stashes only when sheet exists', () => {
    const opened: string[] = []
    const answer = grammarAnswer('4')
    const result = resolveTutorCheatsheetOpen({
      answer,
      snapshot: snapshotBase(answer),
      openLocalReference: (id) => opened.push(id),
    })
    expect(result).toEqual({ kind: 'opened' })
    expect(opened).toEqual(['4'])
    expect(peekTutorReturnContext()).not.toBeNull()
  })

  it('needs_generate when nothing resolves and generate flag off (grounded path)', () => {
    const opened: string[] = []
    const answer = grammarAnswer(null, 'привет')
    const result = resolveTutorCheatsheetOpen({
      answer,
      snapshot: snapshotBase(answer),
      openLocalReference: (id) => opened.push(id),
    })
    expect(result.kind).toBe('needs_generate')
    if (result.kind === 'needs_generate') {
      expect(result.grounded).toBe(true)
    }
    expect(opened).toEqual([])
    expect(peekTutorReturnContext()).not.toBeNull()
  })

  it('missing prebuilt without runtime opener does not stash', () => {
    const opened: string[] = []
    const answer = grammarAnswer(null, 'is doing')
    const result = resolveTutorCheatsheetOpen({
      answer,
      snapshot: snapshotBase(answer),
      openLocalReference: (id) => opened.push(id),
    })
    expect(result.kind).toBe('missing')
    expect(opened).toEqual([])
    expect(peekTutorReturnContext()).toBeNull()
  })

  it('opens prebuilt via runtime sheet when no local lesson', () => {
    const sheets: string[] = []
    const answer = grammarAnswer(null, 'is doing')
    const result = resolveTutorCheatsheetOpen({
      answer,
      snapshot: snapshotBase(answer),
      openLocalReference: () => {},
      openRuntimeSheet: (sheet) => {
        sheets.push(sheet.id)
      },
    })
    expect(result).toEqual({ kind: 'opened' })
    expect(sheets.length).toBe(1)
    expect(peekTutorReturnContext()).not.toBeNull()
  })

  it('returns choose for ambiguous get', () => {
    const answer = grammarAnswer(null, 'get')
    const result = resolveTutorCheatsheetOpen({
      answer,
      snapshot: snapshotBase(answer),
      openLocalReference: () => {},
    })
    expect(result.kind).toBe('needs_choose')
    if (result.kind === 'needs_choose') {
      expect(result.candidates.map((c) => c.topicKey).sort()).toEqual(['get_become', 'get_up'])
    }
    expect(peekTutorReturnContext()).not.toBeNull()
  })

  it('resolves allowlist title to local lesson when hint empty', () => {
    const opened: string[] = []
    const answer = grammarAnswer(null, 'I am / I am from')
    const result = resolveTutorCheatsheetOpen({
      answer,
      snapshot: snapshotBase(answer),
      openLocalReference: (id) => opened.push(id),
    })
    expect(result).toEqual({ kind: 'opened' })
    expect(opened).toEqual(['4'])
  })

  it('missing when topic sheet not eligible (translate)', () => {
    const opened: string[] = []
    const answer: TutorExplainAnswer = {
      ...grammarAnswer('4'),
      answerKind: 'translate',
      cheatsheetVisibility: 'hidden',
    }
    const result = resolveTutorCheatsheetOpen({
      answer,
      snapshot: snapshotBase(answer),
      openLocalReference: (id) => opened.push(id),
    })
    expect(result.kind).toBe('missing')
    expect(opened).toEqual([])
  })
})

describe('abandonCheatsheetGenerate', () => {
  it('clears stash', () => {
    const answer = grammarAnswer('4')
    resolveTutorCheatsheetOpen({
      answer,
      snapshot: snapshotBase(answer),
      openLocalReference: () => {},
    })
    expect(peekTutorReturnContext()).not.toBeNull()
    abandonCheatsheetGenerate()
    expect(peekTutorReturnContext()).toBeNull()
  })
})
