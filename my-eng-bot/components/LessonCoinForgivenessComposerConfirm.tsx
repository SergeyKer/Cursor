'use client'

import { useState } from 'react'
import { APP_BTN_PRIMARY_INLINE, APP_BTN_SECONDARY_INLINE_MUTED } from '@/lib/homeCtaStyles'
import type { LessonCoinForgivenessCopy } from '@/lib/lessonCoinForgivenessCopy'

type LessonCoinForgivenessComposerConfirmProps = {
  copy: LessonCoinForgivenessCopy
  balanceAfter: number
  onConfirm: () => boolean
  onDecline: () => void
  onSpendFailed?: () => void
}

export default function LessonCoinForgivenessComposerConfirm({
  copy,
  balanceAfter,
  onConfirm,
  onDecline,
  onSpendFailed,
}: LessonCoinForgivenessComposerConfirmProps) {
  const [processing, setProcessing] = useState(false)

  const handleConfirm = () => {
    if (processing) return
    setProcessing(true)
    const ok = onConfirm()
    if (!ok) {
      setProcessing(false)
      onSpendFailed?.()
    }
  }

  return (
    <section
      className="rounded-[1.1rem] border border-blue-100 bg-white/95 px-3 py-2.5 shadow-sm"
      aria-label={copy.confirmTitle}
    >
      <p className="mb-1 text-sm font-semibold text-slate-900">{copy.confirmTitle}</p>
      <p className="mb-2 text-[13px] leading-snug text-slate-700">{copy.confirmBody(balanceAfter)}</p>
      <p className="mb-2.5 text-[12px] leading-snug text-slate-500">{copy.confirmHintMuted}</p>
      {processing ? (
        <p className="text-[13px] italic text-slate-600">{copy.processing}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={APP_BTN_PRIMARY_INLINE} onClick={handleConfirm}>
            {copy.confirmYes}
          </button>
          <button type="button" className={APP_BTN_SECONDARY_INLINE_MUTED} onClick={onDecline}>
            {copy.decline}
          </button>
        </div>
      )}
    </section>
  )
}
