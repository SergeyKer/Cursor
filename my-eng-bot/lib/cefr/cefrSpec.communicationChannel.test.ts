import { describe, expect, it } from 'vitest'
import { buildCefrPromptBlock } from '@/lib/cefr/cefrSpec'

describe('buildCefrPromptBlock channel chat_communication', () => {
  it('injects dialogue can-do only for chat_communication channel', () => {
    const withChannel = buildCefrPromptBlock({
      mode: 'communication',
      channel: 'chat_communication',
      level: 'a1',
      audience: 'child',
    })
    const withoutChannel = buildCefrPromptBlock({
      mode: 'communication',
      level: 'a1',
      audience: 'child',
    })
    expect(withChannel).toMatch(/Learner dialogue can-do/i)
    expect(withoutChannel).not.toMatch(/Learner dialogue can-do/i)
  })

  it('uses peer framing for C1 can-do', () => {
    const text = buildCefrPromptBlock({
      mode: 'communication',
      channel: 'chat_communication',
      level: 'c1',
      audience: 'adult',
    })
    expect(text).toMatch(/peer/i)
  })
})
