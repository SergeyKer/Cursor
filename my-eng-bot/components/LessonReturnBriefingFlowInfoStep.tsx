'use client'

import FlowInfoStep from '@/components/FlowInfoStep'
import type { LessonReturnBriefingActions, LessonReturnBriefingCopy } from '@/lib/lessonReturnBriefingCopy'

type LessonReturnBriefingFlowInfoStepProps = {
  runKey: string
  copy: LessonReturnBriefingCopy
  actions: LessonReturnBriefingActions
  onContinue: () => void
  onGenerateVariant?: () => void
  generateVariantBusy?: boolean
  generateVariantProgress?: number
  generateVariantLabel?: string
}

export default function LessonReturnBriefingFlowInfoStep({
  runKey,
  copy,
  actions,
  onContinue,
  onGenerateVariant,
  generateVariantBusy,
  generateVariantProgress,
  generateVariantLabel,
}: LessonReturnBriefingFlowInfoStepProps) {
  return (
    <FlowInfoStep
      variant={copy.variant}
      title={copy.title}
      message={copy.message}
      secondaryMessage={copy.secondaryMessage}
      messageSpacing="section"
      thesisMessage
      compactActionsSpacing
      dualActionsRow={actions.offerGenerateVariant}
      actionLabel={actions.primaryLabel}
      onAction={onContinue}
      secondaryActionLabel={
        actions.offerGenerateVariant ? actions.secondaryLabel : undefined
      }
      onSecondaryAction={
        actions.offerGenerateVariant && onGenerateVariant ? onGenerateVariant : undefined
      }
      prioritizeSecondaryAction={actions.offerGenerateVariant}
      generateVariantBusy={generateVariantBusy}
      generateVariantProgress={generateVariantProgress}
      generateVariantLabel={generateVariantLabel}
      guardMountTapResetKey={runKey}
      ariaLabel="Инструкция к уроку"
    />
  )
}
