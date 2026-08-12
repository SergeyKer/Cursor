'use client'

import {
  ENGVO_XAI_VOICE_ROTATION_MODE_OPTIONS,
  ENGVO_XAI_VOICE_SECTIONS,
  getEngvoXaiVoiceSection,
  type EngvoXaiCallVoice,
  type EngvoXaiVoiceRotationMode,
  type EngvoXaiVoiceSectionId,
} from '@/lib/engvo/constants'
import { formatEngvoVoiceDisplayName } from '@/lib/engvo/voiceDisplayName'
import type { EngvoCustomVoiceEntry } from '@/lib/engvo/voiceLab/customVoicesManifest'

const MENU_GROUP_CLASS =
  'overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] shadow-[0_1px_4px_rgba(0,0,0,0.07)]'
const MENU_GROUP_OUTER = 'py-1'
const MENU_CHOICE_TEXT_CLASS =
  "text-[15px] font-normal [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,'Noto_Sans',Arial,sans-serif]"

export type XaiTtsVoiceMenuView = 'hub' | 'rotation' | 'section'

type XaiTtsVoiceMenuProps = {
  view: XaiTtsVoiceMenuView
  voice: EngvoXaiCallVoice
  rotationMode: EngvoXaiVoiceRotationMode
  sectionId: EngvoXaiVoiceSectionId
  customVoices: EngvoCustomVoiceEntry[]
  onOpenRotation: () => void
  onOpenSection: (id: EngvoXaiVoiceSectionId) => void
  onSelectRotation: (mode: EngvoXaiVoiceRotationMode) => void
  onSelectVoice: (voiceId: string) => void
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function SettingRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
    >
      <span className="shrink-0 text-sm font-medium leading-normal text-[var(--text-muted)]">{label}</span>
      <span
        className={`emoji-line min-w-0 flex-1 truncate-x whitespace-nowrap text-right text-[var(--text)] ${MENU_CHOICE_TEXT_CLASS}`}
      >
        {value}
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
    </button>
  )
}

function PickerList({
  options,
  value,
  onSelect,
}: {
  options: { id: string; label: string }[]
  value: string
  onSelect: (id: string) => void
}) {
  return (
    <div className={MENU_GROUP_OUTER}>
      <div className={MENU_GROUP_CLASS}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className="flex w-full min-h-[44px] items-center justify-end gap-1 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
          >
            <span className={`min-w-0 flex-1 text-right leading-normal text-[var(--text)] pr-1 ${MENU_CHOICE_TEXT_CLASS}`}>
              {opt.label}
            </span>
            {value === opt.id ? (
              <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            ) : (
              <span className="h-4 w-4 shrink-0" aria-hidden />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export function XaiTtsVoiceMenu({
  view,
  voice,
  rotationMode,
  sectionId,
  customVoices,
  onOpenRotation,
  onOpenSection,
  onSelectRotation,
  onSelectVoice,
}: XaiTtsVoiceMenuProps) {
  const voiceDisplayName = formatEngvoVoiceDisplayName(voice)
  const rotationLabel =
    ENGVO_XAI_VOICE_ROTATION_MODE_OPTIONS.find((o) => o.id === rotationMode)?.label ?? 'Нет'
  const currentSection = getEngvoXaiVoiceSection(voice)

  if (view === 'rotation') {
    return (
      <PickerList
        options={ENGVO_XAI_VOICE_ROTATION_MODE_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
        value={rotationMode}
        onSelect={(id) => onSelectRotation(id as EngvoXaiVoiceRotationMode)}
      />
    )
  }

  if (view === 'section') {
    if (sectionId === 'other') {
      return (
        <PickerList
          options={customVoices.map((item) => ({ id: item.voiceId, label: item.name }))}
          value={voice}
          onSelect={onSelectVoice}
        />
      )
    }
    const section = ENGVO_XAI_VOICE_SECTIONS.find((s) => s.id === sectionId)
    return (
      <PickerList
        options={(section?.voices ?? []).map((id) => ({
          id,
          label: formatEngvoVoiceDisplayName(id),
        }))}
        value={voice}
        onSelect={onSelectVoice}
      />
    )
  }

  return (
    <div className={MENU_GROUP_OUTER}>
      <div className={MENU_GROUP_CLASS}>
        <SettingRow label="Случайный" value={rotationLabel} onClick={onOpenRotation} />
        {ENGVO_XAI_VOICE_SECTIONS.map((section) => (
          <SettingRow
            key={section.id}
            label={section.label}
            value={currentSection === section.id ? voiceDisplayName : ''}
            onClick={() => onOpenSection(section.id)}
          />
        ))}
        {customVoices.length > 0 ? (
          <SettingRow
            label="Other"
            value={currentSection === 'other' ? voiceDisplayName : ''}
            onClick={() => onOpenSection('other')}
          />
        ) : null}
      </div>
    </div>
  )
}
