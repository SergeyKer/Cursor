import { describe, expect, it } from 'vitest'
import {
  VOICE_COMPOSER_FINALIZING_STATUS,
  VOICE_COMPOSER_LISTENING_STATUS,
  showVoiceComposerOverlay,
  voiceComposerOverlayText,
} from './voiceComposerStatus'

describe('voiceComposerStatus', () => {
  it('shows overlay only while recording or finalizing', () => {
    expect(showVoiceComposerOverlay('idle')).toBe(false)
    expect(showVoiceComposerOverlay('error')).toBe(false)
    expect(showVoiceComposerOverlay('recording')).toBe(true)
    expect(showVoiceComposerOverlay('finalizing')).toBe(true)
  })

  it('uses listening copy for recording and finalizing copy for the spinner', () => {
    expect(voiceComposerOverlayText('recording')).toBe(VOICE_COMPOSER_LISTENING_STATUS)
    expect(voiceComposerOverlayText('idle')).toBe(VOICE_COMPOSER_LISTENING_STATUS)
    expect(voiceComposerOverlayText('finalizing')).toBe(VOICE_COMPOSER_FINALIZING_STATUS)
  })

  it('keeps ASCII ellipsis so hide-sets can match exactly', () => {
    expect(VOICE_COMPOSER_LISTENING_STATUS).toBe('Слушаю...')
    expect(VOICE_COMPOSER_FINALIZING_STATUS).toBe('Распознаю речь...')
  })
})
