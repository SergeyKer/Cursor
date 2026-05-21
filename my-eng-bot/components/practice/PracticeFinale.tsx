'use client'

import type { PracticeMode, PracticeSession } from '@/types/practice'
import type { PracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import { getPracticeFinalePrimaryAction } from '@/lib/practice/practiceFinaleCta'

interface PracticeFinaleProps {
  session: PracticeSession
  tier?: PracticeEconomyTier
  globalAmount?: number
  ringCount?: number
  gemsPending?: boolean
  onRepeat: () => void
  onChallenge: () => void
  onOpenLesson: () => void
  onBackToPracticeMenu: () => void
  busy?: boolean
}

function nextModeLabel(mode: PracticeMode): string {
  if (mode === 'reference') return 'Перейти в Challenge'
  if (mode === 'relaxed') return 'Продолжить до Balanced'
  if (mode === 'balanced') return 'Challenge на 12 заданий'
  return 'Повторить Challenge'
}

export default function PracticeFinale({
  session,
  tier = 0,
  globalAmount = 0,
  ringCount = 0,
  gemsPending = false,
  onRepeat,
  onChallenge,
  onOpenLesson,
  onBackToPracticeMenu,
  busy = false,
}: PracticeFinaleProps) {
  const total = Math.max(1, session.questions.length)
  const percent = Math.round((session.score / total) * 100)
  const correctedCount = session.answers.filter((answer) => answer.corrected).length
  const primary = getPracticeFinalePrimaryAction({
    tier,
    globalAmount,
    ringCount,
    mode: session.mode,
    gemsPending,
  })

  const supportiveText =
    globalAmount > 0
      ? `+${globalAmount} XP к уровню за этот проход.`
      : tier === 0
        ? `${session.xp} XP за сессию — к уровню не идёт без урока с медалью.`
        : percent >= 80
          ? 'Тема держится уверенно. Повтор даст меньше XP к уровню — это нормально.'
          : correctedCount > 0
            ? 'Ошибки закрепили правильным вариантом.'
            : 'Хорошая тренировка. Следующий круг сделает ответы быстрее.'

  const handlePrimary = () => {
    if (primary.action === 'repeat') onRepeat()
    else if (primary.action === 'challenge') onChallenge()
    else if (primary.action === 'openLesson') onOpenLesson()
    else onBackToPracticeMenu()
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3 py-3">
      <section className="lesson-enter chat-section-surface glass-surface rounded-2xl border border-green-200/90 bg-green-50/95 px-4 py-3 text-green-800">
        <p className="text-base font-semibold">Практика завершена</p>
        <p className="mt-1 text-sm leading-relaxed">
          {session.score}/{total} верно, {session.xp} XP за сессию. {supportiveText}
        </p>
        {ringCount > 0 ? (
          <p className="mt-1 text-xs text-green-700/90">🔁 {ringCount}/5 за тему{gemsPending ? ' · 💎 ждёт золото' : ''}</p>
        ) : null}
      </section>
      <button
        type="button"
        onClick={handlePrimary}
        disabled={busy}
        className="btn-3d-menu w-full rounded-xl border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-4 py-3 text-center text-base font-semibold text-[var(--status-info-text)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? 'Генерируем новый вариант...' : primary.label}
      </button>
      <p className="px-1 text-center text-[12px] leading-snug text-[var(--text-muted)]">{primary.hint}</p>
      {primary.action !== 'repeat' ? (
        <button
          type="button"
          onClick={onRepeat}
          disabled={busy}
          className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-[var(--menu-card-bg)] px-4 py-3 text-center text-base font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Повторить
        </button>
      ) : (
        <button
          type="button"
          onClick={onChallenge}
          disabled={busy}
          className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-[var(--menu-card-bg)] px-4 py-3 text-center text-base font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {nextModeLabel(session.mode)}
        </button>
      )}
      <button
        type="button"
        onClick={onOpenLesson}
        disabled={busy}
        className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-center text-sm font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Пройти урок по теме
      </button>
      <button
        type="button"
        onClick={onBackToPracticeMenu}
        disabled={busy}
        className="w-full rounded-xl px-4 py-2 text-center text-sm font-medium text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        В меню практики
      </button>
    </div>
  )
}
