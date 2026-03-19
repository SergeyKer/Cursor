'use client'

import React from 'react'
import { TOPICS, LEVELS, TENSES, SENTENCE_TYPES, CHILD_TENSES } from '@/lib/constants'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import type { Settings, UsageInfo } from '@/lib/types'

const CHILD_TENSE_SET = new Set(CHILD_TENSES)

interface SlideOutMenuProps {
  open: boolean
  onToggle: () => void
  settings: Settings
  onSettingsChange: (s: Settings) => void
  usage: UsageInfo
  onNewDialog?: () => void
  /** Не рендерить встроенную кнопку (кнопка вынесена в шапку страницы) */
  hideButton?: boolean
}

export default function SlideOutMenu({
  open,
  onToggle,
  settings,
  onSettingsChange,
  usage,
  onNewDialog,
  hideButton = false,
}: SlideOutMenuProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isMobile = mounted && typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  const isChild = settings.audience === 'child'
  const childAllowedLevels = new Set(['all', 'starter', 'a1', 'a2'])
  const levelOptions = isChild ? LEVELS.filter((l) => childAllowedLevels.has(l.id)) : LEVELS
  const topicOptions = TOPICS
  const tenseOptions = isChild ? TENSES.filter((t) => CHILD_TENSE_SET.has(t.id)) : TENSES

  const update = (patch: Partial<Settings>) => {
    onSettingsChange({ ...settings, ...patch })
  }

  return (
    <>
      {!hideButton && (
        <button
          type="button"
          onClick={onToggle}
          className="fixed z-[60] flex h-14 w-14 min-w-[44px] min-h-[44px] items-center justify-center rounded-r-lg border border-l-0 border-[var(--border)] bg-[var(--bg)] text-[var(--text)] shadow-md transition-colors hover:bg-[#d0d4d8] focus-visible:bg-[#d0d4d8] active:bg-[#c8ccd0] touch-manipulation left-0 top-0"
          style={{ marginLeft: 'env(safe-area-inset-left)', marginTop: 'env(safe-area-inset-top)' }}
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          title={open ? 'Закрыть меню' : 'Открыть меню'}
        >
          <MenuIcon />
        </button>
      )}

      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden
        onClick={onToggle}
      />
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-56 max-w-[85vw] bg-[var(--bg)] border-r border-[var(--border)] shadow-lg transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Меню"
      >
        <div className="flex h-full flex-col p-2.5 pt-[max(5rem,calc(env(safe-area-inset-top)+4rem))]">
          {onNewDialog && (
            <button
              type="button"
              onClick={() => {
                onNewDialog()
                onToggle()
              }}
              className="group mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent-hover)] py-3 px-4 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              <NewChatIcon />
              <span>Новый чат</span>
            </button>
          )}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            <div>
              <label className="mb-0.5 block text-xs font-medium text-[var(--text-muted)]">
                Пользователь
              </label>
              <select
                value={settings.audience}
                onChange={(e) => {
                  const nextAudience = e.target.value as Settings['audience']
                  if (nextAudience === 'child') {
                    update({ audience: nextAudience, level: 'all', tenses: ['present_simple'] })
                    return
                  }
                  update({ audience: nextAudience })
                }}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] pl-2 py-1.5 min-h-[36px] text-xs text-[var(--text)] touch-manipulation select-chevron"
              >
                <option value="child">Никита</option>
                <option value="adult">Взрослый</option>
              </select>
            </div>

            <div>
              <label className="mb-0.5 block text-xs font-medium text-[var(--text-muted)]">
                ИИ
              </label>
              <select
                value={settings.provider}
                onChange={(e) => update({ provider: e.target.value as Settings['provider'] })}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] pl-2 py-1.5 min-h-[36px] text-xs text-[var(--text)] touch-manipulation select-chevron"
              >
                <option value="openrouter">OpenRouter (free)</option>
                <option value="openai">OpenAI — GPT‑4o mini</option>
              </select>
            </div>

            <div>
              <label className="mb-0.5 block text-xs font-medium text-[var(--text-muted)]">
                Режим
              </label>
              <select
                value={settings.mode}
                onChange={(e) => update({ mode: e.target.value as Settings['mode'] })}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] pl-2 py-1.5 min-h-[36px] text-xs text-[var(--text)] touch-manipulation select-chevron"
              >
                <option value="dialogue">Диалог</option>
                <option value="translation">Тренировка перевода</option>
              </select>
            </div>

            <div>
              <label className="mb-0.5 block text-xs font-medium text-[var(--text-muted)]">
                Время
              </label>
              <MultiSelectDropdown
                options={tenseOptions}
                value={settings.tenses}
                onChange={(tenses) =>
                  update({
                    tenses:
                      tenses.length > 0
                        ? (tenses as Settings['tenses'])
                        : (['present_simple'] as Settings['tenses']),
                  })
                }
                placeholder="Выберите время"
                selectAllLabel="Выбрать всё"
                minOne
                compact
                triggerClassName="rounded border border-[var(--border)] bg-[var(--bg-card)] touch-manipulation"
                panelClassName="max-h-[200px]"
              />
            </div>

            {mounted && settings.mode === 'translation' && (
              <div>
                <label className="mb-0.5 block text-xs font-medium text-[var(--text-muted)]">
                  Тип предложений
                </label>
                <select
                  value={settings.sentenceType}
                  onChange={(e) =>
                    update({ sentenceType: e.target.value as Settings['sentenceType'] })
                  }
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] pl-2 py-1.5 min-h-[36px] text-xs text-[var(--text)] touch-manipulation select-chevron"
                >
                  {SENTENCE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-0.5 block text-xs font-medium text-[var(--text-muted)]">
                Тема
              </label>
              <select
                value={settings.topic}
                onChange={(e) => update({ topic: e.target.value as Settings['topic'] })}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] pl-2 py-1.5 min-h-[36px] text-xs text-[var(--text)] touch-manipulation select-chevron"
              >
                {topicOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-0.5 block text-xs font-medium text-[var(--text-muted)]">
                Уровень
              </label>
              <select
                value={settings.level}
                onChange={(e) => update({ level: e.target.value as Settings['level'] })}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] pl-2 py-1.5 min-h-[36px] text-xs text-[var(--text)] touch-manipulation select-chevron"
              >
                {levelOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {!isMobile && (
              <div>
                <label className="mb-0.5 block text-xs font-medium text-[var(--text-muted)]">
                  Голос
                </label>
                <VoiceSelect
                  value={settings.voiceId}
                  onChange={(voiceId) => update({ voiceId })}
                />
              </div>
            )}

            <div className="rounded bg-[var(--border)]/50 px-2 py-1.5">
              <span className="text-xs text-[var(--text-muted)]">
                Запросов:{' '}
              </span>
              <span className="text-xs text-[var(--text)]">
                {usage.limit > 0 ? `${usage.used} / ${usage.limit}` : `${usage.used}`}
              </span>
            </div>
          </div>

        </div>
      </aside>
    </>
  )
}

function VoiceSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([])
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const list = () => setVoices(window.speechSynthesis.getVoices())
    window.speechSynthesis.onvoiceschanged = list
    list()
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  const list = mounted ? voices : []

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] pl-2 py-1.5 text-xs text-[var(--text)] select-chevron"
    >
      <option value="">Системный по умолчанию</option>
      {list
        .filter((v) => v.lang.startsWith('en'))
        .map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name} ({v.lang})
          </option>
        ))}
      {list.length === 0 && (
        <option value="" disabled>
          Загрузка…
        </option>
      )}
    </select>
  )
}

export function MenuIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function NewChatIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

