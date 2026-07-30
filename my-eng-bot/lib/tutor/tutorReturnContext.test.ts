import { describe, expect, it, beforeEach } from 'vitest'
import { clearTutorStorageMemoryForTests } from '@/lib/tutor/storageAdapter'
import {
  clearTutorReturnContext,
  consumeTutorReturnContext,
  peekTutorReturnContext,
  stashTutorReturnContext,
} from '@/lib/tutor/tutorReturnContext'
import type { TutorExplainAnswer } from '@/lib/tutor/types'

const sampleExplain: TutorExplainAnswer = {
  answerKind: 'grammar',
  title: 'Present Perfect',
  paragraphs: ['a', 'b'],
  examplesEn: ['I have done it.'],
  topicAnchor: { title: 'Present Perfect', canonicalKey: 'pp' },
  cheatsheetVisibility: 'primary',
}

describe('tutorReturnContext', () => {
  beforeEach(() => {
    clearTutorStorageMemoryForTests()
    clearTutorReturnContext()
  })

  it('stashes and consumes snapshot with lastExplain', () => {
    stashTutorReturnContext({
      draft: 'hello',
      anchorQuery: 'Present Perfect',
      postExplainChips: true,
      thread: [{ id: '1', role: 'user', text: 'Зачем Perfect?' }],
      lastExplain: sampleExplain,
    })
    expect(peekTutorReturnContext()?.draft).toBe('hello')
    const consumed = consumeTutorReturnContext()
    expect(consumed?.anchorQuery).toBe('Present Perfect')
    expect(consumed?.lastExplain?.topicAnchor.canonicalKey).toBe('pp')
    expect(consumeTutorReturnContext()).toBeNull()
  })

  it('preserves pendingTriageQuery through stash/consume', () => {
    stashTutorReturnContext({
      draft: '',
      anchorQuery: null,
      postExplainChips: false,
      thread: [{ id: 'u1', role: 'user', text: 'Почему «I am busy», а не «I busy»?' }],
      pendingTriageQuery: 'Почему «I am busy», а не «I busy»?',
    })
    const snap = consumeTutorReturnContext()
    expect(snap?.pendingTriageQuery).toBe('Почему «I am busy», а не «I busy»?')
  })
})
