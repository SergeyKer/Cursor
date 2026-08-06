export type TutorMicroSessionExitPhase = 'idle' | 'revealing' | 'active' | 'finale'

/**
 * Mid-cycle «Закрепить 2 мин»: loading pack or revealing/active questions.
 * Idle / finale — no SessionExit confirm.
 */
export function needsTutorMicroSessionExitGuard(input: {
  loadingMicro: boolean
  microPhase: TutorMicroSessionExitPhase
}): boolean {
  if (input.loadingMicro) return true
  return input.microPhase === 'revealing' || input.microPhase === 'active'
}
