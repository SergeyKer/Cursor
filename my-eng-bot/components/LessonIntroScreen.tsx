'use client'

import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import LessonReadingShell from '@/components/LessonReadingShell'
import ProgressCtaButton from '@/components/ProgressCtaButton'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import { resyncIosWebKitDialogComposerStackHeight } from '@/hooks/useDialogComposerStackHeight'
import { buildReadingIntroBubbles } from '@/lib/buildReadingIntroBubbles'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import { APP_BTN_PRIMARY_LESSON_START, BTN_INTERACTION_BASE } from '@/lib/homeCtaStyles'
import { isIosWebKitBrowser } from '@/lib/iosSafariViewport'
import {
  estimateIntroComposerMinHeight,
  LESSON_INTRO_SCROLL_CLASS,
} from '@/lib/lessonComposerLayout'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import { resolveLessonIntroPrimaryCtaLabel } from '@/lib/lessonIntroCtaCopy'
import { LESSON_VARIANT_PREPARE_LOADING_LABEL } from '@/lib/lessonVariantCtaCopy'
import type { Audience } from '@/lib/types'
import type { LessonIntro } from '@/types/lesson'

/** @deprecated Depth gate removed; kept for AppShell cleanup compatibility. */
export type LessonIntroDepth = 'quick' | 'details' | 'deep'

type LessonIntroScreenProps = {
  intro: LessonIntro
  /** @deprecated Ignored — full document always shown. */
  depth?: LessonIntroDepth
  introSessionKey: string
  loadingLesson?: boolean
  footerVariantRegenerating?: boolean
  variantPrepareProgress?: number
  variantPrepareLabel?: string
  audience: Audience
  /** @deprecated */
  onShowDetails?: () => void
  /** @deprecated */
  onShowDeepDive?: () => void
  onStartLesson: () => void
  onShowExtras: () => void
  onBack: () => void
}

function IntroChip({
  children,
  onClick,
  disabled = false,
  variant = 'secondary',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'link' | 'tips' | 'secondary'
}) {
  const className =
    variant === 'link'
      ? `${BTN_INTERACTION_BASE} inline-flex min-h-10 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-sky-50 px-2.5 py-2 text-center text-[13px] font-semibold text-slate-600 hover:from-white hover:to-sky-100 active:brightness-95 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60`
      : variant === 'tips'
        ? `${BTN_INTERACTION_BASE} inline-flex min-h-10 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-100 px-2.5 py-2 text-center text-[13px] font-semibold text-amber-800 hover:from-amber-100 hover:to-yellow-200 active:brightness-95 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60`
        : `${BTN_INTERACTION_BASE} inline-flex min-h-10 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-sky-200 bg-gradient-to-r from-cyan-50 to-blue-100 px-2.5 py-2 text-center text-[13px] font-semibold text-slate-700 hover:from-cyan-100 hover:to-blue-200 active:brightness-95 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60`

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}

export default function LessonIntroScreen({
  intro,
  introSessionKey,
  loadingLesson = false,
  footerVariantRegenerating = false,
  variantPrepareProgress = 0,
  variantPrepareLabel = LESSON_VARIANT_PREPARE_LOADING_LABEL,
  audience,
  onStartLesson,
  onShowExtras,
  onBack,
}: LessonIntroScreenProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const composerStackRef = useRef<HTMLDivElement>(null)
  const isIosWebKitClient = useMemo(
    () => typeof navigator !== 'undefined' && isIosWebKitBrowser(navigator.userAgent),
    []
  )

  const bubbles = useMemo(() => buildReadingIntroBubbles(intro, audience), [audience, intro])

  const introPrimaryCtaLabel = resolveLessonIntroPrimaryCtaLabel({
    loadingLesson,
    footerVariantRegenerating,
  })
  const isIntroPrimaryCtaDisabled = loadingLesson && !footerVariantRegenerating

  const introComposerMinHeight = useMemo(() => {
    if (!isIosWebKitClient) return undefined
    return estimateIntroComposerMinHeight({
      hasSecondaryChips: true,
      hasErrorBanner: false,
    })
  }, [isIosWebKitClient])

  useLayoutEffect(() => {
    if (!isIosWebKitClient) return
    return resyncIosWebKitDialogComposerStackHeight(composerStackRef.current)
  }, [isIosWebKitClient, loadingLesson, introSessionKey])

  return (
    <LessonReadingShell
      scrollRef={scrollContainerRef}
      scrollClassName={`${LESSON_SCROLL_VIEWPORT_CLASS} ${LESSON_INTRO_SCROLL_CLASS} chat-feed-wallpaper py-2.5 sm:py-3`}
      composerStackRef={composerStackRef}
      composerClassName={CHAT_COMPOSER_STACK_TOP_CLASS}
      composerStyle={{
        paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM,
        ...(introComposerMinHeight != null ? { minHeight: introComposerMinHeight } : {}),
      }}
      composer={
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full items-center justify-between gap-1.5 sm:gap-2">
            <IntroChip variant="link" onClick={onBack}>
              ← Назад
            </IntroChip>
            <IntroChip variant="tips" onClick={onShowExtras}>
              Фишки
            </IntroChip>
          </div>
          <div className="flex w-full">
            <ProgressCtaButton
              onClick={onStartLesson}
              disabled={isIntroPrimaryCtaDisabled}
              busy={footerVariantRegenerating}
              progress={footerVariantRegenerating ? variantPrepareProgress : null}
              ghostLabel={footerVariantRegenerating ? variantPrepareLabel : undefined}
              className={APP_BTN_PRIMARY_LESSON_START}
            >
              {introPrimaryCtaLabel}
            </ProgressCtaButton>
          </div>
        </div>
      }
    >
      <UnifiedLessonBubble bubbles={bubbles} layout="detached" enterMode="reading" animateSections />
    </LessonReadingShell>
  )
}
