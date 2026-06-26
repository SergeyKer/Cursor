'use client'

import type { AnimationEventHandler } from 'react'
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
  enterClassName?: string
  actionsReady?: boolean
  onCardEnterAnimationEnd?: AnimationEventHandler<HTMLDivElement>
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
  enterClassName,
  actionsReady,
  onCardEnterAnimationEnd,
}: LessonReturnBriefingFlowInfoStepProps) {
  const useRevealControl = actionsReady !== undefined

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
      enterClassName={enterClassName}
      actionsReady={actionsReady}
      onCardEnterAnimationEnd={onCardEnterAnimationEnd}
      guardMountTapResetKey={useRevealControl ? undefined : runKey}
      ariaLabel="Инструкция к уроку"
    />
  )
}
