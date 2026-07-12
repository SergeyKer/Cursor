'use client'

import type { AnimationEventHandler } from 'react'
import FlowInfoStep from '@/components/FlowInfoStep'
import { buildPracticeInstructionCopy } from '@/lib/practice/practiceInstructionCopy'
import type { PracticeBriefingThesisParams } from '@/lib/practice/practiceBriefingThesisCopy'
import type { Audience } from '@/lib/types'
import type { PracticeSession } from '@/types/practice'

type PracticeInstructionFlowInfoStepProps = {
  session: PracticeSession
  audience: Audience
  thesis: PracticeBriefingThesisParams
  onContinue: () => void
  enterClassName?: string
  actionsReady?: boolean
  onCardEnterAnimationEnd?: AnimationEventHandler<HTMLDivElement>
}

export default function PracticeInstructionFlowInfoStep({
  session,
  audience,
  thesis,
  onContinue,
  enterClassName,
  actionsReady,
  onCardEnterAnimationEnd,
}: PracticeInstructionFlowInfoStepProps) {
  const copy = buildPracticeInstructionCopy({ session, audience, thesis })
  const bodyMessage = copy.thesisLines.filter(Boolean).join('\n')
  const useRevealControl = actionsReady !== undefined

  return (
    <FlowInfoStep
      variant={copy.variant}
      title={copy.title}
      statsLine={copy.statsLine}
      message={bodyMessage}
      messageSpacing="section"
      thesisMessage
      compactActionsSpacing
      actionLabel="Продолжить"
      ariaLabel="Инструкция к практике"
      enterClassName={enterClassName}
      actionsReady={actionsReady}
      onCardEnterAnimationEnd={onCardEnterAnimationEnd}
      guardMountTapResetKey={useRevealControl ? undefined : session.id}
      onAction={onContinue}
    />
  )
}
