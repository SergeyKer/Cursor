import { describe, expect, it } from 'vitest'
import { splitLessonBubblesForDisplay, resolveTaskBubbleIndex } from '@/lib/lessonBubbleLayout'
import type { Bubble } from '@/types/lesson'

const standard: Bubble[] = [
  { type: 'positive', content: 'Hook' },
  { type: 'info', content: 'Theory' },
  { type: 'task', content: 'Do it' },
]

describe('resolveTaskBubbleIndex', () => {
  it('returns last task index', () => {
    expect(resolveTaskBubbleIndex(standard)).toBe(2)
  })

  it('returns -1 when no task', () => {
    expect(resolveTaskBubbleIndex([{ type: 'positive', content: 'Finale' }])).toBe(-1)
  })
})

describe('splitLessonBubblesForDisplay', () => {
  it('splits positive+info vs task', () => {
    const split = splitLessonBubblesForDisplay(standard)
    expect(split.useSplitLayout).toBe(true)
    expect(split.taskIndex).toBe(2)
    expect(split.theoryBubbles).toHaveLength(2)
    expect(split.taskBubble?.content).toBe('Do it')
  })

  it('single positive bubble - no split', () => {
    const split = splitLessonBubblesForDisplay([{ type: 'positive', content: 'Finale' }])
    expect(split.useSplitLayout).toBe(false)
    expect(split.taskBubble).toBeNull()
  })

  it('task only - split with empty theory', () => {
    const split = splitLessonBubblesForDisplay([{ type: 'task', content: 'Only task' }])
    expect(split.useSplitLayout).toBe(true)
    expect(split.theoryBubbles).toHaveLength(0)
    expect(split.taskIndex).toBe(0)
  })

  it('no task type - unified', () => {
    const split = splitLessonBubblesForDisplay([
      { type: 'positive', content: 'A' },
      { type: 'info', content: 'B' },
    ])
    expect(split.useSplitLayout).toBe(false)
  })
})
