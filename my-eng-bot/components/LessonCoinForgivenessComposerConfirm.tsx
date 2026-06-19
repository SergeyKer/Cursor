'use client'

import { useState } from 'react'
import FlowInfoCard from '@/components/FlowInfoCard'
import {
  APP_BTN_PRIMARY_INLINE,
  APP_BTN_PRIMARY_LARGE,
  APP_BTN_SECONDARY_INLINE_MUTED,
} from '@/lib/homeCtaStyles'
import { COIN_ERROR_FORGIVENESS_COST } from '@/lib/lessonCoinForgiveness'
import type { LessonCoinForgivenessCopy } from '@/lib/lessonCoinForgivenessCopy'

export type LessonCoinForgivenessComposerMode = 'confirm' | 'applied'

type LessonCoinForgivenessComposerConfirmProps = {
  mode?: LessonCoinForgivenessComposerMode
  copy: LessonCoinForgivenessCopy
  coinBalance: number
  balanceAfter: number
  correctAnswerPreview?: string | null
  onConfirm: () => boolean
  onContinue?: () => void
  onDecline: () => void
  onZeroBalanceHelp?: () => void
  onSpendFailed?: () => void
}

export default function LessonCoinForgivenessComposerConfirm({
  mode = 'confirm',
  copy,
  coinBalance,
  balanceAfter,
  correctAnswerPreview = null,
  onConfirm,
  onContinue,
  onDecline,
  onZeroBalanceHelp,
  onSpendFailed,
}: LessonCoinForgivenessComposerConfirmProps) {
  const [processing, setProcessing] = useState(false)
  const hasEnoughCoins = coinBalance >= COIN_ERROR_FORGIVENESS_COST

  const confirmTitle = hasEnoughCoins ? copy.confirmTitle : copy.confirmTitleZeroBalance
  const confirmMessage = hasEnoughCoins ? copy.confirmBody(balanceAfter) : copy.confirmBodyZeroBalance
  const confirmHint = hasEnoughCoins ? copy.confirmHintMuted : copy.confirmHintZeroBalance

  const handleConfirm = () => {
    if (processing) return
    if (!hasEnoughCoins) {
      onZeroBalanceHelp?.()
      return
    }
    setProcessing(true)
    const ok = onConfirm()
    if (!ok) {
      setProcessing(false)
      onSpendFailed?.()
    }
  }

  const appliedAnswerLine = correctAnswerPreview?.trim()
    ? copy.appliedCorrectAnswerPreview(correctAnswerPreview.trim())
    : undefined

  const cardTitle = mode === 'applied' ? copy.appliedTitle : confirmTitle
  const cardMessage = mode === 'applied' ? copy.appliedBody(balanceAfter) : confirmMessage
  const cardSecondary =
    mode === 'applied'
      ? [appliedAnswerLine, copy.appliedGoldMedalHint].filter(Boolean).join('\n')
      : confirmHint

  return (
    <div
      className="mx-auto flex w-full max-w-sm flex-col gap-2.5"
      role="region"
      aria-label={cardTitle}
    >
      <div className="animate-fade-in-up w-full">
        <FlowInfoCard
          variant="info"
          title={cardTitle}
          message={cardMessage}
          secondaryMessage={cardSecondary}
          className="mb-0 shadow-md"
        />
      </div>
      {mode === 'applied' ? (
        <button
          type="button"
          onClick={onContinue}
          className={`${APP_BTN_PRIMARY_LARGE} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd]`}
        >
          {copy.appliedContinue}
        </button>
      ) : processing ? (
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
    </div>
  )
}
