import { describe, expect, it } from 'vitest'

import {

  isPracticeChoiceCorrectionComposerLocked,

  isVoiceComposerLocked,

  PRACTICE_CHOICE_CORRECTION_UNLOCK_PAUSE_MS,

} from '@/lib/practice/practiceCorrectionReveal'

import { LESSON_TEXT_SECTION_PAUSE_MS } from '@/lib/lessonRevealTiming'



describe('practiceCorrectionReveal', () => {

  it('uses lesson section pause for say delay alias', () => {

    expect(PRACTICE_CHOICE_CORRECTION_UNLOCK_PAUSE_MS).toBe(LESSON_TEXT_SECTION_PAUSE_MS)

  })



  it('does not lock voice composer on correction phase alone', () => {
    expect(isVoiceComposerLocked('voiceLocked', false)).toBe(false)
    expect(isVoiceComposerLocked('voiceReady', false)).toBe(false)
    expect(isVoiceComposerLocked('chips', false)).toBe(false)
  })



  it('respects base lock during voiceReady', () => {

    expect(isVoiceComposerLocked('voiceReady', true)).toBe(true)

  })



  it('extends base lock while unlock is pending (legacy)', () => {

    expect(isPracticeChoiceCorrectionComposerLocked(false, false, true)).toBe(true)

    expect(isPracticeChoiceCorrectionComposerLocked(false, true, true)).toBe(false)

    expect(isPracticeChoiceCorrectionComposerLocked(true, true, false)).toBe(true)

  })

})

