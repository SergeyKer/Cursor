import { describe, expect, it } from 'vitest'
import type { LessonFeedMessage } from '@/lib/buildLessonFeedMessages'
import {
  buildLessonFeedMessageBaseId,
  parseLessonFeedMessageId,
  resolveHistoricalLessonMessageIdForDepartingCurrent,
  toHistoricalLessonFeedMessageId,
} from '@/lib/lessonIntroPanelMessageId'

const lesson = (id: string, isHistorical: boolean): LessonFeedMessage => ({
  id,
  role: 'assistant',
  kind: 'lesson',
  bubbles: [{ type: 'task', content: 'Task' }],
  isHistorical,
})

describe('buildLessonFeedMessageBaseId', () => {
  it('uses stable id for current entry', () => {
    expect(
      buildLessonFeedMessageBaseId(
        { isCurrent: true, step: { stepNumber: 1, stepIndex: 0 } },
        3,
        0
      )
    ).toBe('1-0-current')
  })

  it('keeps entry index for history entries', () => {
    expect(
      buildLessonFeedMessageBaseId(
        { isCurrent: false, step: { stepNumber: 1, stepIndex: 0 } },
        2,
        0
      )
    ).toBe('1-0-2-history')
  })
})

describe('parseLessonFeedMessageId', () => {
  it('parses stable current lesson feed ids', () => {
    expect(parseLessonFeedMessageId('lesson-1-0-current')).toEqual({
      stepNumber: 1,
      stepIndex: 0,
      entryIndex: null,
      scope: 'current',
    })
  })

  it('parses legacy lesson feed ids', () => {
    expect(parseLessonFeedMessageId('lesson-1-0-2-current')).toEqual({
      stepNumber: 1,
      stepIndex: 0,
      entryIndex: 2,
      scope: 'current',
    })
  })
})

describe('resolveHistoricalLessonMessageIdForDepartingCurrent', () => {
  it('maps retry current id to same-entry history id', () => {
    const messages = [
      lesson('lesson-1-0-0-history', true),
      lesson('lesson-1-0-current', false),
    ]

    expect(
      resolveHistoricalLessonMessageIdForDepartingCurrent('lesson-1-0-current', messages)
    ).toBe('lesson-1-0-0-history')
  })

  it('maps step advance to latest historical lesson for the step', () => {
    const messages = [
      lesson('lesson-1-0-0-history', true),
      lesson('lesson-2-1-current', false),
    ]

    expect(
      resolveHistoricalLessonMessageIdForDepartingCurrent('lesson-1-0-current', messages)
    ).toBe('lesson-1-0-0-history')
  })

  it('converts stable current suffix when no feed match yet', () => {
    expect(toHistoricalLessonFeedMessageId('lesson-3-2-current')).toBe('lesson-3-2-0-history')
  })
})
