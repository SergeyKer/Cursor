import { describe, expect, it } from 'vitest'
import {
  buildLessonRepeatBriefingThesisLines,
  shouldOfferGenerateVariantOnReturnBriefing,
} from './lessonRepeatBriefingThesisCopy'

describe('buildLessonRepeatBriefingThesisLines', () => {
  it('menu_reopen with silver cap shows silver, generated path, coin, combo, xp, forgiveness', () => {
    const lines = buildLessonRepeatBriefingThesisLines({
      audience: 'adult',
      lessonCoinClaimed: false,
      isGeneratedVariantRun: false,
      silverCapThisRun: true,
      context: 'menu_reopen',
      bestTotalXp: 0,
    })
    expect(lines).toHaveLength(6)
    expect(lines[0]).toContain('максимум серебро')
    expect(lines[1]).toContain('Жми Новый вариант')
    expect(lines[2]).toContain('За золото награда +1 монета')
    expect(lines[3]).toContain('Комбо 3/5/7')
    expect(lines[3]).toContain('очков опыта XP')
    expect(lines[4]).toContain('прибавим XP')
    expect(lines[4]).toContain('сейчас рекорд 0 XP')
    expect(lines[5]).toContain('пропустить за монету')
    expect(lines.join('\n')).not.toContain('—')
  })

  it('generated run shows gold on this pass without silver cap line', () => {
    const lines = buildLessonRepeatBriefingThesisLines({
      audience: 'adult',
      lessonCoinClaimed: false,
      isGeneratedVariantRun: true,
      silverCapThisRun: true,
      context: 'post_lesson_repeat',
      bestTotalXp: 120,
    })
    expect(lines).toHaveLength(5)
    expect(lines[0]).toContain('можно золото')
    expect(lines.join('\n')).not.toContain('максимум серебро')
    expect(lines[3]).toContain('сейчас рекорд 120 XP')
  })

  it('reopen without silver cap skips silver line', () => {
    const lines = buildLessonRepeatBriefingThesisLines({
      audience: 'adult',
      lessonCoinClaimed: false,
      isGeneratedVariantRun: false,
      silverCapThisRun: false,
      context: 'menu_reopen',
      bestTotalXp: 50,
    })
    expect(lines).toHaveLength(5)
    expect(lines.join('\n')).not.toContain('максимум серебро')
    expect(lines[0]).toContain('Жми Новый вариант')
  })

  it('claimed coin shows already received without plus one', () => {
    const lines = buildLessonRepeatBriefingThesisLines({
      audience: 'adult',
      lessonCoinClaimed: true,
      isGeneratedVariantRun: false,
      silverCapThisRun: true,
      context: 'menu_reopen',
      bestTotalXp: 0,
    })
    expect(lines[2]).toBe('🪙 Монета за эту тему уже получена.')
    expect(lines.join('\n')).not.toContain('награда +1')
  })
})

describe('shouldOfferGenerateVariantOnReturnBriefing', () => {
  it('is true for menu reopen silver cap local run', () => {
    expect(
      shouldOfferGenerateVariantOnReturnBriefing({
        context: 'menu_reopen',
        silverCapThisRun: true,
        isGeneratedVariantRun: false,
      })
    ).toBe(true)
  })

  it('is false for generated run', () => {
    expect(
      shouldOfferGenerateVariantOnReturnBriefing({
        context: 'menu_reopen',
        silverCapThisRun: true,
        isGeneratedVariantRun: true,
      })
    ).toBe(false)
  })

  it('is false without silver cap', () => {
    expect(
      shouldOfferGenerateVariantOnReturnBriefing({
        context: 'menu_reopen',
        silverCapThisRun: false,
        isGeneratedVariantRun: false,
      })
    ).toBe(false)
  })
})
