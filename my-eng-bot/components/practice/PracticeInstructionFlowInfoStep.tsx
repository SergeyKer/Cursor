'use client'

import FlowInfoStep from '@/components/FlowInfoStep'
import { buildPracticeInstructionCopy } from '@/lib/practice/practiceInstructionCopy'
import type { Audience } from '@/lib/types'
import type { PracticeSession } from '@/types/practice'

type PracticeInstructionFlowInfoStepProps = {
  session: PracticeSession
  audience: Audience
  onContinue: () => void
}

export default function PracticeInstructionFlowInfoStep({
  session,
  audience,
  onContinue,
}: PracticeInstructionFlowInfoStepProps) {
  const copy = buildPracticeInstructionCopy({ session, audience })

  return (
    <FlowInfoStep
      variant={copy.variant}
      icon={copy.icon}
      iconBetweenCaption={copy.iconBetweenCaption}
      title={copy.title}
      statsLine={copy.statsLine}
      message={copy.message}
      secondaryMessage={copy.secondaryMessage}
      actionLabel={audience === 'child' ? 'Продолжить' : 'Продолжить'}
      ariaLabel="Инструкция к практике"
      enterClassName="practice-section-appear"
      onAction={onContinue}
    />
  )
}
