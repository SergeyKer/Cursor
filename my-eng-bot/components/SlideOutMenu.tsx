'use client'

import React from 'react'
import { TOPICS, LEVELS, TENSES, SENTENCE_TYPES, CHILD_TENSES } from '@/lib/constants'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import type { Settings, UsageInfo } from '@/lib/types'

const CHILD_TENSE_SET = new Set(CHILD_TENSES)

type MenuView = 'root' | 'lessons' | 'aiChat' | 'settings' | 'progress'

const FIELD_SELECT =
  'w-full min-w-0 rounded border border-[var(--border)] bg-[var(--bg-card)] pl-2 py-1.5 min-h-[36px] text-xs text-[var(--text)] touch-manipulation select-chevron'

/** Только отображение числа — те же размеры/рамка/фон, что у select в «Чат с ИИ», без стрелки */
const MENU_VALUE_BOX =
  'w-full min-w-0 rounded border border-[var(--border)] bg-[var(--bg-card)] pl-2 py-1.5 min-h-[36px] text-xs text-[var(--text)] flex items-center justify-end'

/** Уже колонка подписей — больше места под select при той же ширине aside */
const MENU_FIELD_LABEL =
  'shrink-0 w-[6.3rem] text-xs font-medium leading-snug text-[var(--text-muted)] break-words'

/** Колонка подписей только для экрана «Настройки» (уже → шире select) */
const SETTINGS_MENU_FIELD_LABEL =
  'shrink-0 w-[3.43rem] text-xs font-medium leading-snug text-[var(--text-muted)] break-words'

interface SlideOutMenuProps {
  open: boolean
  onToggle: () => void
  settings: Settings
  onSettingsChange: (s: Settings) => void
  usage: UsageInfo
  dialogueCorrectAnswers: number
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
  dialogueCorrectAnswers,
  onNewDialog,
  hideButton = false,
}: SlideOutMenuProps) {
  const [menuView, setMenuView] = React.useState<MenuView>('root')

  React.useEffect(() => {
    if (!open) setMenuView('root')
  }, [open])

  const isChild = settings.audience === 'child'
  const isCommunication = settings.mode === 'communication'
  const childAllowedLevels = new Set(['all', 'starter', 'a1', 'a2'])
  const levelOptions = isChild ? LEVELS.filter((l) => childAllowedLevels.has(l.id)) : LEVELS
  const safeChildTopicsForCommunication = TOPICS.filter((t) => t.id !== 'business' && t.id !== 'work')
  const topicOptions = isCommunication && isChild ? safeChildTopicsForCommunication : TOPICS
  const tenseOptions = isChild ? TENSES.filter((t) => CHILD_TENSE_SET.has(t.id)) : TENSES
  const preferredVoiceLangPrefixes = isCommunication ? ['ru', 'en'] : ['en']

  const update = (patch: Partial<Settings>) => {
    onSettingsChange({ ...settings, ...patch })
  }

  return (
    <>
      {!hideButton && (
        <button
          type="button"
          onClick={onToggle}
          className="btn-3d-menu fixed z-[60] flex h-14 w-14 min-w-[44px] min-h-[44px] items-center justify-center rounded-r-lg border border-l-0 border-[var(--border)] bg-[var(--bg)] text-[var(--text)] touch-manipulation left-0 top-0"
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
        className={`fixed left-0 top-0 z-50 h-full w-80 max-w-[85vw] bg-[var(--bg)] border-r border-[var(--border)] shadow-lg transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Меню"
      >
        <div className="flex h-full flex-col p-2.5 pt-[max(4rem,calc(env(safe-area-inset-top)+3rem))]">
          {onNewDialog && (
            <button
              type="button"
              onClick={() => {
                onNewDialog()
                onToggle()
              }}
              className="group mb-3 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent-hover)] py-3 px-4 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              <NewChatIcon />
              <span>Новый чат</span>
            </button>
          )}

          <div className="flex min-h-0 flex-1 flex-col">
            {menuView !== 'root' && (
              <div className="mb-2 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)]/70 pb-2">
                <button
                  type="button"
                  onClick={() => setMenuView('root')}
                  className="btn-3d-subtle inline-flex shrink-0 min-h-[44px] items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--text)] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]"
                  aria-label="Назад к разделам"
                >
                  <ChevronLeftIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
                  Назад
                </button>
                <h2 className="min-w-0 flex-1 pr-0.5 text-right text-sm font-semibold leading-snug text-[var(--text)]">
                  {menuView === 'lessons' && 'Уроки'}
                  {menuView === 'aiChat' && 'Чат с ИИ'}
                  {menuView === 'settings' && 'Настройки'}
                  {menuView === 'progress' && 'Прогресс'}
                </h2>
              </div>
            )}

            <div
              key={menuView}
              className="menu-panel-view-enter min-h-0 flex-1 space-y-3 overflow-y-auto pb-1"
            >
              {menuView === 'root' && (
                <>
                  <MenuNavRow label="Уроки" onClick={() => setMenuView('lessons')} />
                  <MenuNavRow label="Чат с ИИ" onClick={() => setMenuView('aiChat')} />
                  <MenuNavRow label="Настройки" onClick={() => setMenuView('settings')} />
                  <MenuNavRow label="Прогресс" onClick={() => setMenuView('progress')} />
                </>
              )}

              {menuView === 'lessons' && (
                <div className="flex w-full items-start gap-3">
                  <span className={MENU_FIELD_LABEL}>Раздел</span>
                  <p className="min-w-0 flex-1 text-xs leading-relaxed text-[var(--text-muted)]">
                    Скоро здесь будут уроки. Раздел в разработке.
                  </p>
                </div>
              )}

              {menuView === 'aiChat' && (
                <>
                  <div className="flex w-full items-center gap-3">
                    <label htmlFor="slide-ai-mode" className={MENU_FIELD_LABEL}>
                      Режим
                    </label>
                    <div className="min-w-0 flex-1">
                      <select
                        id="slide-ai-mode"
                        value={settings.mode}
                        onChange={(e) => update({ mode: e.target.value as Settings['mode'] })}
                        className={FIELD_SELECT}
                      >
                        <option value="dialogue">Диалог</option>
                        <option value="translation">Тренировка перевода</option>
                        <option value="communication">Общение</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex w-full items-center gap-3">
                    <label htmlFor="slide-ai-audience" className={MENU_FIELD_LABEL}>
                      Стиль общения
                    </label>
                    <div className="min-w-0 flex-1">
                      <select
                        id="slide-ai-audience"
                        value={settings.audience}
                        onChange={(e) => {
                          const nextAudience = e.target.value as Settings['audience']
                          if (nextAudience === 'child') {
                            update({ audience: nextAudience, level: 'all', tenses: ['present_simple'] })
                            return
                          }
                          update({ audience: nextAudience })
                        }}
                        className={FIELD_SELECT}
                      >
                        <option value="child">Никита</option>
                        <option value="adult">Взрослый</option>
                      </select>
                    </div>
                  </div>

                  {!isCommunication && (
                    <div className="flex w-full items-center gap-3">
                      <span id="slide-ai-tense-label" className={MENU_FIELD_LABEL}>
                        Время
                      </span>
                      <div className="min-w-0 flex-1">
                        <MultiSelectDropdown
                          ariaLabelledBy="slide-ai-tense-label"
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
                          selectAllResetValue={['present_simple']}
                          minOne
                          compact
                          triggerClassName="rounded border border-[var(--border)] bg-[var(--bg-card)] touch-manipulation"
                          panelClassName="max-h-[200px]"
                        />
                      </div>
                    </div>
                  )}

                  {settings.mode === 'translation' && (
                    <div className="flex w-full items-center gap-3">
                      <label htmlFor="slide-ai-sentence-type" className={MENU_FIELD_LABEL}>
                        Тип предложений
                      </label>
                      <div className="min-w-0 flex-1">
                        <select
                          id="slide-ai-sentence-type"
                          value={settings.sentenceType}
                          onChange={(e) =>
                            update({ sentenceType: e.target.value as Settings['sentenceType'] })
                          }
                          className={FIELD_SELECT}
                        >
                          {SENTENCE_TYPES.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {(settings.mode !== 'communication' || isChild) && (
                    <div className="flex w-full items-center gap-3">
                      <label htmlFor="slide-ai-topic" className={MENU_FIELD_LABEL}>
                        Тема
                      </label>
                      <div className="min-w-0 flex-1">
                        <select
                          id="slide-ai-topic"
                          value={settings.topic}
                          onChange={(e) => update({ topic: e.target.value as Settings['topic'] })}
                          className={FIELD_SELECT}
                        >
                          {topicOptions.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {!isCommunication && (
                    <div className="flex w-full items-center gap-3">
                      <label htmlFor="slide-ai-level" className={MENU_FIELD_LABEL}>
                        Уровень
                      </label>
                      <div className="min-w-0 flex-1">
                        <select
                          id="slide-ai-level"
                          value={settings.level}
                          onChange={(e) => update({ level: e.target.value as Settings['level'] })}
                          className={FIELD_SELECT}
                        >
                          {levelOptions.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}

              {menuView === 'settings' && (
                <>
                  <div className="flex w-full items-center gap-3">
                    <label htmlFor="slide-settings-provider" className={SETTINGS_MENU_FIELD_LABEL}>
                      ИИ
                    </label>
                    <div className="min-w-0 flex-1">
                      <select
                        id="slide-settings-provider"
                        value={settings.provider}
                        onChange={(e) => update({ provider: e.target.value as Settings['provider'] })}
                        className={FIELD_SELECT}
                      >
                        <option value="openrouter">OpenRouter (free)</option>
                        <option value="openai">OpenAI — GPT‑4o mini</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex w-full items-center gap-3">
                    <label htmlFor="slide-settings-voice" className={SETTINGS_MENU_FIELD_LABEL}>
                      Голос
                    </label>
                    <div className="min-w-0 flex-1">
                      <VoiceSelect
                        id="slide-settings-voice"
                        value={settings.voiceId}
                        onChange={(voiceId) => update({ voiceId })}
                        preferredLangPrefixes={preferredVoiceLangPrefixes}
                      />
                    </div>
                  </div>
                </>
              )}

              {menuView === 'progress' && (
                <>
                  {settings.mode === 'dialogue' ? (
                    <>
                      <div className="flex w-full items-center gap-3">
                        <span id="slide-progress-correct-label" className={MENU_FIELD_LABEL}>
                          Правильных ответов
                        </span>
                        <div className="min-w-0 flex-1">
                          <div
                            className={MENU_VALUE_BOX}
                            role="status"
                            aria-labelledby="slide-progress-correct-label"
                          >
                            <span className="tabular-nums">{dialogueCorrectAnswers}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full items-center gap-3">
                        <span id="slide-progress-usage-label" className={MENU_FIELD_LABEL}>
                          Запросов
                        </span>
                        <div className="min-w-0 flex-1">
                          <div
                            className={MENU_VALUE_BOX}
                            role="status"
                            aria-labelledby="slide-progress-usage-label"
                          >
                            <span className="tabular-nums">
                              {usage.limit > 0 ? `${usage.used} / ${usage.limit}` : `${usage.used}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex w-full items-start gap-3">
                      <span className={MENU_FIELD_LABEL}>Справка</span>
                      <p className="min-w-0 flex-1 text-xs leading-relaxed text-[var(--text-muted)]">
                        Счётчик правильных ответов доступен в режиме «Диалог».
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function MenuNavRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2.5 text-left text-sm font-medium text-[var(--text)] shadow-sm transition-colors hover:bg-[var(--border)]/35 touch-manipulation min-h-[44px]"
    >
      <span>{label}</span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
    </button>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function VoiceSelect({
  id,
  value,
  onChange,
  preferredLangPrefixes,
}: {
  id?: string
  value: string
  onChange: (id: string) => void
  preferredLangPrefixes: string[]
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
  const preferred = list.filter((v) => preferredLangPrefixes.some((p) => v.lang.startsWith(p)))
  const finalList = preferred.length > 0 ? preferred : list

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={FIELD_SELECT}
    >
      <option value="">Системный по умолчанию</option>
      {finalList.map((v) => (
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

export function HomeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
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
