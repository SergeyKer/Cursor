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

  it('missing without stash orphan for bad hint when generate off', () => {
    const opened: string[] = []
    const answer = grammarAnswer('999', 'have got')
    const result = resolveTutorCheatsheetOpen({
      answer,
      snapshot: snapshotBase(answer),
      openLocalReference: (id) => opened.push(id),
    })
    expect(result.kind).toBe('missing')
    expect(opened).toEqual([])
    expect(peekTutorReturnContext()).toBeNull()
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

  it('hides when cheatsheetVisibility is hidden', () => {
    const opened: string[] = []
    const answer: TutorExplainAnswer = {
      ...grammarAnswer('4'),
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
