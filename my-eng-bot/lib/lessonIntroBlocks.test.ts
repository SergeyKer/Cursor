import { describe, expect, it } from 'vitest'
import { getAllStructuredLessons } from '@/lib/structuredLessons'
import {
  formatIntroBlockBullets,
  LESSON_INTRO_HOW_LABEL,
  LESSON_INTRO_THEORY_LABEL,
  resolveHowBlock,
  resolveLessonIntroBlocks,
  resolveTheoryBlock,
} from '@/lib/lessonIntroBlocks'
import type { LessonIntro, LessonIntroBlock } from '@/types/lesson'

const structuredLessons = getAllStructuredLessons()

describe('resolveTheoryBlock', () => {
  it('returns null when intro is missing', () => {
    expect(resolveTheoryBlock(null)).toBeNull()
    expect(resolveTheoryBlock(undefined)).toBeNull()
  })

  it.each(structuredLessons.map((lesson) => [lesson.id, lesson.intro] as const))(
    'lesson %s exposes three theory bullets from quick.why',
    (_id, intro) => {
      const block = resolveTheoryBlock(intro)
      expect(block).not.toBeNull()
      expect(block?.label).toBe(LESSON_INTRO_THEORY_LABEL)
      expect(block?.bullets).toHaveLength(3)
      expect(block?.bullets).toEqual(intro!.quick.why)
    }
  )

  it('prefers grammarRule override when provided', () => {
    const intro: LessonIntro = {
      topic: 'Test',
      kind: 'single_rule',
      complexity: 'simple',
      quick: {
        why: ['default why'],
        how: ['default how'],
        examples: [],
        takeaway: 'takeaway',
      },
      grammarRule: {
        label: 'Custom rule',
        bullets: ['override one', 'override two'],
      },
    }

    expect(resolveTheoryBlock(intro)).toEqual({
      label: 'Custom rule',
      bullets: ['override one', 'override two'],
    })
  })
})

describe('resolveHowBlock', () => {
  it('returns null when intro is missing', () => {
    expect(resolveHowBlock(null)).toBeNull()
  })

  it.each(structuredLessons.map((lesson) => [lesson.id, lesson.intro] as const))(
    'lesson %s exposes three how bullets from quick.how',
    (_id, intro) => {
      const block = resolveHowBlock(intro)
      expect(block).not.toBeNull()
      expect(block?.label).toBe(LESSON_INTRO_HOW_LABEL)
      expect(block?.bullets).toHaveLength(3)
      expect(block?.bullets).toEqual(intro!.quick.how)
    }
  )

  it('prefers howGuide override when provided', () => {
    const intro: LessonIntro = {
      topic: 'Test',
      kind: 'single_rule',
      complexity: 'simple',
      quick: {
        why: ['why'],
        how: ['default how'],
        examples: [],
        takeaway: 'takeaway',
      },
      howGuide: {
        label: 'Custom how',
        bullets: ['step one'],
      },
    }

    expect(resolveHowBlock(intro)).toEqual({
      label: 'Custom how',
      bullets: ['step one'],
    })
  })
})

describe('resolveLessonIntroBlocks', () => {
  it('returns both blocks for structured lessons', () => {
    for (const lesson of structuredLessons) {
      const blocks = resolveLessonIntroBlocks(lesson.intro)
      expect(blocks.theory?.bullets.length).toBeGreaterThan(0)
      expect(blocks.how?.bullets.length).toBeGreaterThan(0)
    }
  })
})

describe('formatIntroBlockBullets', () => {
  it('formats bullets with leading dot markers', () => {
    const block: LessonIntroBlock = {
      label: LESSON_INTRO_THEORY_LABEL,
      bullets: ['line one', 'line two'],
    }

    expect(formatIntroBlockBullets(block)).toBe('• line one\n• line two')
  })
})
