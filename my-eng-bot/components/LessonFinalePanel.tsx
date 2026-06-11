'use client'

import FlowInfoCard from '@/components/FlowInfoCard'
import PostLessonMenu from '@/components/PostLessonMenu'
import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import {
  buildFinaleOptionHints,
  buildLessonMedalRevealCopy,
  resolveFinalePrimaryAction,
} from '@/lib/lessonMedalRevealCopy'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import type { PostLessonAction, PostLessonOption } from '@/types/lesson'

type LessonFinalePanelProps = {
  medal: LessonMedalTierOrNull
  coreXp: number
  comboXp: number
  maxCoreXp: number
  corePercent: number
  audience: FooterCopyAudience
  options: PostLessonOption[]
  onSelect: (action: PostLessonAction) => void
  disabled?: boolean
}

export default function LessonFinalePanel({
  medal,
  coreXp,
  comboXp,
  maxCoreXp,
  corePercent,
  audience,
  options,
  onSelect,
  disabled = false,
}: LessonFinalePanelProps) {
  const copy = buildLessonMedalRevealCopy({
    medal,
    coreXp,
    comboXp,
    maxCoreXp,
    corePercent,
    audience,
  })
  const primaryAction = resolveFinalePrimaryAction(medal)
  const optionHints = buildFinaleOptionHints({
    medal,
    coreXp,
    maxCoreXp,
    audience,
  })

  return (
    <div
      className="mx-auto flex w-full max-w-sm flex-col gap-4"
      role="region"
      aria-label="Результат урока"
    >
      <div className="animate-fade-in-up w-full">
        <FlowInfoCard
          variant={copy.variant}
          icon={copy.icon}
          iconAfterTitle
          title={copy.title}
          statsLine={copy.statsLine}
          message={copy.message}
          secondaryMessage={copy.goalLine ?? undefined}
        />
      </div>
      <PostLessonMenu
        options={options}
        onSelect={onSelect}
        disabled={disabled}
        primaryAction={primaryAction}
        optionHints={optionHints}
        className="w-[82%] max-w-[15.5rem]"
      />
    </div>
  )
}
