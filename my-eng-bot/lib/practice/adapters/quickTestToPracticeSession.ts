import { getQuickTestBankBySlug, getVariantFromBank } from '@/lib/quickTest/catalog'
import { shuffleOptionsDeterministic } from '@/lib/quickTest/shuffleOptions'
import type { QuickTestQuestion, QuickTestTopicBank } from '@/lib/quickTest/types'
import { buildPracticeSessionFromQuestions } from '@/lib/practice/builders/localPracticeBuilder'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { PracticeBuildConfig, PracticeQuestion, PracticeSession } from '@/types/practice'

export type QuickTestQuestionMeta = {
  explanationRu: string
  mistakeTag: string
  correctIndex: 0 | 1 | 2
  options: [string, string, string]
}

export type QuickTestToPracticeResult = {
  session: PracticeSession
  config: PracticeBuildConfig
  metaByQuestionId: ReadonlyMap<string, QuickTestQuestionMeta>
  bank: QuickTestTopicBank
  variantId: string
  slug: string
}

function mapQuestion(
  bank: QuickTestTopicBank,
  variantId: string,
  question: QuickTestQuestion
): { practice: PracticeQuestion; meta: QuickTestQuestionMeta } {
  const seedKey = `${variantId}:${question.id}`
  const shuffled = shuffleOptionsDeterministic(question.options, question.correctIndex, seedKey)
  const targetAnswer = shuffled.options[shuffled.correctIndex]!
  return {
    practice: {
      id: question.id,
      lessonId: bank.lessonId,
      type: 'choice',
      prompt: question.prompt,
      targetAnswer,
      acceptedAnswers: [targetAnswer],
      options: [...shuffled.options],
      // explanation reserved for feedback path; keep hint empty (practice convention)
      explanation: question.explanationRu,
      xpBase: 10,
      difficulty: 2,
      tolerance: 'normalized',
    },
    meta: {
      explanationRu: question.explanationRu,
      mistakeTag: question.mistakeTag,
      correctIndex: shuffled.correctIndex,
      options: shuffled.options,
    },
  }
}

/** Bank variant → PracticeSession (5× choice) + side-map for scoring. */
export function quickTestToPracticeSession(params: {
  slug: string
  variantId: string
}): QuickTestToPracticeResult | null {
  const bank = getQuickTestBankBySlug(params.slug)
  if (!bank) return null
  const variant = getVariantFromBank(params.slug, params.variantId)
  if (!variant || variant.questions.length !== 5) return null

  const lesson = getStructuredLessonById(bank.lessonId)
  if (!lesson) return null

  const metaByQuestionId = new Map<string, QuickTestQuestionMeta>()
  const questions: PracticeQuestion[] = []
  for (const q of variant.questions) {
    const mapped = mapQuestion(bank, variant.id, q)
    questions.push(mapped.practice)
    metaByQuestionId.set(mapped.practice.id, mapped.meta)
  }

  const config: PracticeBuildConfig = {
    source: { kind: 'static_lesson', lessonId: bank.lessonId },
    lesson,
    mode: 'balanced',
    entrySource: 'quick_test',
    generationSource: 'local',
    questions,
    seed: `${params.slug}:${variant.id}`,
    targetQuestionCount: 5,
  }

  const session = buildPracticeSessionFromQuestions(config, questions)
  // Skip practice briefing — lobby/soft intro already happened (or deep-link).
  session.instructionAcknowledged = true

  return {
    session,
    config,
    metaByQuestionId,
    bank,
    variantId: variant.id,
    slug: params.slug,
  }
}

export function practiceAnswersToQuickTestRecords(
  answers: PracticeSession['answers'],
  metaByQuestionId: ReadonlyMap<string, QuickTestQuestionMeta>
): Array<{
  questionId: string
  selectedIndex: number
  correct: boolean
  mistakeTag: string
}> {
  return answers.map((answer) => {
    const meta = metaByQuestionId.get(answer.questionId)
    const selectedIndex =
      meta?.options.findIndex((option) => option === answer.userAnswer) ?? -1
    return {
      questionId: answer.questionId,
      selectedIndex: selectedIndex >= 0 ? selectedIndex : 0,
      correct: answer.isCorrect,
      mistakeTag: meta?.mistakeTag ?? 'unknown',
    }
  })
}
