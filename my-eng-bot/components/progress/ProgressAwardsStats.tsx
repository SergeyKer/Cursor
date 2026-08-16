type ProgressAwardsStatsProps = {
  gold: number
  silver: number
  bronze: number
  cups: number | null
  lessonBadgesEarned: number
  lessonBadgesSummary: string
  ariaLabel: string
}

const COL_CLASS = 'min-w-0 text-center'

const GLYPH_CLASS = 'emoji-line text-[20px] leading-none'

const VALUE_CLASS = 'mt-0.5 text-[17px] font-semibold tabular-nums text-[var(--text)]'

export default function ProgressAwardsStats({
  gold,
  silver,
  bronze,
  cups,
  lessonBadgesEarned,
  lessonBadgesSummary,
  ariaLabel,
}: ProgressAwardsStatsProps) {
  const cols = cups != null ? 'grid-cols-4' : 'grid-cols-3'
  return (
    <div role="group" aria-label={ariaLabel}>
      <div className={`grid ${cols} gap-1`}>
        <div className={COL_CLASS}>
          <p className={GLYPH_CLASS} aria-hidden>
            🥇
          </p>
          <p className={VALUE_CLASS}>{gold}</p>
        </div>
        <div className={COL_CLASS}>
          <p className={GLYPH_CLASS} aria-hidden>
            🥈
          </p>
          <p className={VALUE_CLASS}>{silver}</p>
        </div>
        <div className={COL_CLASS}>
          <p className={GLYPH_CLASS} aria-hidden>
            🥉
          </p>
          <p className={VALUE_CLASS}>{bronze}</p>
        </div>
        {cups != null ? (
          <div className={COL_CLASS}>
            <p className={GLYPH_CLASS} aria-hidden>
              🏆
            </p>
            <p className={VALUE_CLASS}>{cups}</p>
          </div>
        ) : null}
      </div>
      <p className="mt-1.5 text-[13px] text-[var(--text-muted)]">
        {lessonBadgesSummary} {lessonBadgesEarned}
      </p>
    </div>
  )
}
