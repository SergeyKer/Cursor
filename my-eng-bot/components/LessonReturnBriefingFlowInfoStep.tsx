'use client'

import FlowInfoStep from '@/components/FlowInfoStep'
import type { LessonReturnBriefingActions, LessonReturnBriefingCopy } from '@/lib/lessonReturnBriefingCopy'

type LessonReturnBriefingFlowInfoStepProps = {
  copy: LessonReturnBriefingCopy
  actions: LessonReturnBriefingActions
  onContinue: () => void
  onGenerateVariant?: () => void
}

export default function LessonReturnBriefingFlowInfoStep({
  copy,
  actions,
  onContinue,
  onGenerateVariant,
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
      ariaLabel="Инструкция к уроку"
    />
  )
}
