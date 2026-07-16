import { describe, expect, it } from 'vitest'
import { getAllQuickTestBanks } from '@/lib/quickTest/catalog'
import { validateAllQuickTestBanks } from '@/lib/quickTest/contentValidator'
import { shuffleOptionsDeterministic } from '@/lib/quickTest/shuffleOptions'
import {
  countCorrect,
  formatDuration,
  scoreBandFromCorrect,
  pickPrimaryMistakeTag,
} from '@/lib/quickTest/scoring'
import {
  DEFAULT_VARIANT_ID,
  hasAnotherVariant,
  markVariantCompleted,
  selectVariantId,
} from '@/lib/quickTest/selectVariant'
import { getLessonTopicBySlug } from '@/lib/lessonCatalog'
import { assertAnalyticsProps } from '@/lib/quickTest/analytics'
import { buildQuickTestSharePayload } from '@/lib/quickTest/shareCopy'
import { INTENT_TTL_MS } from '@/lib/quickTest/openLessonIntent'

describe('quickTest content banks', () => {
  it('pass content contract', () => {
    const errors = validateAllQuickTestBanks(getAllQuickTestBanks())
    expect(errors).toEqual([])
  })

  it('who-likes has 3 variants', () => {
    const bank = getAllQuickTestBanks().find((b) => b.slug === 'who-likes')
    expect(bank?.variants).toHaveLength(3)
  })
})

describe('shuffleOptionsDeterministic', () => {
  it('is stable for same seed', () => {
    const options = ['a', 'b', 'c'] as [string, string, string]
    const a = shuffleOptionsDeterministic(options, 0, 'variant-1:q1')
    const b = shuffleOptionsDeterministic(options, 0, 'variant-1:q1')
    expect(a).toEqual(b)
    expect(a.options[a.correctIndex]).toBe('a')
  })
})

describe('scoring', () => {
  it('maps bands', () => {
    expect(scoreBandFromCorrect(5)).toBe('perfect')
    expect(scoreBandFromCorrect(4)).toBe('strong')
    expect(scoreBandFromCorrect(2)).toBe('start')
  })

  it('counts and picks mistake tag', () => {
    const answers = [
      { questionId: '1', selectedIndex: 0, correct: false, mistakeTag: 'who-extra-does' },
      { questionId: '2', selectedIndex: 1, correct: true, mistakeTag: 'who-extra-does' },
      { questionId: '3', selectedIndex: 2, correct: false, mistakeTag: 'who-extra-does' },
    ]
    expect(countCorrect(answers)).toBe(1)
    expect(pickPrimaryMistakeTag(answers)).toBe('who-extra-does')
  })

  it('formats duration', () => {
    expect(formatDuration(72000)).toBe('1:12')
  })
})

describe('selectVariant', () => {
  it('forces default for deep link', () => {
    expect(
      selectVariantId({
        slug: 'who-likes',
        completedVariantIds: ['variant-1'],
        forceDefault: true,
      })
    ).toBe(DEFAULT_VARIANT_ID)
  })

  it('picks next incomplete', () => {
    expect(
      selectVariantId({
        slug: 'who-likes',
        completedVariantIds: ['variant-1'],
      })
    ).toBe('variant-2')
  })

  it('hasAnotherVariant skips current', () => {
    expect(hasAnotherVariant('who-likes', ['variant-1'], 'variant-2')).toBe('variant-3')
    expect(hasAnotherVariant('who-likes', ['variant-1', 'variant-2'], 'variant-3')).toBeNull()
  })

  it('markVariantCompleted is idempotent', () => {
    const once = markVariantCompleted({ byLessonId: {} }, '2', 'variant-1')
    const twice = markVariantCompleted(once, '2', 'variant-1')
    expect(twice.byLessonId['2']?.completedVariantIds).toEqual(['variant-1'])
  })
})

describe('getLessonTopicBySlug', () => {
  it('resolves who-likes', () => {
    expect(getLessonTopicBySlug('who-likes')?.id).toBe('2')
    expect(getLessonTopicBySlug('missing')).toBeNull()
  })
})

describe('share + analytics', () => {
  it('builds absolute share url with from=share', () => {
    const payload = buildQuickTestSharePayload({
      slug: 'who-likes',
      topicTitle: 'Who ...?',
      correct: 4,
      total: 5,
      durationLabel: '1:12',
      origin: 'https://example.com',
    })
    expect(payload.url).toBe('https://example.com/test/who-likes?from=share')
    expect(payload.text).toContain('4/5')
    expect(payload.text).toContain(payload.url)
  })

  it('requires core analytics props', () => {
    expect(assertAnalyticsProps('finale_view', { entrySource: 'test_lobby', slug: 'who-likes' })).toContain(
      'scoreBand'
    )
    expect(
      assertAnalyticsProps('finale_view', {
        entrySource: 'test_lobby',
        slug: 'who-likes',
        scoreBand: 'strong',
        variantId: 'variant-1',
      })
    ).toEqual([])
    expect(
      assertAnalyticsProps('share_copy', {
        entrySource: 'test_lobby',
        slug: 'who-likes',
        scoreBand: 'start',
        ctaPosition: 'finale_tertiary',
      })
    ).toEqual([])
  })
})

describe('intent TTL constant', () => {
  it('is 10 minutes', () => {
    expect(INTENT_TTL_MS).toBe(10 * 60 * 1000)
  })
})
