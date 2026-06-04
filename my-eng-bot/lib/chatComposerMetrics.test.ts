import { describe, expect, it } from 'vitest'
import {
  CHAT_COMPOSER_TYPO_CLASS,
  getChatComposerOverlayVerticalClass,
  getChatComposerTextareaVerticalClass,
} from '@/lib/chatComposerMetrics'

describe('chatComposerMetrics', () => {
  it('exposes stable typo class without padding utilities', () => {
    expect(CHAT_COMPOSER_TYPO_CLASS).toContain('text-base')
    expect(CHAT_COMPOSER_TYPO_CLASS).toContain('leading-[1.45rem]')
    expect(CHAT_COMPOSER_TYPO_CLASS).not.toContain('py-')
  })

  it('maps textarea vertical classes for idle and STT', () => {
    expect(getChatComposerTextareaVerticalClass(false)).toBe('chat-composer-vertical-align')
    expect(getChatComposerTextareaVerticalClass(true)).toBe(
      'chat-composer-vertical-align chat-input-voice-web-metrics'
    )
  })

  it('maps overlay vertical classes for idle and STT', () => {
    expect(getChatComposerOverlayVerticalClass(false)).toBe('chat-composer-vertical-align')
    expect(getChatComposerOverlayVerticalClass(true)).toBe('voice-composer-web-metrics')
  })
})
