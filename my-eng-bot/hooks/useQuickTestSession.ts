'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getQuickTestBankBySlug, getVariantFromBank } from '@/lib/quickTest/catalog'
import {
  getCompletedVariantIds,
  hasAnotherVariant,
  markVariantCompleted,
  selectVariantId,
} from '@/lib/quickTest/selectVariant'
import {
  countCorrect,
  formatDuration,
  insightForMistakeTag,
  pickPrimaryMistakeTag,
  pickShowcaseErrors,
  scoreBandFromCorrect,
} from '@/lib/quickTest/scoring'
import { shuffleOptionsDeterministic } from '@/lib/quickTest/shuffleOptions'
import {
  clearResume,
  readProgress,
  readResume,
  writeProgress,
  writeResume,
} from '@/lib/quickTest/storage'
import type { QuickTestAnswerRecord, QuickTestEntrySource, QuickTestQuestion } from '@/lib/quickTest/types'
import { trackQuickTest } from '@/lib/quickTest/analytics'

const AUTO_ADVANCE_MS = 700
const TOTAL = 5

export type QuickTestPhase = 'question' | 'feedback' | 'finale'

export function useQuickTestSession(input: {
  slug: string
  requestedVariantId?: string | null
  forceDefaultVariant?: boolean
  entrySource: QuickTestEntrySource
}) {
  const bank = useMemo(() => getQuickTestBankBySlug(input.slug), [input.slug])
  const [variantId, setVariantId] = useState(DEFAULT_VARIANT_PLACEHOLDER)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<QuickTestAnswerRecord[]>([])
  const answersRef = useRef<QuickTestAnswerRecord[]>([])
  const [phase, setPhase] = useState<QuickTestPhase>('question')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [firstAnswerAt, setFirstAnswerAt] = useState<number | null>(null)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const trackedFirstQuestion = useRef(false)

  const variant = useMemo(
    () => (bank ? getVariantFromBank(input.slug, variantId) : null),
    [bank, input.slug, variantId]
  )
  const questions = variant?.questions ?? []

  const displayQuestion = useMemo(() => {
    const raw = questions[currentIndex]
    if (!raw) return null
    const shuffled = shuffleOptionsDeterministic(
      raw.options,
      raw.correctIndex,
      `${variantId}:${raw.id}`
    )
    return { ...raw, options: shuffled.options, correctIndex: shuffled.correctIndex }
  }, [questions, currentIndex, variantId])

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    const progress = readProgress()
    const lessonId = bank?.lessonId ?? ''
    const completed = getCompletedVariantIds(progress, lessonId)
    const resolved = selectVariantId({
      slug: input.slug,
      completedVariantIds: completed,
      requestedVariantId: input.requestedVariantId,
      forceDefault: input.forceDefaultVariant,
    })

    const resume = readResume()
    if (
      resume &&
      resume.slug === input.slug &&
      resume.currentIndex >= 0 &&
      resume.currentIndex < TOTAL &&
      Array.isArray(resume.answers)
    ) {
      setVariantId(resume.variantId)
      setCurrentIndex(resume.currentIndex)
      setAnswers(resume.answers)
      answersRef.current = resume.answers
      setStartedAt(resume.startedAt)
      setFirstAnswerAt(resume.firstAnswerAt)
      setPhase('question')
      setSelectedIndex(null)
    } else {
      setVariantId(resolved)
      setCurrentIndex(0)
      setAnswers([])
      answersRef.current = []
      setPhase('question')
      setSelectedIndex(null)
      setStartedAt(null)
      setFirstAnswerAt(null)
      setFinishedAt(null)
    }
    setHydrated(true)
  }, [bank?.lessonId, input.forceDefaultVariant, input.requestedVariantId, input.slug])

  useEffect(() => {
    if (!hydrated || phase === 'finale') return
    writeResume({
      slug: input.slug,
      variantId,
      currentIndex,
      answers,
      startedAt,
      firstAnswerAt,
    })
  }, [hydrated, phase, input.slug, variantId, currentIndex, answers, startedAt, firstAnswerAt])

  useEffect(() => {
    if (!hydrated || !displayQuestion || trackedFirstQuestion.current) return
    trackedFirstQuestion.current = true
    trackQuickTest('first_question_view', {
      entrySource: input.entrySource,
      slug: input.slug,
      lessonId: bank?.lessonId,
      variantId,
      questionIndex: 0,
    })
  }, [hydrated, displayQuestion, input.entrySource, input.slug, bank?.lessonId, variantId])

  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [])

  const clearAuto = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
  }

  const finishWithAnswers = useCallback(
    (finalAnswers: QuickTestAnswerRecord[], activeVariantId: string) => {
      const end = Date.now()
      setFinishedAt(end)
      setPhase('finale')
      clearResume()
      if (bank) {
        writeProgress(markVariantCompleted(readProgress(), bank.lessonId, activeVariantId))
      }
      trackQuickTest('finale_view', {
        entrySource: input.entrySource,
        slug: input.slug,
        lessonId: bank?.lessonId,
        variantId: activeVariantId,
        scoreBand: scoreBandFromCorrect(countCorrect(finalAnswers)),
      })
    },
    [bank, input.entrySource, input.slug]
  )

  const goNext = useCallback(() => {
    clearAuto()
    setSelectedIndex(null)
    if (currentIndex >= TOTAL - 1) {
      finishWithAnswers(answersRef.current, variantId)
      return
    }
    setCurrentIndex((i) => i + 1)
    setPhase('question')
  }, [currentIndex, finishWithAnswers, variantId])

  const answer = useCallback(
    (optionIndex: number) => {
      if (phase !== 'question' || !displayQuestion || selectedIndex !== null) return
      const correct = optionIndex === displayQuestion.correctIndex
      const record: QuickTestAnswerRecord = {
        questionId: displayQuestion.id,
        selectedIndex: optionIndex,
        correct,
        mistakeTag: displayQuestion.mistakeTag,
      }
      const nextAnswers = [...answersRef.current, record]
      answersRef.current = nextAnswers
      setAnswers(nextAnswers)
      setSelectedIndex(optionIndex)
      setPhase('feedback')
      const now = Date.now()
      if (startedAt === null) setStartedAt(now)
      const isFirst = firstAnswerAt === null
      if (isFirst) setFirstAnswerAt(now)

      if (isFirst) {
        trackQuickTest('first_answer', {
          entrySource: input.entrySource,
          slug: input.slug,
          lessonId: bank?.lessonId,
          variantId,
          questionIndex: currentIndex,
          correct,
        })
      }
      trackQuickTest('question_answer', {
        entrySource: input.entrySource,
        slug: input.slug,
        lessonId: bank?.lessonId,
        variantId,
        questionIndex: currentIndex,
        correct,
      })

      if (correct) {
        autoTimerRef.current = setTimeout(() => goNext(), AUTO_ADVANCE_MS)
      }
    },
    [
      bank?.lessonId,
      currentIndex,
      displayQuestion,
      firstAnswerAt,
      goNext,
      input.entrySource,
      input.slug,
      phase,
      selectedIndex,
      startedAt,
      variantId,
    ]
  )

  const exitSession = useCallback(() => {
    clearAuto()
    clearResume()
  }, [])

  const correctCount = countCorrect(answers)
  const band = scoreBandFromCorrect(correctCount)
  const durationMs = firstAnswerAt && finishedAt ? finishedAt - firstAnswerAt : firstAnswerAt && phase === 'finale' ? Date.now() - firstAnswerAt : 0
  const durationLabel = formatDuration(durationMs || 0)
  const mistakeTag = pickPrimaryMistakeTag(answers)
  const insight = insightForMistakeTag(mistakeTag, band)
  const showcaseErrors = pickShowcaseErrors(answers, questions as QuickTestQuestion[])
  const completedIds = bank ? getCompletedVariantIds(readProgress(), bank.lessonId) : []
  const nextVariantId = bank ? hasAnotherVariant(input.slug, completedIds, variantId) : null

  return {
    bank,
    variantId,
    hydrated,
    phase,
    currentIndex,
    total: TOTAL,
    displayQuestion,
    selectedIndex,
    answers,
    answer,
    goNext,
    exitSession,
    correctCount,
    band,
    durationLabel,
    durationMs,
    insight,
    showcaseErrors,
    nextVariantId,
    isLast: currentIndex >= TOTAL - 1,
    lastAnswerCorrect: answers[answers.length - 1]?.correct ?? false,
    lessonId: bank?.lessonId ?? null,
    topicTitle: bank?.title ?? input.slug,
  }
}

const DEFAULT_VARIANT_PLACEHOLDER = 'variant-1'
