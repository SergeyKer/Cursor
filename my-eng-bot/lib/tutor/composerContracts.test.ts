import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CHAT_INLINE_SPEAKER_BUTTON_CLASS,
  TUTOR_PAPERCLIP_BUTTON_CLASS,
} from '@/lib/tutor/composerContracts'

describe('tutor vs chat composer class contract', () => {
  it('Chat keeps inline speaker button class', () => {
    const chat = readFileSync(join(process.cwd(), 'components/Chat.tsx'), 'utf8')
    expect(chat).toContain(CHAT_INLINE_SPEAKER_BUTTON_CLASS)
  })

  it('TutorComposer uses paperclip class and never speaker class', () => {
    const tutor = readFileSync(join(process.cwd(), 'components/tutor/TutorComposer.tsx'), 'utf8')
    expect(tutor).toContain('TUTOR_PAPERCLIP_BUTTON_CLASS')
    expect(tutor).toContain(`from '@/lib/tutor/composerContracts'`)
    expect(tutor).not.toContain(CHAT_INLINE_SPEAKER_BUTTON_CLASS)
    expect(TUTOR_PAPERCLIP_BUTTON_CLASS).toBe('tutor-composer-paperclip-button')
  })

  it('Chat does not gain tutor paperclip class', () => {
    const chat = readFileSync(join(process.cwd(), 'components/Chat.tsx'), 'utf8')
    expect(chat).not.toContain(TUTOR_PAPERCLIP_BUTTON_CLASS)
  })
})
