'use client'

import { useRouter } from 'next/navigation'
import MedalBadge from '@/components/MedalBadge'
import { QuickTestShareButton } from '@/components/quickTest/QuickTestShareButton'
import {
  clearEntryContext,
  readEntryContext,
  writeOpenLessonIntent,
} from '@/lib/quickTest/openLessonIntent'
import { trackQuickTest } from '@/lib/quickTest/analytics'
import type { QuickTestEntrySource, QuickTestScoreBand } from '@/lib/quickTest/types'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'

type ShowcaseError = {
  questionId: string
  prompt: string
  explanationRu: string
  mistakeTag: string
}

type QuickTestFinaleProps = {
  slug: string
  topicTitle: string
  lessonId: string
  correct: number
  total: number
  durationLabel: string
  band: QuickTestScoreBand
  insight: string | null
  showcaseErrors: ShowcaseError[]
  nextVariantId: string | null
  entrySource: QuickTestEntrySource
}

export function QuickTestFinale({
  slug,
  topicTitle,
  lessonId,
  correct,
  total,
  durationLabel,
  band,
  insight,
  showcaseErrors,
  nextVariantId,
  entrySource,
}: QuickTestFinaleProps) {
  const router = useRouter()

  const title =
    band === 'perfect'
      ? QUICK_TEST_COPY.finaleTitlePerfect
      : band === 'strong'
        ? QUICK_TEST_COPY.finaleTitleStrong
        : QUICK_TEST_COPY.finaleTitleStart

  const cta =
    band === 'perfect'
      ? QUICK_TEST_COPY.finaleCtaPerfect
      : band === 'strong'
        ? QUICK_TEST_COPY.finaleCtaStrong
        : QUICK_TEST_COPY.finaleCtaStart

  const openLesson = () => {
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
  }

  const anotherVariant = () => {
    if (!nextVariantId) return
    trackQuickTest('cta_another_variant', {
      entrySource,
      slug,
      scoreBand: band,
      ctaId: 'another_variant',
      ctaPosition: 'finale_secondary',
    })
    router.push(`/test/${slug}?variant=${encodeURIComponent(nextVariantId)}`)
  }

  const otherTest = () => {
    trackQuickTest('cta_other_test', {
      entrySource,
      slug,
      scoreBand: band,
      ctaId: 'other_test',
      ctaPosition: 'finale_tertiary',
    })
    router.replace('/test')
  }

  return (
    <div className="chat-shell-x mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-3 py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold leading-tight text-[var(--text)]">{title}</h2>
          <p className="mt-1 text-[15px] text-[var(--text-secondary,var(--text))] opacity-80">
            {QUICK_TEST_COPY.finaleScore(correct, total)} · {durationLabel} · {topicTitle}
          </p>
        </div>
        {band === 'perfect' ? <MedalBadge tier="gold" muted size="md" title="Призрак медали" /> : null}
      </div>

      {band === 'perfect' ? (
        <p className="text-[14px] leading-relaxed text-[var(--text)] opacity-85">
          {QUICK_TEST_COPY.finalePerfectHint}
        </p>
      ) : null}

      {insight ? (
        <p className="rounded-xl border border-[var(--border-subtle,rgba(0,0,0,0.12))] bg-white/45 px-3 py-2.5 text-[14px] leading-relaxed text-[var(--text)]">
          {insight}
        </p>
      ) : null}

      {showcaseErrors.length > 0 ? (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--text)] opacity-70">
            {QUICK_TEST_COPY.finaleErrorsHeading}
          </h3>
          <ul className="space-y-2">
            {showcaseErrors.map((item) => (
              <li
                key={item.questionId}
                className="rounded-xl border border-[var(--border-subtle,rgba(0,0,0,0.1))] bg-white/35 px-3 py-2 text-[13px] leading-relaxed"
              >
                <div className="font-medium">{item.prompt}</div>
                <div className="mt-1 opacity-80">{item.explanationRu}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={openLesson}
        className="min-h-[48px] w-full rounded-xl bg-[var(--text-accent,#4f8fe8)] px-4 py-3 text-[16px] font-semibold text-white touch-manipulation"
      >
        {cta}
      </button>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <QuickTestShareButton
          slug={slug}
          topicTitle={topicTitle}
          correct={correct}
          total={total}
          durationLabel={durationLabel}
          scoreBand={band}
          entrySource={entrySource}
        />
        {nextVariantId ? (
          <button
            type="button"
            onClick={anotherVariant}
            className="min-h-[44px] w-full rounded-xl border border-[var(--border-subtle,rgba(0,0,0,0.15))] bg-white/50 px-4 py-2.5 text-[15px] font-medium text-[var(--text)] touch-manipulation"
          >
            {QUICK_TEST_COPY.finaleAnotherVariant}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={otherTest}
        className="mx-auto text-[14px] font-medium text-[var(--text-accent,#4f8fe8)] underline-offset-2 hover:underline"
      >
        {QUICK_TEST_COPY.finaleOtherTest}
      </button>
    </div>
  )
}
