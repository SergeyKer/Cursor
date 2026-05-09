import { describe, expect, it } from 'vitest'
import {
  ENGVO_CALL_FINISHED_ASSISTANT_TEXT,
  ENGVO_DIALING_ASSISTANT_TEXT,
} from '@/lib/engvo/constants'
import { buildEngvoRealtimeReplayItems } from '@/lib/engvo/realtimeReplay'

describe('buildEngvoRealtimeReplayItems', () => {
  it('skips welcome, finished line, dialing and builds user/assistant items', () => {
    const items = buildEngvoRealtimeReplayItems([
      { role: 'assistant', content: 'Welcome', engvoLocalWelcome: true },
      { role: 'assistant', content: 'Hello there!' },
      { role: 'user', content: 'Hi!' },
      { role: 'assistant', content: ENGVO_CALL_FINISHED_ASSISTANT_TEXT },
      { role: 'assistant', content: ENGVO_DIALING_ASSISTANT_TEXT, engvoServiceLine: true },
    ])
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello there!' }],
    })
    expect(items[1]).toMatchObject({
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: 'Hi!' }],
    })
  })
})
