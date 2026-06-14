'use client'

import FlowInfoStep from '@/components/FlowInfoStep'
import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import type { LessonReturnBriefingCopy } from '@/lib/lessonReturnBriefingCopy'

type LessonReturnBriefingFlowInfoStepProps = {
  copy: LessonReturnBriefingCopy
  audience: FooterCopyAudience
  onContinue: () => void
}

export default function LessonReturnBriefingFlowInfoStep({
  copy,
  audience,
  onContinue,
}: LessonReturnBriefingFlowInfoStepProps) {
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
      ariaLabel="Инструкция к уроку"
      onAction={onContinue}
    />
  )
}
