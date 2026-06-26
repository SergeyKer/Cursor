import { describe, expect, it } from 'vitest'
import {
  getPracticeCorrectionFamily,
  isPracticeChipSelectionType,
  isPracticeChoiceChipCorrectionType,
  isPracticeRepeatCorrectionType,
  isPracticeVoiceRepeatCorrectionType,
  PRACTICE_CHOICE_CHIP_CORRECTION_TYPES,
  PRACTICE_VOICE_REPEAT_CORRECTION_TYPES,
  shouldKeepAudioInChoiceChipVoiceCorrection,
  shouldKeepAudioInVoiceRepeatCorrection,
} from '@/lib/practice/practiceCorrectionFamily'

describe('practiceCorrectionFamily', () => {
  it('classifies all 12 exercise types into repeat families', () => {
    for (const type of PRACTICE_CHOICE_CHIP_CORRECTION_TYPES) {
      expect(getPracticeCorrectionFamily(type)).toBe('choiceChips')
      expect(isPracticeRepeatCorrectionType(type)).toBe(true)
    }
    for (const type of PRACTICE_VOICE_REPEAT_CORRECTION_TYPES) {
      expect(getPracticeCorrectionFamily(type)).toBe('voiceRepeat')
      expect(isPracticeRepeatCorrectionType(type)).toBe(true)
    }
  })

  it('returns none for unknown types', () => {
    expect(getPracticeCorrectionFamily(undefined)).toBe('none')
    expect(isPracticeRepeatCorrectionType(undefined)).toBe(false)
  })

  it('maps chip selection to choice-chip family only', () => {
    expect(isPracticeChipSelectionType('choice')).toBe(true)
    expect(isPracticeChipSelectionType('listening-select')).toBe(true)
    expect(isPracticeChipSelectionType('dictation')).toBe(false)
  })

  it('keeps audio helpers separate by family', () => {
    expect(shouldKeepAudioInVoiceRepeatCorrection('voice-shadow')).toBe(true)
    expect(shouldKeepAudioInVoiceRepeatCorrection('dictation')).toBe(true)
    expect(shouldKeepAudioInVoiceRepeatCorrection('listening-select')).toBe(false)
    expect(shouldKeepAudioInChoiceChipVoiceCorrection('listening-select')).toBe(true)
    expect(shouldKeepAudioInChoiceChipVoiceCorrection('choice')).toBe(false)
  })

  it('does not overlap choice-chip and voice-repeat sets', () => {
    for (const type of PRACTICE_CHOICE_CHIP_CORRECTION_TYPES) {
      expect(isPracticeVoiceRepeatCorrectionType(type)).toBe(false)
    }
    for (const type of PRACTICE_VOICE_REPEAT_CORRECTION_TYPES) {
      expect(isPracticeChoiceChipCorrectionType(type)).toBe(false)
    }
  })
})
