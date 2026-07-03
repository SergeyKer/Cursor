import { describe, expect, it } from 'vitest'
import {
  canCompleteChipPhase,
  PRACTICE_CORRECTION_CHIP_MS,
  PRACTICE_CORRECTION_CHIP_PHASE_MS,
  PRACTICE_CORRECTION_SAY_FADE_MS,
  PRACTICE_CORRECTION_SAY_PAUSE_MS,
  PRACTICE_CORRECTION_VOICE_READY_MS,
  shouldResetCorrectionPhase,
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

  it('shouldResetCorrectionPhase holds voice panel on feedback even when wrongAttempts reset to 0', () => {
    expect(
      shouldResetCorrectionPhase({
        isRepeatCorrectionType: true,
        isCorrectionSession: false,
        wrongAttemptsOnCurrentQuestion: 0,
        correctionPhase: 'voiceReady',
        state: 'feedback',
      })
    ).toBe(false)
  })

  it('shouldResetCorrectionPhase holds voice panel on feedback and generating_next', () => {
    expect(
      shouldResetCorrectionPhase({
        isRepeatCorrectionType: true,
        isCorrectionSession: false,
        wrongAttemptsOnCurrentQuestion: 1,
        correctionPhase: 'voiceReady',
        state: 'feedback',
      })
    ).toBe(false)

    expect(
      shouldResetCorrectionPhase({
        isRepeatCorrectionType: true,
        isCorrectionSession: false,
        wrongAttemptsOnCurrentQuestion: 2,
        correctionPhase: 'voiceReady',
        state: 'generating_next',
      })
    ).toBe(false)

    expect(
      shouldResetCorrectionPhase({
        isRepeatCorrectionType: true,
        isCorrectionSession: false,
        wrongAttemptsOnCurrentQuestion: 1,
        correctionPhase: 'voiceLocked',
        state: 'feedback',
      })
    ).toBe(false)
  })

  it('shouldResetCorrectionPhase does not reset during checking with voiceReady', () => {
    expect(
      shouldResetCorrectionPhase({
        isRepeatCorrectionType: true,
        isCorrectionSession: true,
        wrongAttemptsOnCurrentQuestion: 1,
        correctionPhase: 'voiceReady',
        state: 'checking',
      })
    ).toBe(false)
  })

  it('shouldResetCorrectionPhase does not reset during correction chips phase', () => {
    expect(
      shouldResetCorrectionPhase({
        isRepeatCorrectionType: true,
        isCorrectionSession: true,
        wrongAttemptsOnCurrentQuestion: 1,
        correctionPhase: 'chips',
        state: 'correction',
      })
    ).toBe(false)
  })

  it('shouldResetCorrectionPhase resets on feedback when not in voice panel', () => {
    expect(
      shouldResetCorrectionPhase({
        isRepeatCorrectionType: true,
        isCorrectionSession: false,
        wrongAttemptsOnCurrentQuestion: 0,
        correctionPhase: 'idle',
        state: 'feedback',
      })
    ).toBe(true)
  })

  it('shouldResetCorrectionPhase resets for non-repeat-correction types', () => {
    expect(
      shouldResetCorrectionPhase({
        isRepeatCorrectionType: false,
        isCorrectionSession: false,
        wrongAttemptsOnCurrentQuestion: 1,
        correctionPhase: 'voiceReady',
        state: 'feedback',
      })
    ).toBe(true)
  })

  it('showVoiceCorrectionComposer for choice and voice-shadow voice phases', () => {
    expect(showVoiceCorrectionComposer('idle', 'choice')).toBe(false)
    expect(showVoiceCorrectionComposer('chips', 'choice')).toBe(false)
    expect(showVoiceCorrectionComposer('voiceLocked', 'choice')).toBe(true)
    expect(showVoiceCorrectionComposer('voiceReady', 'choice')).toBe(true)
    expect(showVoiceCorrectionComposer('voiceReady', 'dictation')).toBe(true)
    expect(showVoiceCorrectionComposer('voiceLocked', 'dropdown-fill')).toBe(true)
    expect(showVoiceCorrectionComposer('chips', 'listening-select')).toBe(false)
    expect(showVoiceCorrectionComposer('voiceLocked', 'voice-shadow')).toBe(true)
    expect(showVoiceCorrectionComposer('voiceReady', 'voice-shadow')).toBe(true)
    expect(showVoiceCorrectionComposer('chips', 'voice-shadow')).toBe(false)
  })
})
