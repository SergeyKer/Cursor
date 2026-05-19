'use client'

import { coreXpToGold, type LessonMedalTierOrNull } from '@/lib/lessonScore'

type LessonMedalRevealProps = {
  medal: LessonMedalTierOrNull
  coreXp: number
  comboXp: number
  maxCoreXp: number
  corePercent: number
  className?: string
}

const MEDAL_LABEL: Record<NonNullable<LessonMedalTierOrNull>, string> = {
  gold: 'Золотая медаль!',
  silver: 'Серебряная медаль',
  bronze: 'Бронзовая медаль',
}

export default function LessonMedalReveal({
  medal,
  coreXp,
  comboXp,
  maxCoreXp,
  corePercent,
  className = 'mb-3',
}: LessonMedalRevealProps) {
  const gapToGold = coreXpToGold(coreXp, maxCoreXp)
  const title = medal ? MEDAL_LABEL[medal] : 'Урок пройден'
  const subtitle =
    medal === 'gold'
      ? 'Отличный результат по core.'
      : medal === 'silver' || medal === 'bronze'
        ? `До золота: ${gapToGold} core`
        : `До бронзы: ${Math.max(0, Math.ceil(maxCoreXp * 0.5) - coreXp)} core`

  return (
    <section
      className={`rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-center ${className}`.trim()}
    >
      <p className="text-2xl" aria-hidden>
        {medal === 'gold' ? '🥇' : medal === 'silver' ? '🥈' : medal === 'bronze' ? '🥉' : '○'}
      </p>
      <h3 className="mt-1 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">
        {coreXp} core + {comboXp} combo · {corePercent}%
      </p>
      <p className="mt-1 text-sm font-medium text-amber-800">{subtitle}</p>
    </section>
  )
}
