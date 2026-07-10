import { describe, expect, it } from 'vitest'
import { getChatBubbleRadiusClass, getBubblePosition } from '@/components/chat/ChatBubble'

describe('getChatBubbleRadiusClass', () => {
  it('keeps a sharp messenger tail on solo/first user bubbles without a full rounded-[…] override', () => {
    const solo = getChatBubbleRadiusClass('user', 'solo')
    const first = getChatBubbleRadiusClass('user', 'first')

    expect(solo).toBe(first)
    expect(solo).toContain('rounded-br-md')
    expect(solo).not.toMatch(/(?:^|\s)rounded-\[[^\]]+\](?:\s|$)/)
    expect(solo).toContain('rounded-tl-[var(--bubble-radius-user,var(--bubble-radius))]')
    expect(solo).toContain('rounded-tr-[var(--bubble-radius-user,var(--bubble-radius))]')
    expect(solo).toContain('rounded-bl-[var(--bubble-radius-user,var(--bubble-radius))]')
  })

  it('uses md on the stacked right edge for middle/last user bubbles', () => {
    const last = getChatBubbleRadiusClass('user', 'last')
    expect(last).toContain('rounded-tr-md')
    expect(last).toContain('rounded-br-md')
  })
})

describe('getBubblePosition', () => {
  it('marks an isolated user message as solo', () => {
    expect(getBubblePosition('assistant', 'user', 'assistant')).toBe('solo')
  })
})
