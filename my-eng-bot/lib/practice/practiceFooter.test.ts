import { describe, expect, it } from 'vitest'
import { formatFooterDynamicLine, FOOTER_DYNAMIC_MAX_LENGTH } from '@/lib/footerVoice'
import { getPracticeFooterView } from '@/lib/practice/practiceFooter'
import { buildPracticeFooterLive } from '@/lib/practice/practiceFooterLive'
import type { PracticeSession } from '@/types/practice'
import { createEmptyPracticeTopicProgress } from '@/types/practiceTopicProgress'

function baseSession(): PracticeSession {
  return {
    id: 'p1',
    lessonId: '1',
    topic: 'Это / Пора',
    level: 'A1',
    mode: 'relaxed',
    entrySource: 'menu',
    generationSource: 'local',
    source: { kind: 'static_lesson', lessonId: '1' },
    status: 'active',
    questions: [{ id: 'q1', lessonId: '1', type: 'choice', prompt: 'Test', targetAnswer: 'A', acceptedAnswers: ['A'], xpBase: 5, difficulty: 1, tolerance: 'normalized' }],
    currentIndex: 0,
    answers: [],
    score: 0,
    xp: 0,
    streak: 0,
    startedAt: 1,
    version: 1,
    instructionAcknowledged: false,
  }
}

describe('getPracticeFooterView briefing', () => {
  it('fits default footer dynamic line limit without ellipsis', () => {
    const { dynamicText } = getPracticeFooterView(baseSession(), 'briefing')
    const shown = formatFooterDynamicLine(dynamicText)
    expect(shown).toBe(dynamicText)
    expect(shown.length).toBeLessThanOrEqual(FOOTER_DYNAMIC_MAX_LENGTH)
    expect(shown.endsWith('…')).toBe(false)
  })
})

describe('getPracticeFooterView progress total', () => {
  it('shows target question count for incremental AI reference sessions', () => {
    const session: PracticeSession = {
      ...baseSession(),
      mode: 'reference',
      generationSource: 'ai_generated',
      targetQuestionCount: 7,
      questions: [baseSession().questions[0]!],
      currentIndex: 0,
    }
    const { staticText } = getPracticeFooterView(session, 'active')
    expect(staticText).toContain('1/7')
  })
})

describe('buildPracticeFooterLive progress total', () => {
  it('shows target question count in goal segment for incremental AI reference sessions', () => {
    const session: PracticeSession = {
      ...baseSession(),
      mode: 'reference',
      generationSource: 'ai_generated',
      targetQuestionCount: 7,
      questions: [baseSession().questions[0]!],
      currentIndex: 0,
    }
    const { lessonSegments } = buildPracticeFooterLive({
      session,
      state: 'idle',
      tier: 0,
      progress: createEmptyPracticeTopicProgress('1'),
      gemsPending: false,
    })
    expect(lessonSegments[0]?.text).toBe('🎯 1/7')
    expect(lessonSegments.some((segment) => segment.text.startsWith('📝'))).toBe(false)
  })
})
