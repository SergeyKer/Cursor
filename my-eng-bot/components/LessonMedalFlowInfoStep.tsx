'use client'

import FlowInfoStep from '@/components/FlowInfoStep'
import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import { buildLessonMedalRevealCopy } from '@/lib/lessonMedalRevealCopy'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'

type LessonMedalFlowInfoStepProps = {
  medal: LessonMedalTierOrNull
  coreXp: number
  comboXp: number
  maxCoreXp: number
  corePercent: number
  audience: FooterCopyAudience
  onNext: () => void
}

export default function LessonMedalFlowInfoStep({
  medal,
  coreXp,
  comboXp,
  maxCoreXp,
  corePercent,
  audience,
  onNext,
}: LessonMedalFlowInfoStepProps) {
  const copy = buildLessonMedalRevealCopy({
    medal,
    coreXp,
    comboXp,
    maxCoreXp,
    corePercent,
    audience,
  })

  return (
    <FlowInfoStep
      variant={copy.variant}
      icon={copy.icon}
      title={copy.title}
      statsLine={copy.statsLine}
      message={copy.message}
      secondaryMessage={copy.cupLine ?? undefined}
      ariaLabel="Результат урока"
      onAction={onNext}
    />
  )
}
