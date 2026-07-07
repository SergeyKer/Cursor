import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { buildPracticeQuestionFingerprintFromQuestion } from '@/lib/practice/questionFingerprint'
import { pickFreshReferencePracticeQuestion } from '@/lib/practice/pickFreshReferencePracticeQuestion'
import { normalizeAiPracticeQuestion } from '@/lib/practice/normalizeAiPracticeQuestion'
import type { PracticeQuestion } from '@/types/practice'

function buildCandidate(prompt: string, targetAnswer: string): PracticeQuestion {
  return {
    id: 'c1',
    lessonId: '1',
    type: 'listening-select',
    prompt,
    targetAnswer,
    audioText: targetAnswer,
    options: [targetAnswer, 'B', 'C'],
    acceptedAnswers: [],
    xpBase: 6,
    difficulty: 2,
    tolerance: 'soft',
  }
}

describe('pickFreshReferencePracticeQuestion', () => {
  it('skips candidates with matching recent prompt', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const first = normalizeAiPracticeQuestion(
      {
        type: 'listening-select',
        prompt: 'Ситуация: На улице темно. Прослушайте фразу и выберите правильный ответ.',
        targetAnswer: "It's dark.",
        options: ["It's dark.", "It's cold.", "It's time to sleep."],
        audioText: "It's dark.",
      },
      lesson!,
      0,
      { mode: 'reference', referenceExerciseType: 'listening-select' }
    )
    const second = normalizeAiPracticeQuestion(
      {
        type: 'listening-select',
        prompt: 'Ситуация: На улице холодно. Прослушайте фразу и выберите правильный ответ.',
        targetAnswer: "It's cold.",
        options: ["It's cold.", "It's dark.", "It's time to sleep."],
        audioText: "It's cold.",
      },
      lesson!,
      1,
      { mode: 'reference', referenceExerciseType: 'listening-select' }
    )
    expect(first).not.toBeNull()
    expect(second).not.toBeNull()

    const picked = pickFreshReferencePracticeQuestion(
      [first!, second!],
      [first!.prompt],
      []
    )
    expect(picked).not.toBeNull()
    expect(picked!.prompt).toBe(second!.prompt)
  })

  it('skips candidates with seen fingerprint', () => {
    const first = buildCandidate('Ситуация: A. Прослушайте фразу и выберите правильный ответ.', 'A')
    const second = buildCandidate('Ситуация: B. Прослушайте фразу и выберите правильный ответ.', 'B')
    const seenKey = buildPracticeQuestionFingerprintFromQuestion(first)
    expect(seenKey).toBeTruthy()

    const picked = pickFreshReferencePracticeQuestion([first, second], [], [seenKey!])
    expect(picked).not.toBeNull()
    expect(picked!.targetAnswer).toBe('B')
  })

  it('returns null when all candidates are stale', () => {
    const candidate = buildCandidate('Ситуация: A. Прослушайте фразу и выберите правильный ответ.', 'A')
    const seenKey = buildPracticeQuestionFingerprintFromQuestion(candidate)
    expect(seenKey).toBeTruthy()

    const picked = pickFreshReferencePracticeQuestion(
      [candidate],
      [candidate.prompt],
      [seenKey!]
    )
    expect(picked).toBeNull()
  })
})
