import type { NecessaryWord, VocabularyTempo } from '@/types/vocabulary'

export type WordStep =
  | 'show_ru'
  | 'reveal_en'
  | 'check'
  | 'check_fail_say'
  | 'speak_en'
  | 'say_phrase'
  | 'done'

function shuffleInPlace<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[items[index], items[swapIndex]] = [items[swapIndex]!, items[index]!]
  }
  return items
}

/** Sprint skips show_ru. Include say_phrase only when phraseOnThisWord. */
export function stepsForTempo(tempo: VocabularyTempo, phraseOnThisWord: boolean): WordStep[] {
  const steps: WordStep[] = []
  if (tempo === 'full') steps.push('show_ru')
  steps.push('reveal_en', 'check', 'speak_en')
  if (phraseOnThisWord) steps.push('say_phrase')
  steps.push('done')
  return steps
}

/** Middle-ish word for Sprint phrase (~1 per portion). */
export function phraseWordIndex(sessionSize: number): number {
  if (sessionSize <= 0) return 0
  return Math.floor((sessionSize - 1) / 2)
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

export function shouldIncludePhrase(tempo: VocabularyTempo, wordIndex: number, sessionSize: number): boolean {
  if (tempo === 'full') return true
  return wordIndex === phraseWordIndex(sessionSize)
}
