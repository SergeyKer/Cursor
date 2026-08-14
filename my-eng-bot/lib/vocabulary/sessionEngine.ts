import type { NecessaryWord } from '@/types/vocabulary'

export type WordStep =
  | 'reveal_en'
  | 'check'
  | 'check_fail_say'
  | 'produce'
  | 'speak_en'
  | 'done'

function shuffleInPlace<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[items[index], items[swapIndex]] = [items[swapIndex]!, items[index]!]
  }
  return items
}

/** Intro is always reveal_en (RU+EN). Produce sits between Check and SpeakEn. */
export function stepsForWordCycle(): WordStep[] {
  return ['reveal_en', 'check', 'produce', 'speak_en', 'done']
}

export function nextStep(steps: WordStep[], current: WordStep): WordStep | null {
  const index = steps.indexOf(current)
  if (index < 0 || index >= steps.length - 1) return null
  return steps[index + 1] ?? null
}

/** After check_fail_say: skip speak_en and continue from the step after it. */
export function stepAfterSkippingSpeak(steps: WordStep[]): WordStep | null {
  return nextStep(steps, 'speak_en')
}

/** 1 correct RU + up to 3 unique distractors, shuffled. */
export function buildQuizOptions(target: NecessaryWord, pool: NecessaryWord[]): string[] {
  const distractors = shuffleInPlace(
    pool
      .filter((word) => word.id !== target.id)
      .map((word) => word.ru)
      .filter((translation, index, list) => list.indexOf(translation) === index)
  ).slice(0, 3)

  return shuffleInPlace([target.ru, ...distractors])
}
