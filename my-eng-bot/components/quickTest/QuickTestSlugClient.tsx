'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PracticeScreen from '@/components/practice/PracticeScreen'
import { QuickTestThemeGuard } from '@/components/quickTest/QuickTestThemeGuard'
import { QuickTestPageChrome } from '@/components/quickTest/QuickTestPageChrome'
import { QuickTestFinale } from '@/components/quickTest/QuickTestFinale'
import { usePracticeSession } from '@/hooks/usePracticeSession'
import {
  practiceAnswersToQuickTestRecords,
  quickTestToPracticeSession,
  type QuickTestQuestionMeta,
} from '@/lib/practice/adapters/quickTestToPracticeSession'
import { createQuickTestNoopPracticeStorage } from '@/lib/practice/storage/quickTestNoopPracticeStorage'
import { resolveQuickTestFooter } from '@/lib/quickTest/quickTestFooter'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'
import { trackQuickTest } from '@/lib/quickTest/analytics'
import type { QuickTestEntrySource, QuickTestQuestion } from '@/lib/quickTest/types'
import {
  clearResume,
  readProgress,
  writeProgress,
  writeResume,
} from '@/lib/quickTest/storage'
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
import { getVariantFromBank } from '@/lib/quickTest/catalog'

type QuickTestSlugClientProps = {
  slug: string
  requestedVariantId: string | null
  forceDefaultVariant: boolean
  entrySource: QuickTestEntrySource
  fromShare: boolean
  ssrPrompt: string
  ssrOptions: [string, string, string]
}

const noopStorage = createQuickTestNoopPracticeStorage()

export function QuickTestSlugClient({
  slug,
  requestedVariantId,
  forceDefaultVariant,
  entrySource,
  fromShare,
}: QuickTestSlugClientProps) {
  const router = useRouter()
  const practice = usePracticeSession({ storage: noopStorage, audience: 'adult' })
  const metaRef = useRef<ReadonlyMap<string, QuickTestQuestionMeta>>(new Map())
  const [variantId, setVariantId] = useState('variant-1')
  const [lessonId, setLessonId] = useState('')
  const [topicTitle, setTopicTitle] = useState('')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [bankQuestions, setBankQuestions] = useState<QuickTestQuestion[]>([])
  const startedRef = useRef(false)
  const trackedComplete = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    const progress = readProgress()
    const mappedProbe = quickTestToPracticeSession({
      slug,
      variantId: selectVariantId({
        slug,
        completedVariantIds: [],
        requestedVariantId,
        forceDefault: forceDefaultVariant,
      }),
    })
    if (!mappedProbe) return

    const completed = getCompletedVariantIds(progress, mappedProbe.bank.lessonId)
    const resolvedVariant = selectVariantId({
      slug,
      completedVariantIds: completed,
      requestedVariantId,
      forceDefault: forceDefaultVariant,
    })
    const mapped = quickTestToPracticeSession({ slug, variantId: resolvedVariant })
    if (!mapped) return

    startedRef.current = true
    metaRef.current = mapped.metaByQuestionId
    setVariantId(mapped.variantId)
    setLessonId(mapped.bank.lessonId)
    setTopicTitle(mapped.bank.title)
    setBankQuestions(getVariantFromBank(slug, mapped.variantId)?.questions ?? [])
    setStartedAt(Date.now())
    practice.startSession(mapped.config)

    trackQuickTest('page_view', {
      entrySource,
      slug,
      lessonId: mapped.bank.lessonId,
      variantId: mapped.variantId,
      fromShare,
    })
    if (fromShare) {
      trackQuickTest('referral_open', {
        entrySource: 'shared_link',
        slug,
        fromShare: true,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per slug mount
  }, [slug, requestedVariantId, forceDefaultVariant, entrySource, fromShare])

  useEffect(() => {
    const session = practice.session
    if (!session || session.entrySource !== 'quick_test') return
    if (practice.state === 'completed' || practice.state === 'idle') return
    writeResume({
      slug,
      variantId,
      currentIndex: session.currentIndex,
      answers: practiceAnswersToQuickTestRecords(session.answers, metaRef.current),
      startedAt,
      firstAnswerAt: session.answers[0]?.timestamp ?? null,
    })
  }, [practice.session, practice.state, slug, variantId, startedAt])

  useEffect(() => {
    if (practice.state !== 'completed' || !practice.session || trackedComplete.current) return
    trackedComplete.current = true
    setFinishedAt(Date.now())
    const records = practiceAnswersToQuickTestRecords(practice.session.answers, metaRef.current)
    const correct = countCorrect(records)
    const band = scoreBandFromCorrect(correct)
    trackQuickTest('finale_view', {
      entrySource,
      slug,
      lessonId,
      variantId,
      scoreBand: band,
    })
    const nextProgress = markVariantCompleted(readProgress(), lessonId, variantId)
    writeProgress(nextProgress)
    clearResume()
  }, [practice.state, practice.session, entrySource, slug, lessonId, variantId])

  const qtAnswers = useMemo(() => {
    if (!practice.session) return []
    return practiceAnswersToQuickTestRecords(practice.session.answers, metaRef.current)
  }, [practice.session])

  const correctCount = countCorrect(qtAnswers)
  const band = scoreBandFromCorrect(correctCount)
  const insight = insightForMistakeTag(pickPrimaryMistakeTag(qtAnswers), band)
  const showcaseErrors = pickShowcaseErrors(qtAnswers, bankQuestions)
  const durationLabel = formatDuration(
    Math.max(0, (finishedAt ?? Date.now()) - (startedAt ?? Date.now()))
  )
  const nextVariantId = hasAnotherVariant(
    slug,
    getCompletedVariantIds(readProgress(), lessonId),
    variantId
  )

  const footer = useMemo(() => {
    if (practice.state === 'completed') {
      return resolveQuickTestFooter({
        phase: 'finale',
        topicTitle,
        scoreBand: band,
        correct: correctCount,
        durationLabel,
      })
    }
    const step = (practice.session?.currentIndex ?? 0) + 1
    if (practice.state === 'checking' || practice.state === 'submitting') {
      return resolveQuickTestFooter({ phase: 'checking', step, topicTitle })
    }
    if (practice.state === 'feedback') {
      return resolveQuickTestFooter({
        phase: practice.feedback?.type === 'error' ? 'feedback-wrong' : 'feedback-correct',
        step,
        topicTitle,
      })
    }
    return resolveQuickTestFooter({ phase: 'question', step, topicTitle })
  }, [practice.state, practice.session, practice.feedback, topicTitle, band, correctCount, durationLabel])

  const onExit = useCallback(() => {
    if ((practice.session?.answers.length ?? 0) > 0) {
      const ok = window.confirm(QUICK_TEST_COPY.exitConfirm)
      if (!ok) return
    }
    practice.abandonSession()
    clearResume()
    router.replace('/test')
  }, [practice, router])

  const showFinale = practice.state === 'completed' && Boolean(lessonId)

  return (
    <QuickTestThemeGuard>
      <QuickTestPageChrome
        showExit={!showFinale}
        onExit={onExit}
        footerDynamic={footer.dynamic}
        footerStatic={footer.static}
        footerTone={footer.tone}
        footerTypingKey={footer.typingKey}
        progress={footer.progress}
      >
        {showFinale ? (
          <QuickTestFinale
            slug={slug}
            topicTitle={topicTitle}
            lessonId={lessonId}
            correct={correctCount}
            total={5}
            durationLabel={durationLabel}
            band={band}
            insight={insight}
            showcaseErrors={showcaseErrors}
            nextVariantId={nextVariantId}
            entrySource={entrySource}
          />
        ) : practice.session ? (
          <PracticeScreen
            session={practice.session}
            audience="adult"
            state={practice.state}
            feedback={practice.feedback}
            pendingAnswer={practice.pendingAnswer}
            currentQuestion={practice.currentQuestion}
            canSubmit={practice.canSubmit}
            completionMeta={null}
            hasTips={false}
            otherTopicAvailable={false}
            onSubmitAnswer={practice.submitAnswer}
            onAcknowledgeInstruction={practice.acknowledgeInstruction}
            onRepeat={() => {}}
            onStartMode={() => {}}
            onOpenLesson={() => {}}
            onBackToPracticeMenu={() => {
              practice.abandonSession()
              clearResume()
              router.replace('/test')
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-[14px] text-[var(--text-muted)]">
            Загрузка…
          </div>
        )}
      </QuickTestPageChrome>
    </QuickTestThemeGuard>
  )
}
