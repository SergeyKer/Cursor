export type IntroBlockRevealParams = {
  revealEnabled: boolean
  taskBubbleIndex: number
  isRevealInitializedForKey: boolean
  isShellEnterActive: boolean
  textRevealedThroughIndex: number
  textAnimatingIndex: number | null
}

export function resolveIntroBlockTaskCardReached(params: IntroBlockRevealParams): boolean {
  const {
    revealEnabled,
    taskBubbleIndex,
    isRevealInitializedForKey,
    isShellEnterActive,
    textRevealedThroughIndex,
    textAnimatingIndex,
  } = params

  if (taskBubbleIndex < 0) return false
  if (!revealEnabled) return true
  if (!isRevealInitializedForKey) return false

  // Резерв chip-ряда с первого кадра пузыря (после init), включая shell-enter и reveal текста.
  if (isShellEnterActive) return true

  return textAnimatingIndex !== null || textRevealedThroughIndex >= 0
}

export function resolveIntroBlockChipsVisible(
  params: IntroBlockRevealParams & { stripVisible: boolean }
): boolean {
  const {
    stripVisible,
    revealEnabled,
    taskBubbleIndex,
    textAnimatingIndex,
    textRevealedThroughIndex,
  } = params

  if (!stripVisible) return false
  if (!revealEnabled) return true

  return (
    textAnimatingIndex === taskBubbleIndex || textRevealedThroughIndex >= taskBubbleIndex
  )
}
