import { describe, expect, it } from 'vitest'
import {
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
  it('maps medal repeat into thesis lines without preserved medal wall', () => {
    const copy = buildLessonReturnBriefingCopy({
      briefingKind: 'medal_repeat',
      lessonTitle: 'To be',
      audience: 'adult',
      context: 'post_lesson_repeat',
      bestTotalXp: 155,
      silverCapThisRun: true,
      coinIntroContext: {
        audience: 'adult',
        lessonCoinClaimed: false,
        isGeneratedVariantRun: true,
        profileMedal: 'gold',
      },
    })
    expect(copy.title).toContain('урок')
    expect(copy.statsLine).toBe('')
    expect(copy.message).toContain('В новом варианте золото снова в цели')
    expect(copy.message).toContain('правильных ответов прибавим')
    expect(copy.message).toContain('сейчас рекорд 155 XP')
    expect(copy.message).toContain('Комбо 3/5/7')
    expect(copy.message).toContain('пропустить за монету')
    expect(copy.message).not.toContain('сохраняется')
    expect(copy.secondaryMessage).toBeUndefined()
  })

  it('shows silver cap thesis on menu reopen', () => {
    const copy = buildLessonReturnBriefingCopy({
      briefingKind: 'medal_repeat',
      lessonTitle: 'Who ...?',
      audience: 'adult',
      context: 'menu_reopen',
      bestTotalXp: 0,
      silverCapThisRun: true,
      coinIntroContext: {
        audience: 'adult',
        lessonCoinClaimed: false,
        isGeneratedVariantRun: false,
        profileMedal: 'bronze',
      },
    })
    expect(copy.statsLine).toBe('')
    expect(copy.message).toContain('максимум серебро')
    expect(copy.message).toContain('Жми Новый вариант')
    expect(copy.message).toContain('За золото награда +1 монета')
  })

  it('builds cycle1 briefing with unified thesis lines', () => {
    const copy = buildLessonReturnBriefingCopy({
      briefingKind: 'cycle1',
      lessonTitle: 'Shopping',
      audience: 'adult',
      context: 'menu_reopen',
      bestTotalXp: 0,
      silverCapThisRun: true,
      coinIntroContext: {
        audience: 'adult',
        lessonCoinClaimed: false,
        isGeneratedVariantRun: false,
        profileMedal: null,
      },
    })
    expect(copy.title).toBe('Как устроен урок')
    expect(copy.statsLine).toBe('')
    expect(copy.message).toContain('максимум серебро')
    expect(copy.message).toContain('Комбо 3/5/7')
    expect(copy.message).toContain('пропустить за монету')
    expect(copy.secondaryMessage).toBeUndefined()
  })
})

describe('buildLessonReturnBriefingBubbles', () => {
  it('uses rules intro for all kinds', () => {
    const firstRunBubble = buildLessonReturnBriefingBubbles({
      lessonTitle: 'Test',
      audience: 'adult',
      kind: 'first_run',
    })
    const cycle1Bubble = buildLessonReturnBriefingBubbles({
      lessonTitle: 'Test',
      audience: 'adult',
      kind: 'cycle1',
    })
    expect(firstRunBubble[0].content).toContain('правилах')
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
      context: 'menu_reopen',
      bestTotalXp: 100,
      silverCapThisRun: true,
      coinIntroContext: {
        audience: 'adult',
        lessonCoinClaimed: false,
        isGeneratedVariantRun: false,
        profileMedal: 'silver',
      },
    })
    expect(payload.runKey).toBe('lesson-1:run-a')
    expect(payload.bubbles).toHaveLength(1)
    expect(payload.copy.statsLine).toBe('')
    expect(payload.copy.message).toContain('Жми Новый вариант')
    expect(payload.actions).toEqual({
      offerGenerateVariant: true,
      primaryLabel: 'Повтор варианта',
      secondaryLabel: 'Новый вариант',
    })
  })

  it('offers dual CTA for cycle1 local reopen', () => {
    const payload = buildLessonReturnBriefingPayload({
      runKey: 'lesson-1:run-a',
      lessonTitle: 'Test',
      audience: 'adult',
      kind: 'cycle1',
      context: 'menu_reopen',
      bestTotalXp: 0,
      silverCapThisRun: true,
      coinIntroContext: {
        audience: 'adult',
        lessonCoinClaimed: false,
        isGeneratedVariantRun: false,
        profileMedal: null,
      },
    })
    expect(payload.copy.message).toContain('максимум серебро')
    expect(payload.actions.offerGenerateVariant).toBe(true)
  })
})
