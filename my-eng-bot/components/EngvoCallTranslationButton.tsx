'use client'

export type EngvoCallTranslationDotState = 'idle' | 'loading' | 'ready' | 'error'

function dotClassName(state: EngvoCallTranslationDotState): string {
  switch (state) {
    case 'ready':
      return 'bg-[var(--engvo-translate-dot-ready)]'
    case 'loading':
      return 'bg-[var(--engvo-translate-dot-loading)]'
    case 'error':
      return 'bg-[var(--engvo-translate-dot-error)]'
    default:
      return 'bg-[var(--engvo-translate-dot-idle)]'
  }
}

type EngvoCallTranslationButtonProps = {
  expanded: boolean
  dotState: EngvoCallTranslationDotState
  onToggle: () => void
}

/** Кнопка «Перевод_звонок» — только звонок Engvo; не заменяет «Перевод» в Диалоге. */
export function EngvoCallTranslationButton({ expanded, dotState, onToggle }: EngvoCallTranslationButtonProps) {
  return (
    <button
      type="button"
      data-testid="button-translate-call"
      data-ui="translate-call"
      onClick={onToggle}
      className="chat-assistant-chip-button chat-action-button flex w-fit items-center justify-center gap-1.5 rounded-full border border-[var(--chat-speaker-border)] bg-[var(--chat-speaker-bg)] px-2.5 py-0.5 text-xs text-[var(--chat-speaker-text)]"
      title={expanded ? 'Скрыть перевод звонка' : 'Показать перевод звонка'}
      aria-label={expanded ? 'Скрыть перевод звонка' : 'Перевод звонка'}
    >
      {!expanded && <span className={`h-2 w-2 shrink-0 rounded-full ${dotClassName(dotState)}`} aria-hidden />}
      {expanded ? 'Скрыть перевод' : 'Перевод'}
    </button>
  )
}
