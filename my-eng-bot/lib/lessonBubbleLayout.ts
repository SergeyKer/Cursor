import type { Bubble } from '@/types/lesson'

export type LessonBubbleSplit = {
  theoryBubbles: Bubble[]
  taskBubble: Bubble | null
  taskIndex: number
  /** false — один слитный блок как раньше (finale, нет task). */
  useSplitLayout: boolean
}

export function resolveTaskBubbleIndex(bubbles: Bubble[]): number {
  for (let index = bubbles.length - 1; index >= 0; index -= 1) {
    if (bubbles[index]?.type === 'task') return index
  }
  return -1
}

export function splitLessonBubblesForDisplay(bubbles: Bubble[]): LessonBubbleSplit {
  const taskIndex = resolveTaskBubbleIndex(bubbles)
  if (taskIndex < 0) {
    return {
      theoryBubbles: bubbles,
      taskBubble: null,
      taskIndex: -1,
      useSplitLayout: false,
    }
  }

  if (taskIndex === 0) {
    return {
      theoryBubbles: [],
      taskBubble: bubbles[0] ?? null,
      taskIndex: 0,
      useSplitLayout: true,
    }
  }

  return {
    theoryBubbles: bubbles.slice(0, taskIndex),
    taskBubble: bubbles[taskIndex] ?? null,
    taskIndex,
    useSplitLayout: true,
  }
}
