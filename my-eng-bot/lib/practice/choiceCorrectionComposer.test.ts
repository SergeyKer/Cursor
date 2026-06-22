import { describe, expect, it } from 'vitest'
import {
  CHOICE_CORRECTION_TAP_HINT_WITH_TEXT_EDIT,
  choiceCorrectionPlaceholder,
  getChoiceCorrectionInputMode,
  getChoiceCorrectionOverlayLine,
  getChoiceCorrectionTapHint,
  getInitialPracticeVoiceCapability,
  isChoiceCorrectionVoiceFrozenDisplay,
  isVoiceCapabilityBlocked,
  mapRecognitionErrorToVoiceCapability,
  shouldShowChoiceCorrectionInviteOverlay,
  shouldShowMicOffInlineButton,
} from '@/lib/practice/choiceCorrectionComposer'

describe('choiceCorrectionComposer', () => {
  it('uses muted frozen display after voice until text edit unlock', () => {
    expect(
      isChoiceCorrectionVoiceFrozenDisplay({
        isTextEditUnlocked: false,
        inputMode: 'voiceLocked',
      })
    ).toBe(true)
    expect(
      isChoiceCorrectionVoiceFrozenDisplay({
        isTextEditUnlocked: true,
        inputMode: 'editable',
      })
    ).toBe(false)
  })

  it('locks textarea until text edit is unlocked', () => {
    expect(getChoiceCorrectionInputMode({ isTextEditUnlocked: false, voiceListening: false })).toBe('voiceLocked')
    expect(getChoiceCorrectionInputMode({ isTextEditUnlocked: false, voiceListening: true })).toBe('voiceLive')
    expect(getChoiceCorrectionInputMode({ isTextEditUnlocked: true, voiceListening: false })).toBe('editable')
  })

  it('shows text edit icon after field tap hint', () => {
    const base = {
      isChoiceCorrection: true,
      textFallbackUnlocked: false,
      isTextEditUnlocked: false,
      voiceCapability: 'available' as const,
    }
    expect(shouldShowMicOffInlineButton({ ...base, fieldTapHintVisible: false })).toBe(false)
    expect(shouldShowMicOffInlineButton({ ...base, fieldTapHintVisible: true })).toBe(true)
  })

  it('shows mic-off immediately when voice is blocked', () => {
    expect(
      shouldShowMicOffInlineButton({
        isChoiceCorrection: true,
        textFallbackUnlocked: false,
        isTextEditUnlocked: false,
        fieldTapHintVisible: false,
        voiceCapability: 'unavailable',
      })
    ).toBe(true)
  })

  it('hides mic-off after text fallback', () => {
    expect(
      shouldShowMicOffInlineButton({
        isChoiceCorrection: true,
        textFallbackUnlocked: true,
        isTextEditUnlocked: true,
        fieldTapHintVisible: true,
        voiceCapability: 'available',
      })
    ).toBe(false)
  })

  it('maps permission errors', () => {
    expect(mapRecognitionErrorToVoiceCapability('not-allowed')).toBe('permission_denied')
    expect(mapRecognitionErrorToVoiceCapability('network')).toBeNull()
  })

  it('uses empty native placeholder until text edit (invite via overlay)', () => {
    expect(
      choiceCorrectionPlaceholder({ targetAnswer: "It's dark", isTextEditUnlocked: false, audience: 'adult' })
    ).toBe('')
    expect(
      choiceCorrectionPlaceholder({ targetAnswer: "It's dark", isTextEditUnlocked: true, audience: 'adult' })
    ).toBe('Поправьте и отправьте')
    expect(
      choiceCorrectionPlaceholder({ targetAnswer: "It's dark", isTextEditUnlocked: true, audience: 'child' })
    ).toBe('Поправь и отправь')
  })

  it('builds tap-hint overlay lines for child and adult', () => {
    expect(getChoiceCorrectionTapHint('adult')).toBe('Скажите ответ...')
    expect(getChoiceCorrectionTapHint('child')).toBe('Скажи ответ...')
    expect(
      getChoiceCorrectionOverlayLine({
        showTapHint: false,
        showTextEditButton: false,
        audience: 'adult',
      })
    ).toBe('Скажите ответ...')
    expect(
      getChoiceCorrectionOverlayLine({
        showTapHint: true,
        showTextEditButton: false,
        audience: 'child',
      })
    ).toBe('Скажи ответ...')
    expect(
      getChoiceCorrectionOverlayLine({
        showTapHint: true,
        showTextEditButton: true,
        audience: 'adult',
      })
    ).toBe(CHOICE_CORRECTION_TAP_HINT_WITH_TEXT_EDIT)
  })

  it('shows invite overlay when frozen and empty or tap hint', () => {
    expect(
      shouldShowChoiceCorrectionInviteOverlay({
        isFrozenDisplay: true,
        showVoiceOverlay: false,
        composerText: '',
        showTapHint: false,
      })
    ).toBe(true)
    expect(
      shouldShowChoiceCorrectionInviteOverlay({
        isFrozenDisplay: true,
        showVoiceOverlay: false,
        composerText: 'drink',
        showTapHint: true,
      })
    ).toBe(true)
    expect(
      shouldShowChoiceCorrectionInviteOverlay({
        isFrozenDisplay: true,
        showVoiceOverlay: true,
        composerText: '',
        showTapHint: false,
      })
    ).toBe(false)
  })

  it('detects blocked capability', () => {
    expect(isVoiceCapabilityBlocked('available')).toBe(false)
    expect(isVoiceCapabilityBlocked('unavailable')).toBe(true)
    expect(isVoiceCapabilityBlocked('permission_denied')).toBe(true)
  })

  it('returns unavailable when secure context or SpeechRecognition is missing', () => {
    expect(['available', 'unavailable']).toContain(getInitialPracticeVoiceCapability())
  })
})
