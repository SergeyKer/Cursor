'use client'

import type { PracticeMode, PracticeSession } from '@/types/practice'

interface PracticeFinaleProps {
  session: PracticeSession
  onRepeat: () => void
  onChallenge: () => void
  onOpenLesson: () => void
  onBackToPracticeMenu: () => void
  busy?: boolean
}

function nextModeLabel(mode: PracticeMode): string {
  if (mode === 'relaxed') return 'Продолжить до Balanced'
  if (mode === 'balanced') return 'Challenge на 12 заданий'
  return 'Повторить Challenge'
}

export default function PracticeFinale({
  session,
  onRepeat,
  onChallenge,
  onOpenLesson,
  onBackToPracticeMenu,
  busy = false,
}: PracticeFinaleProps) {
  const total = Math.max(1, session.questions.length)
  const percent = Math.round((session.score / total) * 100)
  const correctedCount = session.answers.filter((answer) => answer.corrected).length
  const supportiveText =
    percent >= 80
      ? 'Тема уже держится уверенно. Теперь лучше закрепить новым вариантом.'
      : correctedCount > 0
        ? 'Ошибки не пропали зря: вы их сразу закрепили правильным вариантом.'
        : 'Хорошая тренировка. Следующий круг сделает ответы быстрее.'

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3 py-3">
      <section className="lesson-enter chat-section-surface glass-surface rounded-2xl border border-green-200/90 bg-green-50/95 px-4 py-3 text-green-800">
        <p className="text-base font-semibold">Практика завершена</p>
        <p className="mt-1 text-sm leading-relaxed">
          {session.score}/{total} верно, {session.xp} XP. {supportiveText}
        </p>
      </section>
      <button
        type="button"
        onClick={onRepeat}
        disabled={busy}
        className="btn-3d-menu w-full rounded-xl border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-4 py-3 text-center text-base font-semibold text-[var(--status-info-text)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? 'Генерируем новый вариант...' : 'Повторить'}
      </button>
      <button
        type="button"
        onClick={onChallenge}
        disabled={busy}
        className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-[var(--menu-card-bg)] px-4 py-3 text-center text-base font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {nextModeLabel(session.mode)}
      </button>
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
