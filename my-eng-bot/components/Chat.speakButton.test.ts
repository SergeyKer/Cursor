import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Chat speak button', () => {
  it('uses system speak and stops Grok instead of playCommunicationTts', () => {
    const src = readFileSync(new URL('./Chat.tsx', import.meta.url), 'utf8')
    const start = src.indexOf('const handleSpeak = () => {')
    const end = src.indexOf('const hasVisibleRussianDrillInvite')
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    const block = src.slice(start, end)
    expect(block).toContain('stopCommunicationTts()')
    expect(block).toContain('speak(speakText, voiceId')
    expect(block).not.toContain('playCommunicationTts')
  })
})
