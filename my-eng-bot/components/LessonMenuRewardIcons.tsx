'use client'

import MedalBadge from '@/components/MedalBadge'
import PracticeRingBadge from '@/components/PracticeRingBadge'
import TopicCupBadge from '@/components/TopicCupBadge'
import type { LessonCardMedalDisplay } from '@/lib/lessonFooter'
import type { LessonMenuRewardIconsState } from '@/lib/practice/pickBestPracticeRewardOpportunity'

const ICON_SLOT_CLASS = 'flex w-[1.375rem] shrink-0 items-center justify-center sm:w-6'

export type LessonMenuRewardIconsProps = {
  rewardIcons: LessonMenuRewardIconsState | null
  medalDisplay?: LessonCardMedalDisplay | null
  size?: 'sm' | 'md'
}

export default function LessonMenuRewardIcons({
  rewardIcons,
  medalDisplay,
  size = 'md',
}: LessonMenuRewardIconsProps) {
  if (!rewardIcons && !medalDisplay) return null

  return (
    <span className="inline-flex shrink-0 items-center gap-2.5">
      {rewardIcons?.cupEarned ? (
        <span className={ICON_SLOT_CLASS}>
          <TopicCupBadge size={size} title={rewardIcons.cupTitle} />
        </span>
      ) : rewardIcons?.showRing ? (
        <span className="inline-flex shrink-0 items-center gap-1">
          <span className={ICON_SLOT_CLASS}>
            <PracticeRingBadge size={size} title={rewardIcons.ringTitle} />
          </span>
          <span className="tabular-nums text-[13px] font-medium leading-none text-[var(--text)]">
            {rewardIcons.ringCount}/{rewardIcons.ringMax}
          </span>
        </span>
      ) : null}
      {medalDisplay ? (
        <span className={ICON_SLOT_CLASS}>
          <MedalBadge
            tier={medalDisplay.tier}
            frozen={medalDisplay.frozen}
            size={size}
            muted={medalDisplay.muted}
            title={medalDisplay.title}
          />
        </span>
      ) : null}
    </span>
  )
}
