import type { PracticeQuestion } from '@/types/practice'

export type PracticeCorrectionFamily = 'choiceChips' | 'voiceRepeat' | 'none'

export const PRACTICE_CHOICE_CHIP_CORRECTION_TYPES = [
  'choice',
  'listening-select',
  'speed-round',
  'context-clue',
] as const satisfies readonly PracticeQuestion['type'][]

export const PRACTICE_VOICE_REPEAT_CORRECTION_TYPES = [
  'voice-shadow',
  'dropdown-fill',
  'sentence-surgery',
  'word-builder-pro',
  'dictation',
  'free-response',
  'roleplay-mini',
  'boss-challenge',
] as const satisfies readonly PracticeQuestion['type'][]

export type PracticeChoiceChipCorrectionType = (typeof PRACTICE_CHOICE_CHIP_CORRECTION_TYPES)[number]
export type PracticeVoiceRepeatCorrectionType = (typeof PRACTICE_VOICE_REPEAT_CORRECTION_TYPES)[number]

/** Voice-repeat types with mic + textarea on primary (not dropdown / word-bank). */
export const PRACTICE_VOICE_PRIMARY_COMPOSER_TYPES = [
  'voice-shadow',
  'free-response',
  'dictation',
  'roleplay-mini',
  'boss-challenge',
] as const satisfies readonly PracticeQuestion['type'][]

export type PracticeVoicePrimaryComposerType = (typeof PRACTICE_VOICE_PRIMARY_COMPOSER_TYPES)[number]

const CHOICE_CHIP_SET = new Set<string>(PRACTICE_CHOICE_CHIP_CORRECTION_TYPES)
const VOICE_REPEAT_SET = new Set<string>(PRACTICE_VOICE_REPEAT_CORRECTION_TYPES)
const VOICE_PRIMARY_COMPOSER_SET = new Set<string>(PRACTICE_VOICE_PRIMARY_COMPOSER_TYPES)

export function isPracticeChoiceChipCorrectionType(
  type: PracticeQuestion['type'] | undefined
): type is PracticeChoiceChipCorrectionType {
  return type != null && CHOICE_CHIP_SET.has(type)
}

export function isPracticeVoiceRepeatCorrectionType(
  type: PracticeQuestion['type'] | undefined
): type is PracticeVoiceRepeatCorrectionType {
  return type != null && VOICE_REPEAT_SET.has(type)
}

export function isPracticeVoicePrimaryComposerType(
  type: PracticeQuestion['type'] | undefined
): type is PracticeVoicePrimaryComposerType {
  return type != null && VOICE_PRIMARY_COMPOSER_SET.has(type)
}

export function isPracticeRepeatCorrectionType(type: PracticeQuestion['type'] | undefined): boolean {
  return isPracticeChoiceChipCorrectionType(type) || isPracticeVoiceRepeatCorrectionType(type)
}

export function getPracticeCorrectionFamily(type: PracticeQuestion['type'] | undefined): PracticeCorrectionFamily {
  if (isPracticeChoiceChipCorrectionType(type)) return 'choiceChips'
  if (isPracticeVoiceRepeatCorrectionType(type)) return 'voiceRepeat'
  return 'none'
}

/** Chip tap commit (strict match) for all choice-chip family types. */
export function isPracticeChipSelectionType(type: PracticeQuestion['type'] | undefined): boolean {
  return isPracticeChoiceChipCorrectionType(type)
}

export function shouldKeepAudioInVoiceRepeatCorrection(type: PracticeQuestion['type'] | undefined): boolean {
  return type === 'voice-shadow' || type === 'dictation'
}

export function shouldKeepAudioInChoiceChipVoiceCorrection(type: PracticeQuestion['type'] | undefined): boolean {
  return type === 'listening-select'
}
