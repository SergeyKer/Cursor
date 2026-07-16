'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { QuickTestFinaleSheet } from '@/components/quickTest/QuickTestFinaleSheet'
import type { AppColumnBounds } from '@/hooks/useAppColumnBounds'
import { buildQuickTestFinaleActions } from '@/lib/quickTest/buildQuickTestFinaleActions'
import type { QuickTestFinaleAction } from '@/lib/quickTest/buildQuickTestFinaleActions'
import {
  clearEntryContext,
  readEntryContext,
  writeOpenLessonIntent,
} from '@/lib/quickTest/openLessonIntent'
import { trackQuickTest } from '@/lib/quickTest/analytics'
import { resolveQuickTestFinalePresentation } from '@/lib/quickTest/resolveQuickTestFinalePresentation'
import { buildQuickTestSharePayload } from '@/lib/quickTest/shareCopy'
import type { QuickTestEntrySource, QuickTestScoreBand } from '@/lib/quickTest/types'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'

type ShowcaseError = {
  questionId: string
  prompt: string
  explanationRu: string
  mistakeTag: string
}

type QuickTestFinaleProps = {
  open: boolean
  columnBounds?: AppColumnBounds | null
  slug: string
  topicTitle: string
  lessonId: string
  correct: number
  total: number
  answerCount: number
  durationLabel: string
  band: QuickTestScoreBand
  insight: string | null
  showcaseErrors: ShowcaseError[]
  nextVariantId: string | null
  entrySource: QuickTestEntrySource
  compactViewport?: boolean
}

export function QuickTestFinale({
  open,
  columnBounds = null,
  slug,
  topicTitle,
  lessonId,
  correct,
  total,
  answerCount,
  durationLabel,
  band,
  insight,
  showcaseErrors,
  nextVariantId,
  entrySource,
  compactViewport = false,
}: QuickTestFinaleProps) {
  const router = useRouter()
  const [shareNotice, setShareNotice] = useState<string | null>(null)

  const presentation = useMemo(
    () =>
      resolveQuickTestFinalePresentation({
        correct,
        total,
        answerCount,
        compactViewport,
      }),
    [correct, total, answerCount, compactViewport]
  )

  const actions = useMemo(
    () => buildQuickTestFinaleActions({ band, nextVariantId }),
    [band, nextVariantId]
  )

  const openLesson = useCallback(() => {
    const entry = readEntryContext()
    writeOpenLessonIntent({
      lessonId,
      source: entry?.source === 'internal_menu' ? 'internal_menu' : entrySource,
      audience: entry?.audience,
      createdAt: Date.now(),
    })
    clearEntryContext()
    trackQuickTest('cta_open_lesson', {
      entrySource,
      slug,
      lessonId,
      scoreBand: band,
      ctaId: 'open_lesson',
      ctaPosition: 'finale_primary',
    })
    window.location.assign('/')
  }, [band, entrySource, lessonId, slug])

  const anotherVariant = useCallback(() => {
    if (!nextVariantId) return
    trackQuickTest('cta_another_variant', {
      entrySource,
      slug,
      scoreBand: band,
      ctaId: 'another_variant',
      ctaPosition: 'finale_secondary',
    })
    router.push(`/test/${slug}?variant=${encodeURIComponent(nextVariantId)}`)
  }, [band, entrySource, nextVariantId, router, slug])

  const otherTest = useCallback(() => {
    trackQuickTest('cta_other_test', {
      entrySource,
      slug,
      scoreBand: band,
      ctaId: 'other_test',
      ctaPosition: 'finale_tertiary',
    })
    router.replace('/test')
  }, [band, entrySource, router, slug])

  const share = useCallback(async () => {
    const payload = buildQuickTestSharePayload({
      slug,
      topicTitle,
      correct,
      total,
      durationLabel,
    })
    trackQuickTest('share_copy', {
      entrySource,
      slug,
      scoreBand: band,
      ctaId: 'share_copy',
      ctaPosition: actions.tertiary.id === 'share' ? 'finale_tertiary' : 'finale_secondary',
    })
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.text)
        setShareNotice(QUICK_TEST_COPY.shareCopied)
        return
      }
    } catch {
      /* fall through */
    }
    setShareNotice(QUICK_TEST_COPY.shareClipboardFallback)
  }, [actions.tertiary.id, band, correct, durationLabel, entrySource, slug, topicTitle, total])

  const handleSecondary = useCallback(
    (action: QuickTestFinaleAction) => {
      if (action.id === 'another_variant') anotherVariant()
      else if (action.id === 'other_test') otherTest()
      else void share()
    },
    [anotherVariant, otherTest, share]
  )

  const handleTertiary = useCallback(() => {
    if (actions.tertiary.id === 'share') void share()
    else otherTest()
  }, [actions.tertiary.id, otherTest, share])

  return (
    <QuickTestFinaleSheet
      open={open}
      columnBounds={columnBounds}
      presentation={presentation}
      topicTitle={topicTitle}
      correct={correct}
      total={total}
      durationLabel={durationLabel}
      insight={insight}
      showcaseErrors={showcaseErrors}
      actions={actions}
      shareNotice={shareNotice}
      onPrimary={openLesson}
      onSecondary={handleSecondary}
      onTertiary={handleTertiary}
    />
  )
}
