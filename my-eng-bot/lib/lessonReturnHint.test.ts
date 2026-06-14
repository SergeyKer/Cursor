import { describe, expect, it } from 'vitest'
import {
  buildLessonCycle1BriefingCopy,
  buildLessonReturnBriefingBubbles,
  buildLessonReturnBriefingCopy,
  buildLessonReturnBriefingPayload,
} from '@/lib/lessonReturnBriefingCopy'
import { buildLessonReturnHint } from '@/lib/lessonReturnHint'

describe('buildLessonReturnHint', () => {
  it('builds menu reopen hint without repeat cap line', () => {
    const text = buildLessonReturnHint({
      medal: 'gold',
      audience: 'adult',
      context: 'menu_reopen',
      bestTotalXp: 170,
    })
    expect(text).toContain('сохраняется')
    expect(text).toContain('170 XP')
    expect(text).not.toContain('максимум серебро')
  })

  it('builds post lesson repeat hint with cap line', () => {
    const text = buildLessonReturnHint({
      medal: 'gold',
      audience: 'adult',
      context: 'post_lesson_repeat',
      bestTotalXp: 170,
    })
    expect(text).toContain('максимум серебро')
    expect(text.split('\n')).toHaveLength(3)
  })
})

describe('buildLessonReturnBriefingCopy', () => {
  it('maps medal repeat lines into card fields', () => {
    const copy = buildLessonReturnBriefingCopy({
      medal: 'gold',
      lessonTitle: 'To be',
      audience: 'adult',
      context: 'post_lesson_repeat',
      bestTotalXp: 155,
    })
    expect(copy.title).toContain('урок')
    expect(copy.message).toContain('сохраняется')
    expect(copy.message).toContain('155 XP')
    expect(copy.secondaryMessage).toContain('максимум серебро')
    expect(copy.icon).toBe('🥇')
  })

  it('builds cycle1 briefing copy from hint lines', () => {
    const copy = buildLessonCycle1BriefingCopy({
      lessonTitle: 'Shopping',
      audience: 'adult',
      origin: 'menu_reopen',
    })
    expect(copy.message).toContain('без золота')
    expect(copy.secondaryMessage).toContain('серебро')
  })
})

describe('buildLessonReturnBriefingBubbles', () => {
  it('uses different intro for cycle1', () => {
    const medalBubble = buildLessonReturnBriefingBubbles({
      lessonTitle: 'Test',
      audience: 'adult',
      kind: 'medal_repeat',
    })
    const cycle1Bubble = buildLessonReturnBriefingBubbles({
      lessonTitle: 'Test',
      audience: 'adult',
      kind: 'cycle1',
    })
    expect(medalBubble[0].content).toContain('правилах')
    expect(cycle1Bubble[0].content).toContain('правилах')
  })
})

describe('buildLessonReturnBriefingPayload', () => {
  it('assembles run payload', () => {
    const payload = buildLessonReturnBriefingPayload({
      runKey: 'lesson-1:run-a',
      lessonTitle: 'Test',
      audience: 'adult',
      kind: 'medal_repeat',
      medal: 'silver',
      context: 'menu_reopen',
      bestTotalXp: 100,
    })
    expect(payload.runKey).toBe('lesson-1:run-a')
    expect(payload.bubbles).toHaveLength(1)
    expect(payload.copy.statsLine).toContain('100 XP')
  })
})
