'use client'

import SpeakerIcon from '@/components/chat/SpeakerIcon'
import { TranslationButtonDot, type TranslationDotState } from '@/components/TranslationButtonDot'

const CHIP_BUTTON_CLASS =
  'chat-assistant-chip-button chat-action-button flex w-fit items-center justify-center gap-1.5 rounded-full border border-[var(--chat-speaker-border)] bg-[var(--chat-speaker-bg)] px-2.5 py-0.5 text-xs text-[var(--chat-speaker-text)]'

type SpeakTranslationControlsProps = {
  onSpeak: () => void
  showTranslation: boolean
  onToggleTranslation: () => void
  translationDotState: TranslationDotState
  translation?: string
  translationError?: string
  isLoadingTranslation: boolean
  chipsVisible?: boolean
  chipsUseEnterAnimation?: boolean
  embedded?: boolean
}

function TranslationPanelCard({
  tone,
  label,
  text,
  textItalic = false,
}: {
  tone: 'slate' | 'amber'
  label: string
  text: string
  textItalic?: boolean
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-[var(--chat-section-amber-border)] bg-[var(--chat-section-amber)]'
      : 'border-[var(--chat-section-slate-border)] bg-[var(--chat-section-slate)]'

  const labelClass =
    tone === 'amber' ? 'text-[var(--status-warning-text)]' : 'text-[var(--chat-label-slate)]'

  return (
    <section
      className={`chat-section-surface glass-surface block min-w-0 w-full max-w-full self-stretch rounded-xl border px-3 py-2 flex items-start ${toneClass}`}
      role="note"
    >
      <div
        className="min-w-0 max-w-full whitespace-normal break-words font-sans text-[14px] leading-snug text-[var(--text)]"
        title={`${label}: ${text}`}
      >
        <span className={`font-medium ${labelClass}`}>{label}:</span>{' '}
        <span className={textItalic ? 'font-serif italic text-[var(--invitation)]' : 'text-[var(--text)]'}>
          {text}
        </span>
      </div>
    </section>
  )
}

export default function SpeakTranslationControls({
  onSpeak,
  showTranslation,
  onToggleTranslation,
  translationDotState,
  translation,
  translationError,
  isLoadingTranslation,
  chipsVisible = true,
  chipsUseEnterAnimation = false,
  embedded = false,
}: SpeakTranslationControlsProps) {
  const hasTranslationData = Boolean(translation?.trim())
  const hasTranslationError = Boolean(translationError?.trim())

  const showTranslationPanel =
    (showTranslation && hasTranslationData) ||
    hasTranslationError ||
    (showTranslation && !hasTranslationData && !hasTranslationError)

  const chipEnterClass = chipsVisible && chipsUseEnterAnimation ? 'lesson-text-soft-enter' : ''
  const chipReserveClass = chipsVisible ? '' : 'invisible pointer-events-none'

  return (
    <div className={embedded ? undefined : 'mb-2'}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          tabIndex={chipsVisible ? undefined : -1}
          onClick={() => {
            if (!chipsVisible) return
            onSpeak()
          }}
          className={`${CHIP_BUTTON_CLASS} ${chipReserveClass} ${chipEnterClass}`}
          title="Озвучить"
          aria-label="Озвучить сообщение"
          aria-hidden={!chipsVisible ? true : undefined}
        >
          <SpeakerIcon /> Озвучить
        </button>
        <button
          type="button"
          tabIndex={chipsVisible ? undefined : -1}
          onClick={() => {
            if (!chipsVisible) return
            onToggleTranslation()
          }}
          className={`${CHIP_BUTTON_CLASS} ${chipReserveClass} ${chipEnterClass}`}
          title={showTranslation ? 'Скрыть перевод' : 'Показать перевод'}
          aria-label={showTranslation ? 'Скрыть перевод сообщения' : 'Показать перевод сообщения'}
          aria-expanded={chipsVisible ? showTranslation : undefined}
          aria-hidden={!chipsVisible ? true : undefined}
        >
          {!showTranslation && <TranslationButtonDot state={translationDotState} />}
          {showTranslation ? 'Скрыть перевод' : 'Перевод'}
        </button>
      </div>

      {showTranslationPanel ? (
        <div className="mt-2">
          {showTranslation && hasTranslationData && translation ? (
            <TranslationPanelCard tone="slate" label="Перевод" text={translation} />
          ) : null}
          {hasTranslationError && translationError ? (
            <TranslationPanelCard
              tone="amber"
              label="Перевод"
              text={translationError ?? 'Перевод не пришёл, нажми ещё раз.'}
            />
          ) : null}
          {showTranslation && !hasTranslationData && !hasTranslationError && isLoadingTranslation ? (
            <TranslationPanelCard tone="slate" label="Перевод" text="Загрузка перевода…" textItalic />
          ) : null}
          {showTranslation && !hasTranslationData && !hasTranslationError && !isLoadingTranslation ? (
            <TranslationPanelCard
              tone="amber"
              label="Перевод"
              text="Не удалось загрузить перевод. Нажми «Перевод» ещё раз."
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
