import { describe, expect, it } from 'vitest'
import {
  CHAT_COMPOSER_COLUMN_SHELL_CLASS,
  CHAT_COMPOSER_FORM_CLASS,
  CHAT_COMPOSER_INPUT_ROW_CLASS,
  CHAT_COMPOSER_PADDING_BOTTOM,
  CHAT_COMPOSER_STACK_CLASS,
  CHAT_COMPOSER_STACK_TOP_CLASS,
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

  it('exposes shared layout constants aligned with Chat composer', () => {
    expect(CHAT_COMPOSER_FORM_CLASS).toContain('items-center')
    expect(CHAT_COMPOSER_FORM_CLASS).toContain('py-1.5')
    expect(CHAT_COMPOSER_STACK_TOP_CLASS).toBe('pt-2.5')
    expect(CHAT_COMPOSER_PADDING_BOTTOM).toContain('0.625rem')
    expect(CHAT_COMPOSER_INPUT_ROW_CLASS).toContain('items-center')
    expect(CHAT_COMPOSER_COLUMN_SHELL_CLASS).toContain('flex-col')
  })
})
