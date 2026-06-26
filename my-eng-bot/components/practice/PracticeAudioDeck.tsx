'use client'

import { forwardRef, useImperativeHandle } from 'react'
import EngvoVoiceMeter from '@/components/EngvoVoiceMeter'
import { usePracticeTts } from '@/hooks/usePracticeTts'
import { APP_BTN_SECONDARY_SUBMIT } from '@/lib/homeCtaStyles'

const SPEED_CHIP_BUTTON_CLASS =
  'chat-assistant-chip-button chat-action-button inline-flex h-11 min-h-[44px] shrink-0 items-center justify-center rounded-full border border-[var(--chat-speaker-border)] bg-[var(--chat-speaker-bg)] px-3 text-sm font-medium tabular-nums text-[var(--chat-speaker-text)] hover:text-[var(--chat-speaker-text-hover)] disabled:cursor-not-allowed disabled:opacity-50'

const PLAY_BUTTON_CLASS = `${APP_BTN_SECONDARY_SUBMIT} inline-flex h-11 min-h-[44px] shrink-0 items-center justify-center gap-1.5 px-3.5`

const ICON_SLOT_CLASS = 'inline-flex h-4 w-4 shrink-0 items-center justify-center'

/** 5 столбцов ≈ ширина чипа скорости (5×4px + 4×4px gap). */
const PRACTICE_METER_BAR_COUNT = 5

export type PracticeAudioDeckHandle = {
  stopTts: () => void
}

type PracticeAudioDeckProps = {
  text: string
  voiceId: string
  questionId: string
  speedIndex: number
  onSpeedIndexChange: (index: number) => void
  disabled?: boolean
  className?: string
}

function PlayIcon() {
  return (
    <svg className={ICON_SLOT_CLASS} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l10.26-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg className={ICON_SLOT_CLASS} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  )
}

const PracticeAudioDeck = forwardRef<PracticeAudioDeckHandle, PracticeAudioDeckProps>(function PracticeAudioDeck(
  { text, voiceId, questionId, speedIndex, onSpeedIndexChange, disabled = false, className },
  ref
) {
  const trimmedText = text.trim()
  const controlsDisabled = disabled || !trimmedText
  const { isPlaying, speedPreset, togglePlay, stop, cycleSpeed } = usePracticeTts({
    text,
    voiceId,
    questionId,
    speedIndex,
    onSpeedIndexChange,
    disabled: controlsDisabled,
  })

  useImperativeHandle(
    ref,
    () => ({
      stopTts: stop,
    }),
    [stop]
  )

  const playLabel = isPlaying ? 'Стоп' : 'Прослушать'
  const playIcon = isPlaying ? <StopIcon /> : <PlayIcon />

  return (
    <div
      className={`grid h-11 w-full grid-cols-[1fr_auto_1fr] items-center gap-2 px-1${className ? ` ${className}` : ''}`}
      role="group"
      aria-label="Прослушивание фразы"
    >
      <div className="flex min-w-0 justify-center">
        <button
          type="button"
          onClick={cycleSpeed}
          disabled={controlsDisabled}
          className={SPEED_CHIP_BUTTON_CLASS}
          aria-label={speedPreset.ariaLabel}
          title={`Скорость: ${speedPreset.label}`}
        >
          <span className="relative inline-grid">
            <span className="invisible col-start-1 row-start-1">0.8×</span>
            <span className="col-start-1 row-start-1">{speedPreset.label}</span>
          </span>
        </button>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={togglePlay}
          disabled={controlsDisabled}
          className={PLAY_BUTTON_CLASS}
          aria-label={isPlaying ? 'Остановить воспроизведение' : 'Прослушать фразу'}
          title={playLabel}
        >
          <span className="relative inline-grid">
            <span className="invisible col-start-1 row-start-1 inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className={ICON_SLOT_CLASS} aria-hidden="true" />
              Прослушать
            </span>
            <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 whitespace-nowrap">
              {playIcon}
              {playLabel}
            </span>
          </span>
        </button>
      </div>

      <div className="flex min-w-0 justify-center">
        <EngvoVoiceMeter
          stream={null}
          active
          frozen={!isPlaying}
          role="assistant"
          idleAnimation="semiRandom"
          barCount={PRACTICE_METER_BAR_COUNT}
          className="w-auto shrink-0"
          ariaLabel={isPlaying ? 'Воспроизведение фразы' : 'Готов к прослушиванию'}
        />
      </div>
    </div>
  )
})

export default PracticeAudioDeck
