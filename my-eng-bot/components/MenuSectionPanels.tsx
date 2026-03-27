'use client'

import React from 'react'
import { TOPICS, LEVELS, TENSES, SENTENCE_TYPES, CHILD_TENSES } from '@/lib/constants'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import type { Settings, UsageInfo } from '@/lib/types'

const CHILD_TENSE_SET = new Set(CHILD_TENSES)

export type MenuView = 'root' | 'lessons' | 'aiChat' | 'settings' | 'progress' | 'profile'

export const FIELD_SELECT =
  'w-full min-w-0 rounded border border-[var(--border)] bg-[var(--bg-card)] pl-2 py-0.5 min-h-[32px] text-xs text-[var(--text)] touch-manipulation select-chevron'

const MENU_VALUE_BOX =
  'w-full min-w-0 rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-0.5 min-h-[32px] text-xs text-[var(--text)] flex items-center justify-end'

export const MENU_FIELD_LABEL =
  'shrink-0 w-[6.3rem] text-xs font-medium leading-snug text-[var(--text-muted)] break-words'

/** Градиентная CTA: «Начать общение» и пункты главной «Чат / Уроки». */
const MENU_PRIMARY_CTA_CLASS =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent-hover)] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:brightness-95 touch-manipulation min-h-[40px]'

/** Только en в выпадающем списке голоса (без ru). Стабильная ссылка для VoiceSelect. */
const VOICE_DROPDOWN_LANG_PREFIXES: string[] = ['en']

export interface MenuSectionPanelsProps {
  menuView: MenuView
  onMenuViewChange: (v: MenuView) => void
  settings: Settings
  onSettingsChange: (s: Settings) => void
  usage: UsageInfo
  dialogueCorrectAnswers: number
  /** Префиксы id для полей (избегать дубликатов, если панель на странице и в шторке одновременно). */
  idPrefix?: string
  className?: string
  /** Главная: рамка по высоте контента, без пустого пространства под списком разделов. */
  homeLayout?: boolean
  /** Запуск чата из раздела «Чат с MyEng» (главная или боковое меню). */
  onStartHomeChat?: () => void
  /** Кнопка «домик»: выход на стартовый экран (передаётся из страницы). */
  onGoHome?: () => void
}

export default function MenuSectionPanels({
  menuView,
  onMenuViewChange,
  settings,
  onSettingsChange,
  usage,
  dialogueCorrectAnswers,
  idPrefix = 'menu-',
  className,
  homeLayout = false,
  onStartHomeChat,
  onGoHome,
}: MenuSectionPanelsProps) {
  const pid = (suffix: string) => `${idPrefix}${suffix}`

  const isChild = settings.audience === 'child'
  const isCommunication = settings.mode === 'communication'
  const childAllowedLevels = new Set(['all', 'starter', 'a1', 'a2'])
  const levelOptions = isChild ? LEVELS.filter((l) => childAllowedLevels.has(l.id)) : LEVELS
  const safeChildTopicsForCommunication = TOPICS.filter((t) => t.id !== 'business' && t.id !== 'work')
  const topicOptions = isCommunication && isChild ? safeChildTopicsForCommunication : TOPICS
  const tenseOptions = isChild ? TENSES.filter((t) => CHILD_TENSE_SET.has(t.id)) : TENSES
  const update = (patch: Partial<Settings>) => {
    onSettingsChange({ ...settings, ...patch })
  }

  const rootClass =
    className ??
    (homeLayout ? 'flex min-h-0 flex-col' : 'flex min-h-0 flex-1 flex-col')

  return (
    <div className={rootClass}>
      {menuView !== 'root' && (
        <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)]/70 pb-1.5">
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onMenuViewChange('root')}
              className="btn-3d-menu grid min-h-[44px] min-w-[6rem] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-0 rounded-lg border border-[var(--text)]/[0.18] bg-[var(--bg-card)] px-2 py-1.5 text-xs font-medium text-[var(--text)] touch-manipulation focus-visible:outline-none"
              aria-label="Назад к разделам"
            >
              <span className="flex justify-end pr-0.5" aria-hidden>
                <ChevronLeftIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              </span>
              <span className="text-center">Назад</span>
              <span className="min-w-0" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                if (onGoHome) onGoHome()
                else onMenuViewChange('root')
              }}
              className="btn-3d-menu flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-[var(--text)]/[0.18] bg-[var(--bg-card)] text-[var(--text)] touch-manipulation focus-visible:outline-none"
              aria-label="На стартовый экран"
              title="Стартовая страница"
            >
              <HomeIcon className="h-5 w-5 text-[var(--text-muted)]" />
            </button>
          </div>
          <h2 className="min-w-0 flex-1 pr-2 text-right text-sm font-semibold leading-snug text-[var(--text)] sm:pr-3">
            {menuView === 'lessons' && 'Уроки'}
            {menuView === 'aiChat' && 'Чат с MyEng'}
            {menuView === 'settings' && 'Настройки'}
            {menuView === 'progress' && 'Прогресс'}
            {menuView === 'profile' && 'Профиль'}
          </h2>
        </div>
      )}

      <div
        key={menuView}
        className={
          homeLayout
            ? 'menu-panel-view-enter max-h-[calc(100dvh-12rem)] space-y-1.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-0.5'
            : 'menu-panel-view-enter min-h-0 flex-1 space-y-1.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1'
        }
      >
          {menuView === 'root' && !homeLayout && (
            <>
              <MenuNavRow
                label="Чат с MyEng"
                onClick={() => onMenuViewChange('aiChat')}
                variant={homeLayout ? 'primary' : 'default'}
              />
              <MenuNavRow
                label="Уроки"
                onClick={() => onMenuViewChange('lessons')}
                variant={homeLayout ? 'primary' : 'default'}
              />
              {!homeLayout && (
                <>
                  <MenuNavRow label="Прогресс" onClick={() => onMenuViewChange('progress')} />
                  <MenuNavRow label="Настройки" onClick={() => onMenuViewChange('settings')} />
                  <MenuNavRow label="Профиль" onClick={() => onMenuViewChange('profile')} />
                </>
              )}
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

          {menuView === 'profile' && (
            <div className="flex w-full items-start gap-3">
              <span className={MENU_FIELD_LABEL}>Раздел</span>
              <p className="min-w-0 flex-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Профиль появится позже.
              </p>
            </div>
          )}

          {menuView === 'aiChat' && (
            <>
              <div className="flex w-full items-center gap-3">
                <label htmlFor={pid('ai-mode')} className={MENU_FIELD_LABEL}>
                  Режим
                </label>
                <div className="min-w-0 flex-1">
                  <select
                    id={pid('ai-mode')}
                    value={settings.mode}
                    onChange={(e) => update({ mode: e.target.value as Settings['mode'] })}
                    className={FIELD_SELECT}
                  >
                    <option value="communication">Общение</option>
                    <option value="dialogue">Диалог</option>
                    <option value="translation">Тренировка перевода</option>
                  </select>
                </div>
              </div>

              <div className="flex w-full items-center gap-3">
                <label htmlFor={pid('ai-audience')} className={MENU_FIELD_LABEL}>
                  Стиль общения
                </label>
                <div className="min-w-0 flex-1">
                  <select
                    id={pid('ai-audience')}
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
                    <option value="child">Ребёнок</option>
                    <option value="adult">Взрослый</option>
                  </select>
                </div>
              </div>

              {!isCommunication && (
                <div className="flex w-full items-center gap-3">
                  <span id={pid('ai-tense-label')} className={MENU_FIELD_LABEL}>
                    Время
                  </span>
                  <div className="min-w-0 flex-1">
                    <MultiSelectDropdown
                      ariaLabelledBy={pid('ai-tense-label')}
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
                      panelClassName={isChild ? 'max-h-[200px]' : 'max-h-[164px]'}
                    />
                  </div>
                </div>
              )}

              {settings.mode === 'translation' && (
                <div className="flex w-full items-center gap-3">
                  <label htmlFor={pid('ai-sentence-type')} className={MENU_FIELD_LABEL}>
                    Тип предложений
                  </label>
                  <div className="min-w-0 flex-1">
                    <select
                      id={pid('ai-sentence-type')}
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

              {settings.mode === 'translation' && (
                <div className="flex w-full items-center gap-3">
                  <label htmlFor={pid('ai-topic')} className={MENU_FIELD_LABEL}>
                    Тема
                  </label>
                  <div className="min-w-0 flex-1">
                    <select
                      id={pid('ai-topic')}
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

              <div className="flex w-full items-center gap-3">
                <label htmlFor={pid('ai-level')} className={MENU_FIELD_LABEL}>
                  Уровень
                </label>
                <div className="min-w-0 flex-1">
                  <select
                    id={pid('ai-level')}
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

              <div className="flex w-full items-center gap-3">
                <label htmlFor={pid('ai-provider')} className={MENU_FIELD_LABEL}>
                  ИИ
                </label>
                <div className="min-w-0 flex-1">
                  <select
                    id={pid('ai-provider')}
                    value={settings.provider}
                    onChange={(e) => update({ provider: e.target.value as Settings['provider'] })}
                    className={FIELD_SELECT}
                  >
                    <option value="openai">ChatGPT</option>
                    <option value="openrouter">Медленно (Free)</option>
                  </select>
                </div>
              </div>

              <div className="flex w-full items-center gap-3">
                <label htmlFor={pid('ai-voice')} className={MENU_FIELD_LABEL}>
                  Голос
                </label>
                <div className="min-w-0 flex-1">
                  <VoiceSelect
                    id={pid('ai-voice')}
                    value={settings.voiceId}
                    onChange={(voiceId) => update({ voiceId })}
                    preferredLangPrefixes={VOICE_DROPDOWN_LANG_PREFIXES}
                  />
                </div>
              </div>

              {onStartHomeChat && (
                <div className="pt-2">
                  <button type="button" onClick={onStartHomeChat} className={MENU_PRIMARY_CTA_CLASS}>
                    {settings.mode === 'dialogue'
                      ? 'Начать диалог'
                      : settings.mode === 'translation'
                        ? 'Начать тренировку перевода'
                        : 'Начать общение'}
                  </button>
                </div>
              )}
            </>
          )}

          {menuView === 'settings' && (
            <div className="flex w-full items-start gap-3">
              <span className={MENU_FIELD_LABEL}>Раздел</span>
              <p className="min-w-0 flex-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Выбор ИИ и голоса перенесён в «Чат с MyEng».
              </p>
            </div>
          )}

          {menuView === 'progress' && (
            <>
              {settings.mode === 'dialogue' ? (
                <>
                  <div className="flex w-full items-center gap-3">
                    <span
                      id={pid('progress-correct-label')}
                      className="shrink-0 whitespace-nowrap text-xs font-medium leading-snug text-[var(--text-muted)]"
                    >
                      Правильных ответов
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className={MENU_VALUE_BOX}
                        role="status"
                        aria-labelledby={pid('progress-correct-label')}
                      >
                        <span className="tabular-nums">{dialogueCorrectAnswers}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-3">
                    <span id={pid('progress-usage-label')} className={MENU_FIELD_LABEL}>
                      Запросов
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className={MENU_VALUE_BOX}
                        role="status"
                        aria-labelledby={pid('progress-usage-label')}
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
  )
}

function MenuNavRow({
  label,
  onClick,
  variant = 'default',
}: {
  label: string
  onClick: () => void
  variant?: 'default' | 'primary'
}) {
  if (variant === 'primary') {
    return (
      <button type="button" onClick={onClick} className={MENU_PRIMARY_CTA_CLASS}>
        {label}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-left text-sm font-medium text-[var(--text)] shadow-sm transition-colors hover:bg-[var(--border)]/35 touch-manipulation min-h-[40px]"
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

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
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
  /** Без отката ко всем голосам — иначе снова появляются ru и др. при пустом en. */
  const finalList = preferred

  const voicePrefixKey = preferredLangPrefixes.join('|')
  React.useEffect(() => {
    if (!mounted || !value || list.length === 0) return
    const allowed = list.filter((v) => preferredLangPrefixes.some((p) => v.lang.startsWith(p)))
    if (!allowed.some((v) => v.voiceURI === value)) onChange('')
  }, [mounted, value, list, voicePrefixKey, onChange, preferredLangPrefixes])

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
