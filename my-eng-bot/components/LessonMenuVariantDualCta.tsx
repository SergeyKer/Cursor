'use client'

import {
  LESSON_VARIANT_FROZEN_UNTIL_START_TITLE,
  LESSON_VARIANT_PREPARE_LOADING_LABEL,
  type LessonVariantDualCtaLayout,
} from '@/lib/lessonVariantCtaCopy'
import {
  APP_BTN_SECONDARY_MENU,
  APP_BTN_SECONDARY_MENU_FROZEN,
  MENU_PRIMARY_CTA_CLASS,
} from '@/lib/homeCtaStyles'

type LessonMenuVariantDualCtaProps = {
  layout: LessonVariantDualCtaLayout
  selectedLessonId: string | null
  generatingLessonId: string | null
  canOpen: boolean
  canGenerate: boolean
  onOpen: () => void
  onGenerate: () => void | Promise<void>
  generateError?: string | null
}

export default function LessonMenuVariantDualCta({
  layout,
  selectedLessonId,
  generatingLessonId,
  canOpen,
  canGenerate,
  onOpen,
  onGenerate,
  generateError = null,
}: LessonMenuVariantDualCtaProps) {
  const isGenerating = Boolean(selectedLessonId && generatingLessonId === selectedLessonId)
  const newVariantLabel = isGenerating
    ? LESSON_VARIANT_PREPARE_LOADING_LABEL
    : layout.secondaryLabel

  if (layout.freezeNewVariant) {
    return (
      <>
        <button
          type="button"
          onClick={onOpen}
          disabled={!canOpen}
          className={MENU_PRIMARY_CTA_CLASS}
        >
          {layout.primaryLabel}
        </button>
        <button
          type="button"
          disabled
          aria-disabled
          title={LESSON_VARIANT_FROZEN_UNTIL_START_TITLE}
          className={APP_BTN_SECONDARY_MENU_FROZEN}
        >
          {layout.secondaryLabel}
        </button>
        {generateError ? (
          <p className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]">
            {generateError}
          </p>
        ) : null}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void onGenerate()}
        disabled={!canGenerate || isGenerating}
        className={MENU_PRIMARY_CTA_CLASS}
      >
        {newVariantLabel}
      </button>
      <button
        type="button"
        onClick={onOpen}
        disabled={!canOpen}
        className={APP_BTN_SECONDARY_MENU}
      >
        {layout.primaryLabel}
      </button>
      {generateError ? (
        <p className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]">
          {generateError}
        </p>
      ) : null}
    </>
  )
}
