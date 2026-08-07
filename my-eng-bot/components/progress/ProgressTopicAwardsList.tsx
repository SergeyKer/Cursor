'use client'

import { useEffect, useRef } from 'react'
import ProgressFooterButton from '@/components/progress/ProgressFooterButton'
import type { ProgressTopicAwardRow } from '@/lib/progress/topicAwardRows'
import {
  resolveTopicAwardLaunch,
  type ProgressTopicAwardLaunchTarget,
  type ProgressTopicLaunchKind,
} from '@/lib/progress/topicAwardRows'
import type { ProgressCopy } from '@/lib/uiCopy/progress'

type ProgressTopicAwardsListProps = {
  rows: ProgressTopicAwardRow[]
  copy: ProgressCopy
  expandedLessonId: string | null
  onToggle: (lessonId: string) => void
  onLaunch?: (target: ProgressTopicAwardLaunchTarget) => void
  practiceBusy?: boolean
  nearestBadge?: { emoji: string; line: string } | null
}

function medalGlyph(medal: ProgressTopicAwardRow['medal']): string {
  if (medal === 'gold') return '🥇'
  if (medal === 'silver') return '🥈'
  if (medal === 'bronze') return '🥉'
  if (medal === 'started') return '🏅'
  return '—'
}

export default function ProgressTopicAwardsList({
  rows,
  copy,
  expandedLessonId,
  onToggle,
  onLaunch,
  practiceBusy = false,
  nearestBadge = null,
}: ProgressTopicAwardsListProps) {
  const expandedRef = useRef<HTMLLIElement | null>(null)

  useEffect(() => {
    if (!expandedLessonId || !expandedRef.current) return
    expandedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [expandedLessonId])

  const launch = (row: ProgressTopicAwardRow, kind: ProgressTopicLaunchKind) => {
    if (!onLaunch || practiceBusy) return
    onLaunch(resolveTopicAwardLaunch(row, kind))
  }

  return (
    <div className="space-y-2">
      {nearestBadge ? (
        <p className="emoji-line text-[14px] font-semibold text-[var(--text)]">
          {nearestBadge.emoji} {nearestBadge.line}
        </p>
      ) : (
        <p className="text-[13px] text-[var(--text-muted)]">{copy.allBadgeStepsDone}</p>
      )}
      <p className="text-[13px] font-medium text-[var(--text-muted)]">{copy.topicsSection}</p>
      <ul className="space-y-2">
        {rows.map((row) => {
          const open = expandedLessonId === row.lessonId
          return (
            <li
              key={row.lessonId}
              ref={open ? expandedRef : undefined}
              className="min-w-0 rounded-md border border-[var(--border)]/70 bg-[var(--menu-control-bg)]"
            >
              <button
                type="button"
                className="flex min-h-[44px] w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
                aria-expanded={open}
                onClick={() => onToggle(row.lessonId)}
              >
                <span className="emoji-line min-w-0 break-words text-[14px] font-medium text-[var(--text)]">
                  {row.topicEmoji ? `${row.topicEmoji} ` : ''}
                  {row.topic}
                </span>
                <span className="emoji-line shrink-0 text-[13px] tabular-nums text-[var(--text-muted)]">
                  {medalGlyph(row.medal)}
                  {row.hasPracticeBadge ? ` · ${row.rankGlyph}` : ''}
                  {row.ringBadgeText ? ` · ${row.ringBadgeText}` : ''}
                </span>
              </button>
              {open ? (
                <div className="space-y-2 border-t border-[var(--border)]/60 px-2.5 py-2">
                  <div>
                    <p className="text-[12px] font-medium text-[var(--text-muted)]">{copy.lessonAwardsTitle}</p>
                    <p className="emoji-line mt-0.5 text-[13px] text-[var(--text)]">
                      {medalGlyph(row.medal)}
                      {row.lessonBadgePart ? ` · ${row.lessonBadgePart}` : ''}
                    </p>
                    {onLaunch ? (
                      <ProgressFooterButton
                        variant="launch"
                        label={copy.startLessonRow}
                        disabled={practiceBusy || row.notStarted}
                        roundBottom={false}
                        onClick={() => launch(row, 'lesson')}
                      />
                    ) : null}
                  </div>
                  {row.hasPracticeBadge ? (
                    <div>
                      <p className="text-[12px] font-medium text-[var(--text-muted)]">
                        {copy.topicStepsTitle}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                        {row.rankSteps.map((step) => (
                          <span key={step.rank} className="mr-2 inline-block">
                            {step.done ? '✓' : '·'} {step.name}
                          </span>
                        ))}
                      </p>
                      {row.nextLine ? (
                        <p className="emoji-line mt-1 text-[13px] text-[var(--text)]">{row.nextLine}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {row.ringBadgeText != null || row.showChallengeCta ? (
                    <div>
                      <p className="text-[12px] font-medium text-[var(--text-muted)]">{copy.topicCupTitle}</p>
                      <p className="emoji-line mt-0.5 text-[13px] text-[var(--text)]">
                        {row.cupClaimed ? copy.topicCupDone : row.ringBadgeText}
                      </p>
                    </div>
                  ) : null}
                  {onLaunch ? (
                    <div className="flex flex-col gap-1">
                      <ProgressFooterButton
                        variant="launch"
                        label={copy.startPracticeRow}
                        disabled={practiceBusy}
                        roundBottom={false}
                        onClick={() => launch(row, 'practice')}
                      />
                      {row.showChallengeCta ? (
                        <ProgressFooterButton
                          variant="launch"
                          label={copy.startChallengeRow}
                          disabled={practiceBusy}
                          roundBottom={false}
                          onClick={() => launch(row, 'challenge')}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="min-h-[36px] w-full text-left text-[12px] font-medium text-[var(--accent)]"
                    onClick={() => onToggle(row.lessonId)}
                  >
                    {copy.collapseTopic}
                  </button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
