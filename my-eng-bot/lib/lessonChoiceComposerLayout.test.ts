import { describe, expect, it } from 'vitest'
import { resolveLessonChoiceComposerLayout } from '@/lib/lessonChoiceComposerLayout'

const fillChoiceExercise = {
  type: 'fill_choice' as const,
  options: ['a', 'b', 'c'],
  correctAnswer: 'a',
}

const baseChoiceInput = {
  exercise: fillChoiceExercise,
  deferUntilReveal: true,
  isRevealInProgress: true,
  isRevealInitializedForKey: true,
  isChoiceChipsVisible: false,
  prefersReducedMotion: false,
}

describe('resolveLessonChoiceComposerLayout', () => {
  it('non-choice exercise - mount chips, no reserve', () => {
    expect(
      resolveLessonChoiceComposerLayout({
        exercise: { type: 'translate', correctAnswer: 'Hi' },
        deferUntilReveal: true,
        isRevealInProgress: true,
        isRevealInitializedForKey: true,
        isChoiceChipsVisible: false,
        prefersReducedMotion: false,
      })
    ).toEqual({ mountChips: true, reserveMinHeight: false, lockReleased: false })
  })

  it('theory phase - reserve height for entire reveal, no chips', () => {
    expect(resolveLessonChoiceComposerLayout(baseChoiceInput)).toEqual({
      mountChips: false,
      reserveMinHeight: true,
      lockReleased: false,
    })
  })

  it('before reveal init on step transition - reserve height', () => {
    expect(
      resolveLessonChoiceComposerLayout({
        ...baseChoiceInput,
        isRevealInitializedForKey: false,
        isRevealInProgress: false,
      })
    ).toEqual({
      mountChips: false,
      reserveMinHeight: true,
      lockReleased: false,
    })
  })

  it('chips ready - mount, keep lock until height stabilizes', () => {
    expect(
      resolveLessonChoiceComposerLayout({
        ...baseChoiceInput,
        isRevealInProgress: false,
        isChoiceChipsVisible: true,
      })
    ).toEqual({ mountChips: true, reserveMinHeight: true, lockReleased: false })
  })

  it('checking phase with visible chips - keep reserve height', () => {
    expect(
      resolveLessonChoiceComposerLayout({
        exercise: fillChoiceExercise,
        deferUntilReveal: false,
        isRevealInProgress: false,
        isRevealInitializedForKey: true,
        isChoiceChipsVisible: true,
        prefersReducedMotion: false,
      })
    ).toEqual({ mountChips: true, reserveMinHeight: true, lockReleased: true })
  })

  it('reduced motion - immediate chips', () => {
    expect(
      resolveLessonChoiceComposerLayout({
        ...baseChoiceInput,
        isRevealInProgress: false,
        isChoiceChipsVisible: true,
        prefersReducedMotion: true,
      })
    ).toEqual({ mountChips: true, reserveMinHeight: false, lockReleased: true })
  })
})
