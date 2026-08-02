import { gateReferenceSheetIntro } from '@/lib/reference/sheetOutputGate'
import type { LessonIntro } from '@/types/lesson'

export type SheetEvalFixture = {
  id: string
  query: string
  level: string
  intro: LessonIntro
  expectedAnchor?: string
}

export type SheetEvalResult = {
  total: number
  passed: number
  score: number
  rejected: string[]
}

export function evaluateReferenceSheetFixtures(fixtures: SheetEvalFixture[]): SheetEvalResult {
  const rejected: string[] = []
  for (const fixture of fixtures) {
    const result = gateReferenceSheetIntro({
      ok: true,
      intro: fixture.intro,
      lessonTitle: fixture.intro.topic,
      enAnchor: fixture.expectedAnchor ?? fixture.query,
    })
    if (result.reject) rejected.push(`${fixture.id}:${result.reason}`)
  }
  return {
    total: fixtures.length,
    passed: fixtures.length - rejected.length,
    score: fixtures.length ? (fixtures.length - rejected.length) / fixtures.length : 0,
    rejected,
  }
}

/** Lightweight pair contract for local Explain → Sheet fixtures. */
export function pairReferenceFixture(params: {
  canonicalKey: string
  sheetTopic: string
  examplesEn: string[]
}): boolean {
  const topic = params.sheetTopic.trim().toLowerCase().replace(/[\s-]+/g, '_')
  const key = params.canonicalKey.trim().toLowerCase().replace(/[\s-]+/g, '_')
  return Boolean(
    key &&
      topic &&
      (topic.includes(key) || key.includes(topic)) &&
      params.examplesEn.some((example) => example.trim().length > 0)
  )
}
