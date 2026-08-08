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

  it('preserves followUpNudgeConsumed through stash/consume', () => {
    stashTutorReturnContext({
      draft: '',
      anchorQuery: 'x',
      postExplainChips: true,
      followUpNudgeConsumed: true,
      followUpNudgeArmed: true,
      thread: [{ id: '1', role: 'user', text: 'hi' }],
      lastExplain: sampleExplain,
    })
    const snap = consumeTutorReturnContext()
    expect(snap?.followUpNudgeConsumed).toBe(true)
    expect(snap?.followUpNudgeArmed).toBe(true)
  })

  it('defaults followUpNudgeConsumed to false when missing', () => {
    stashTutorReturnContext({
      draft: '',
      anchorQuery: null,
      postExplainChips: false,
      thread: [],
    })
    const snap = consumeTutorReturnContext()
    expect(snap?.followUpNudgeConsumed).toBe(false)
    expect(snap?.followUpNudgeArmed).toBe(false)
  })

  it('preserves followUpHop through stash/consume', () => {
    stashTutorReturnContext({
      draft: '',
      anchorQuery: 'x',
      postExplainChips: true,
      followUpHop: 2,
      followUpNudgeArmed: true,
      followUpNudgeConsumed: false,
      thread: [{ id: '1', role: 'user', text: 'hi' }],
      lastExplain: sampleExplain,
    })
    const snap = consumeTutorReturnContext()
    expect(snap?.followUpHop).toBe(2)
  })
})
