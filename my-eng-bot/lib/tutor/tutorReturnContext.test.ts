import { describe, expect, it, beforeEach } from 'vitest'
import { clearTutorStorageMemoryForTests } from '@/lib/tutor/storageAdapter'
import {
  clearTutorReturnContext,
  consumeTutorReturnContext,
  peekTutorReturnContext,
  stashTutorReturnContext,
} from '@/lib/tutor/tutorReturnContext'

describe('tutorReturnContext', () => {
  beforeEach(() => {
    clearTutorStorageMemoryForTests()
    clearTutorReturnContext()
  })

  it('stashes and consumes snapshot', () => {
    stashTutorReturnContext({
      draft: 'hello',
      anchorQuery: 'Present Perfect',
      followUpMode: false,
      postExplainChips: true,
      thread: [{ id: '1', role: 'user', text: 'Зачем Perfect?' }],
      lastExplainCanonicalKey: 'pp_vs_ps',
    })
    expect(peekTutorReturnContext()?.draft).toBe('hello')
    const consumed = consumeTutorReturnContext()
    expect(consumed?.anchorQuery).toBe('Present Perfect')
    expect(consumeTutorReturnContext()).toBeNull()
  })

  it('preserves pendingTriageQuery through stash/consume', () => {
    stashTutorReturnContext({
      draft: '',
      anchorQuery: null,
      followUpMode: false,
      postExplainChips: false,
      thread: [{ id: 'u1', role: 'user', text: 'Чем a и an отличаются?' }],
      pendingTriageQuery: 'Чем a и an отличаются?',
    })
    const snap = consumeTutorReturnContext()
    expect(snap?.pendingTriageQuery).toBe('Чем a и an отличаются?')
    expect(snap?.thread).toHaveLength(1)
  })
})
