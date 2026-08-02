import { describe, expect, it } from 'vitest'
import { buildReferenceSheetPrompt } from '@/lib/reference/sheetPrompt'
import { evaluateReferenceSheetFixtures, pairReferenceFixture, type SheetEvalFixture } from '@/lib/reference/sheetEval'
import type { LessonIntro } from '@/types/lesson'

function fixture(id: string, level: string, query: string): SheetEvalFixture {
  const intro: LessonIntro = {
    topic: query,
    kind: 'single_rule',
    complexity: level === 'A1' ? 'simple' : 'medium',
    quick: {
      why: ['Это помогает выбрать правильную форму.'],
      how: ['Проверь подлежащее и время.'],
      examples: [{ en: 'I work every day.', ru: 'Я работаю каждый день.', note: 'Обычное действие.' }],
      takeaway: 'Сначала определи смысл и подлежащее.',
    },
    deepDive: {
      commonMistakes: ['Не смешивай формы без причины.'],
      contrastNotes: [],
      selfCheckRule: 'Могу объяснить, почему выбрал эту форму.',
    },
  }
  return { id, query, level, intro }
}

const faqFixtures = Array.from({ length: 10 }, (_, index) => fixture(`faq-${index}`, 'A2', `FAQ question ${index}`))
const syllabusFixtures = [
  fixture('a1-to-be', 'A1', 'to be'),
  fixture('a1-articles', 'A1', 'articles'),
  fixture('a2-questions', 'A2', 'questions'),
  fixture('a2-present', 'A2', 'present simple'),
  fixture('b1-perfect', 'B1', 'present perfect'),
  fixture('b1-conditionals', 'B1', 'conditionals'),
  fixture('b2-passive', 'B2', 'passive voice'),
  fixture('b2-reported', 'B2', 'reported speech'),
]

describe('reference sheet Eval A/B', () => {
  it('passes FAQ Eval A at or above 90%', () => {
    const result = evaluateReferenceSheetFixtures(faqFixtures)
    expect(result.score).toBeGreaterThanOrEqual(0.9)
    expect(result.rejected).toEqual([])
  })

  it('passes syllabus Eval B at the acceptable threshold', () => {
    const result = evaluateReferenceSheetFixtures(syllabusFixtures)
    expect(result.score).toBeGreaterThanOrEqual(0.85)
  })

  it('checks explain-sheet pair and rejects prompt-shaped output', () => {
    expect(
      pairReferenceFixture({
        canonicalKey: 'present_simple',
        sheetTopic: 'Present simple',
        examplesEn: ['I work every day.'],
      })
    ).toBe(true)
    const prompt = buildReferenceSheetPrompt({ query: 'present simple', level: 'A2' })
    expect(prompt.system).toContain('только JSON')
    expect(prompt.system).toContain('Нельзя цитировать')
  })
})
