'use client'

import FlowInfoCard from '@/components/FlowInfoCard'
import PostLessonMenu from '@/components/PostLessonMenu'
import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import { FINALE_POST_LESSON_ACTIONS, LESSON_REPEAT_VARIANT_BUSY_LABEL, LESSON_REPEAT_VARIANT_LABEL } from '@/lib/lessonFinaleCta'
import {
  buildFinaleOptionHints,
  buildLessonMedalRevealCopy,
} from '@/lib/lessonMedalRevealCopy'
import type { LessonCoinAward } from '@/lib/coinAwards'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'
import type { PostLessonAction, PostLessonOption } from '@/types/lesson'

type LessonFinalePanelProps = {
  medal: LessonMedalTierOrNull
  coreXp: number
  comboXp: number
  maxCoreXp: number
  corePercent: number
  audience: FooterCopyAudience
  previousCorePercent?: number | null
  profileMedal?: LessonMedalTierOrNull
  firstTryCount?: number
  totalScoredUnits?: number
  coinAward?: LessonCoinAward | null
  options: PostLessonOption[]
  onSelect: (action: PostLessonAction) => void
  onBackToLessonList?: () => void
  onOpenTips?: () => void
  disabled?: boolean
  postLessonBusy?: boolean
  postLessonOverlayOpen?: boolean
  menuResetKey?: number
}

export default function LessonFinalePanel({
  medal,
  coreXp,
  comboXp,
  maxCoreXp,
  corePercent,
  audience,
  previousCorePercent = null,
  profileMedal = null,
  firstTryCount = 0,
  totalScoredUnits = 0,
  coinAward = null,
  options,
  onSelect,
  onBackToLessonList,
  onOpenTips,
  disabled = false,
  postLessonBusy = false,
  postLessonOverlayOpen = false,
  menuResetKey = 0,
}: LessonFinalePanelProps) {
  const copy = buildLessonMedalRevealCopy({
    medal,
    coreXp,
    comboXp,
    maxCoreXp,
    corePercent,
    audience,
    previousCorePercent,
    profileMedal,
    firstTryCount,
    totalScoredUnits,
    coinAward,
  })
  const optionHints = buildFinaleOptionHints({
    runMedal: medal,
    profileMedal,
    coreXp,
    maxCoreXp,
    audience,
  })

  const finaleOptions = options.filter((option) =>
    FINALE_POST_LESSON_ACTIONS.includes(option.action)
  )

  const resolvedOptions = finaleOptions.map((option) => {
    if (option.action !== 'repeat_variant') return option
    return {
      ...option,
      label: postLessonBusy ? LESSON_REPEAT_VARIANT_BUSY_LABEL : LESSON_REPEAT_VARIANT_LABEL,
    }
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
          firstTryLine={copy.firstTryLine ?? undefined}
          message={copy.message}
          coinLine={copy.coinLine ?? undefined}
          profileLine={copy.profileLine ?? undefined}
          secondaryMessage={copy.goalLine ?? undefined}
        />
      </div>
      <PostLessonMenu
        options={resolvedOptions}
        onSelect={onSelect}
        disabled={disabled}
        navigationDisabled={postLessonBusy}
        blueActionsFrozen={postLessonOverlayOpen}
        optionHints={optionHints}
        selectionResetKey={menuResetKey}
        onBackToLessonList={onBackToLessonList}
        onOpenTips={onOpenTips}
        className="w-[82%] max-w-[15.5rem]"
      />
    </div>
  )
}
