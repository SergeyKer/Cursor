'use client'

import { useState } from 'react'
import { buildQuickTestSharePayload } from '@/lib/quickTest/shareCopy'
import { trackQuickTest } from '@/lib/quickTest/analytics'
import type { QuickTestEntrySource, QuickTestScoreBand } from '@/lib/quickTest/types'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'
import { QuickTestNotice } from '@/components/quickTest/QuickTestNotice'

type QuickTestShareButtonProps = {
  slug: string
  topicTitle: string
  correct: number
  total: number
  durationLabel: string
  scoreBand: QuickTestScoreBand
  entrySource: QuickTestEntrySource
  className?: string
}

export function QuickTestShareButton({
  slug,
  topicTitle,
  correct,
  total,
  durationLabel,
  scoreBand,
  entrySource,
  className = '',
}: QuickTestShareButtonProps) {
  const [notice, setNotice] = useState<string | null>(null)

  const onShare = async () => {
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
      scoreBand,
      ctaId: 'share_copy',
      ctaPosition: 'finale_secondary',
    })
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.text)
        setNotice(QUICK_TEST_COPY.shareCopied)
        return
      }
    } catch {
      /* fall through */
    }
    setNotice(QUICK_TEST_COPY.shareClipboardFallback)
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void onShare()}
        className="min-h-[44px] w-full rounded-xl border border-[var(--border-subtle,rgba(0,0,0,0.15))] bg-white/50 px-4 py-2.5 text-[15px] font-medium text-[var(--text)] touch-manipulation"
      >
        {QUICK_TEST_COPY.finaleShare}
      </button>
      <QuickTestNotice message={notice} />
    </div>
  )
}
