import { describe, expect, it } from 'vitest'
import {
  canCompleteChipPhase,
  PRACTICE_CORRECTION_CHIP_MS,
  PRACTICE_CORRECTION_CHIP_PHASE_MS,
  PRACTICE_CORRECTION_SAY_FADE_MS,
  PRACTICE_CORRECTION_SAY_PAUSE_MS,
  PRACTICE_CORRECTION_VOICE_READY_MS,
  showVoiceCorrectionComposer,
} from '@/lib/practice/practiceChoiceCorrectionPhase'
import { LESSON_TEXT_FADE_MS, LESSON_TEXT_SECTION_PAUSE_MS } from '@/lib/lessonRevealTiming'

describe('practiceChoiceCorrectionPhase', () => {
  it('uses practice chip highlight and lesson say timing constants', () => {
    expect(PRACTICE_CORRECTION_CHIP_MS).toBe(2000)
    expect(PRACTICE_CORRECTION_CHIP_PHASE_MS).toBe(2900)
    expect(PRACTICE_CORRECTION_SAY_PAUSE_MS).toBe(LESSON_TEXT_SECTION_PAUSE_MS)
    expect(PRACTICE_CORRECTION_SAY_FADE_MS).toBe(LESSON_TEXT_FADE_MS)
    expect(PRACTICE_CORRECTION_VOICE_READY_MS).toBe(2900)
  })

  it('canCompleteChipPhase requires both chip timer and scroll', () => {
    expect(canCompleteChipPhase(false, false)).toBe(false)
    expect(canCompleteChipPhase(true, false)).toBe(false)
    expect(canCompleteChipPhase(false, true)).toBe(false)
    expect(canCompleteChipPhase(true, true)).toBe(true)
  })

  it('voice-shadow correction uses same gate as choice chips (pause timer + scroll)', () => {
    expect(canCompleteChipPhase(true, false)).toBe(false)
    expect(canCompleteChipPhase(false, true)).toBe(false)
    expect(canCompleteChipPhase(true, true)).toBe(true)
  })

  it('showVoiceCorrectionComposer for choice and voice-shadow voice phases', () => {
    expect(showVoiceCorrectionComposer('idle', 'choice')).toBe(false)
    expect(showVoiceCorrectionComposer('chips', 'choice')).toBe(false)
    expect(showVoiceCorrectionComposer('voiceLocked', 'choice')).toBe(true)
    expect(showVoiceCorrectionComposer('voiceReady', 'choice')).toBe(true)
    expect(showVoiceCorrectionComposer('voiceReady', 'dictation')).toBe(false)
    expect(showVoiceCorrectionComposer('voiceLocked', 'voice-shadow')).toBe(true)
    expect(showVoiceCorrectionComposer('voiceReady', 'voice-shadow')).toBe(true)
    expect(showVoiceCorrectionComposer('chips', 'voice-shadow')).toBe(false)
  })
})
