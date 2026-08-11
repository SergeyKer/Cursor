export type StashedLessonAdvanceKind = 'variant' | 'step' | 'finale'

export type StashedLessonAdvance = {
  kind: StashedLessonAdvanceKind
  onAdvance: () => void
}

/** While forgiveness applied-ack is up, success hold must not run. */
export function shouldDeferLessonSuccessAdvance(blocksAdvance: boolean): boolean {
  return blocksAdvance
}

export function stashLessonSuccessAdvance(
  _previous: StashedLessonAdvance | null,
  incoming: StashedLessonAdvance
): StashedLessonAdvance {
  return incoming
}

export function takeStashedLessonAdvance(
  stashed: StashedLessonAdvance | null
): { next: null; runNow: StashedLessonAdvance | null } {
  return { next: null, runNow: stashed }
}
