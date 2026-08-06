/**
 * One-shot guards for coin-forgiveness autofill.
 * Chips remount after Continue (composer swap) — consumedNonce starts null so the first fire works.
 * Remount with sticky props is blocked by clearing autofill in useLessonEngine on submit/advance.
 */

export function shouldFireLessonChoiceAutoSelect(params: {
  disabled: boolean
  autoSelectText: string | null | undefined
  autoSelectNonce: number
  consumedNonce: number | null
}): boolean {
  if (params.disabled || !params.autoSelectText || params.autoSelectNonce <= 0) return false
  if (params.consumedNonce === params.autoSelectNonce) return false
  return true
}

export function shouldFireLessonTextAutofill(params: {
  autofillAnswer: string | null | undefined
  autofillNonce: number
  consumedNonce: number
}): boolean {
  if (!params.autofillNonce || !params.autofillAnswer) return false
  if (params.autofillNonce === params.consumedNonce) return false
  return true
}
