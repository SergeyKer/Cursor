'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuickTestThemeGuard } from '@/components/quickTest/QuickTestThemeGuard'
import { QuickTestPageChrome } from '@/components/quickTest/QuickTestPageChrome'
import { QuickTestQuestionView } from '@/components/quickTest/QuickTestQuestion'
import { QuickTestFinale } from '@/components/quickTest/QuickTestFinale'
import { useQuickTestSession } from '@/hooks/useQuickTestSession'
import { resolveQuickTestFooter } from '@/lib/quickTest/quickTestFooter'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'
import { trackQuickTest } from '@/lib/quickTest/analytics'
import type { QuickTestEntrySource } from '@/lib/quickTest/types'
import { clearResume } from '@/lib/quickTest/storage'

type QuickTestSlugClientProps = {
  slug: string
  requestedVariantId: string | null
  forceDefaultVariant: boolean
  entrySource: QuickTestEntrySource
  fromShare: boolean
  /** SSR Q1 payload for first paint parity */
  ssrPrompt: string
  ssrOptions: [string, string, string]
}

export function QuickTestSlugClient({
  slug,
  requestedVariantId,
  forceDefaultVariant,
  entrySource,
  fromShare,
  ssrPrompt,
  ssrOptions,
}: QuickTestSlugClientProps) {
  const router = useRouter()
  const session = useQuickTestSession({
    slug,
    requestedVariantId,
    forceDefaultVariant,
    entrySource,
  })

  useEffect(() => {
    trackQuickTest('page_view', {
      entrySource,
      slug,
      lessonId: session.lessonId ?? undefined,
      variantId: session.variantId,
      fromShare,
    })
    if (fromShare) {
      trackQuickTest('referral_open', {
        entrySource: 'shared_link',
        slug,
        fromShare: true,
      })
    }
  }, [entrySource, fromShare, session.lessonId, session.variantId, slug])

  const footer = useMemo(() => {
    if (session.phase === 'finale') {
      return resolveQuickTestFooter({
        phase: 'finale',
        topicTitle: session.topicTitle,
        scoreBand: session.band,
        correct: session.correctCount,
        durationLabel: session.durationLabel,
      })
    }
    if (session.phase === 'feedback') {
      return resolveQuickTestFooter({
        phase: session.lastAnswerCorrect ? 'feedback-correct' : 'feedback-wrong',
        step: session.currentIndex + 1,
        topicTitle: session.topicTitle,
      })
    }
    return resolveQuickTestFooter({
      phase: 'question',
      step: session.currentIndex + 1,
      topicTitle: session.topicTitle,
    })
  }, [session])

  const onExit = useCallback(() => {
    if (session.answers.length > 0) {
      const ok = window.confirm(QUICK_TEST_COPY.exitConfirm)
      if (!ok) return
    }
    session.exitSession()
    clearResume()
    router.replace('/test')
  }, [router, session])

  const showSsrShell = !session.hydrated || !session.displayQuestion

  return (
    <QuickTestThemeGuard>
      <QuickTestPageChrome
        showExit={session.phase !== 'finale'}
        onExit={onExit}
        footerDynamic={footer.dynamic}
        footerStatic={footer.static}
      >
        {session.phase === 'finale' && session.lessonId ? (
          <QuickTestFinale
            slug={slug}
            topicTitle={session.topicTitle}
            lessonId={session.lessonId}
            correct={session.correctCount}
            total={session.total}
            durationLabel={session.durationLabel}
            band={session.band}
            insight={session.insight}
            showcaseErrors={session.showcaseErrors}
            nextVariantId={session.nextVariantId}
            entrySource={entrySource}
          />
        ) : null}

        {session.phase !== 'finale' && session.displayQuestion ? (
          <QuickTestQuestionView
            step={session.currentIndex + 1}
            total={session.total}
            question={session.displayQuestion}
            phase={session.phase === 'feedback' ? 'feedback' : 'question'}
            selectedIndex={session.selectedIndex}
            onChoose={session.answer}
            onNext={session.goNext}
            isLast={session.isLast}
          />
        ) : null}

        {showSsrShell && session.phase !== 'finale' ? (
          <div className="chat-shell-x mx-auto w-full max-w-xl px-3 py-4" data-testid="qt-ssr-q1">
            <p className="mb-3 text-[15px] font-medium">{ssrPrompt}</p>
            <ul className="space-y-2">
              {ssrOptions.map((option) => (
                <li
                  key={option}
                  className="min-h-[44px] rounded-full border border-black/15 bg-white/50 px-3.5 py-2 text-[14px]"
                >
                  {option}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </QuickTestPageChrome>
    </QuickTestThemeGuard>
  )
}
