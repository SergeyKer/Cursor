'use client'

import React from 'react'
import { manropeHome } from '@/lib/manropeHome'
import { TOPICS, LEVELS, TENSES, SENTENCE_TYPES, CHILD_TENSES } from '@/lib/constants'
import type { Settings, UsageInfo, AppMode, AiProvider, TenseId, SentenceType, TopicId, LevelId } from '@/lib/types'

const CHILD_TENSE_SET = new Set(CHILD_TENSES)

export type MenuView = 'root' | 'lessons' | 'aiChat' | 'settings' | 'progress' | 'profile'

/** Экраны внутри «Чат с MyEng» (drill-down). */
type AiChatPanel =
  | 'summary'
  | 'mode'
  | 'audience'
  | 'tense'
  | 'sentenceType'
  | 'topic'
  | 'level'
  | 'provider'
  | 'voice'

const AI_CHAT_PANEL_TITLE: Record<AiChatPanel, string> = {
  summary: 'Чат с MyEng',
  mode: 'Режим',
  audience: 'Стиль общения',
  tense: 'Время',
  sentenceType: 'Тип предложений',
  topic: 'Тема',
  level: 'Уровень',
  provider: 'ИИ',
  voice: 'Голос',
}

const MODE_OPTIONS: { id: AppMode; label: string }[] = [
  { id: 'communication', label: 'Общение' },
  { id: 'dialogue', label: 'Диалог' },
  { id: 'translation', label: 'Тренировка перевода' },
]

const AUDIENCE_OPTIONS: { id: Settings['audience']; label: string }[] = [
  { id: 'child', label: 'Ребёнок' },
  { id: 'adult', label: 'Взрослый' },
]

const PROVIDER_OPTIONS: { id: AiProvider; label: string }[] = [
  { id: 'openai', label: 'ChatGPT' },
  { id: 'openrouter', label: 'Медленно (Free)' },
]

const MENU_GROUP_CLASS =
  'overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_1px_4px_rgba(0,0,0,0.07)]'

/** Вертикальный воздух вокруг карточек списков. */
const MENU_GROUP_OUTER = 'py-1'

export const FIELD_SELECT =
  'w-full min-w-0 rounded border border-[var(--border)] bg-[var(--bg-card)] pl-2 py-1 min-h-[40px] text-[13px] leading-normal text-[var(--text)] touch-manipulation select-chevron'

const MENU_VALUE_BOX =
  'w-full min-w-0 rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1 min-h-[40px] text-[15px] leading-normal text-[var(--text)] flex items-center justify-end'

export const MENU_FIELD_LABEL =
  'shrink-0 w-[6.3rem] text-[13px] font-medium leading-normal text-[var(--text-muted)] break-words'

/** Градиентная CTA: «Начать общение» и пункты главной «Чат / Уроки». */
const MENU_PRIMARY_CTA_CLASS =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent-hover)] px-4 py-2.5 text-[15px] font-semibold leading-normal text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-105 active:brightness-95 touch-manipulation min-h-[44px]'

const MENU_CHOICE_TEXT_CLASS =
  "text-[15px] font-normal [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,'Noto_Sans',Arial,sans-serif]"

const VOICE_DROPDOWN_LANG_PREFIXES: string[] = ['en']

export interface MenuSectionPanelsProps {
  menuView: MenuView
  onMenuViewChange: (v: MenuView) => void
  settings: Settings
  onSettingsChange: (s: Settings) => void
  usage: UsageInfo
  dialogueCorrectAnswers: number
  idPrefix?: string
  className?: string
  homeLayout?: boolean
  onStartHomeChat?: () => void
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

  const [aiChatPanel, setAiChatPanel] = React.useState<AiChatPanel>('summary')

  React.useEffect(() => {
    if (menuView !== 'aiChat') setAiChatPanel('summary')
  }, [menuView])

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

  const modeLabel = MODE_OPTIONS.find((m) => m.id === settings.mode)?.label ?? settings.mode
  const audienceLabel = AUDIENCE_OPTIONS.find((a) => a.id === settings.audience)?.label ?? settings.audience
  const levelLabel = levelOptions.find((l) => l.id === settings.level)?.label ?? settings.level
  const providerLabel = PROVIDER_OPTIONS.find((p) => p.id === settings.provider)?.label ?? settings.provider
  const tenseLabel =
    tenseOptions.find((t) => t.id === (settings.tenses[0] ?? 'present_simple'))?.label ?? settings.tenses[0]
  const sentenceTypeLabel =
    SENTENCE_TYPES.find((t) => t.id === settings.sentenceType)?.label ?? settings.sentenceType
  const topicLabel = topicOptions.find((t) => t.id === settings.topic)?.label ?? settings.topic

  const handleMenuBack = () => {
    if (menuView === 'aiChat' && aiChatPanel !== 'summary') {
      setAiChatPanel('summary')
      return
    }
    onMenuViewChange('root')
  }

  const rootClass =
    className ??
    (homeLayout ? 'flex min-h-0 flex-col' : 'flex min-h-0 flex-1 flex-col')

  const headerTitle =
    menuView === 'lessons'
      ? 'Уроки'
      : menuView === 'aiChat'
        ? AI_CHAT_PANEL_TITLE[aiChatPanel]
        : menuView === 'settings'
          ? 'Настройки'
          : menuView === 'progress'
            ? 'Прогресс'
            : menuView === 'profile'
              ? 'Профиль'
              : !homeLayout
                ? 'Главная'
                : ''

  const handleGoHome = () => {
    if (onGoHome) onGoHome()
    else onMenuViewChange('root')
  }

  return (
    <div className={`${rootClass} ${manropeHome.className}`.trim()}>
      {(menuView !== 'root' || !homeLayout) && (
        <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)]/70 pb-1.5">
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={menuView === 'root' ? handleGoHome : handleMenuBack}
              className="btn-3d-menu grid min-h-[44px] min-w-[6rem] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-0 rounded-lg border border-[var(--text)]/[0.18] bg-[var(--bg-card)] px-2 py-1.5 text-[13px] font-medium leading-normal text-[var(--text)] touch-manipulation focus-visible:outline-none"
              aria-label={
                menuView === 'root'
                  ? 'На стартовый экран'
                  : menuView === 'aiChat' && aiChatPanel !== 'summary'
                    ? 'Назад к настройкам чата'
                    : 'Назад к разделам'
              }
            >
              <span className="flex justify-end pr-0.5" aria-hidden>
                <ChevronLeftIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              </span>
              <span className="text-center">Назад</span>
              <span className="min-w-0" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleGoHome}
              className="btn-3d-menu flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-[var(--text)]/[0.18] bg-[var(--bg-card)] text-[var(--text)] touch-manipulation focus-visible:outline-none"
              aria-label="На стартовый экран"
              title="Стартовая страница"
            >
              <HomeIcon className="h-5 w-5 text-[var(--text-muted)]" />
            </button>
          </div>
          <h2 className="min-w-0 flex-1 pr-2 text-right [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,'Noto_Sans',Arial,sans-serif] text-[18px] font-semibold tracking-normal leading-[1.25] text-[var(--text)] sm:pr-3">
            {headerTitle}
          </h2>
        </div>
      )}

      <div
        key={menuView === 'aiChat' ? `aiChat-${aiChatPanel}` : menuView}
        className={
          homeLayout
            ? 'menu-panel-view-enter max-h-[calc(100dvh-12rem)] space-y-2.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-0.5'
            : 'menu-panel-view-enter min-h-0 flex-1 space-y-2.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1'
        }
      >
        {menuView === 'root' && !homeLayout && (
          <div className={MENU_GROUP_OUTER}>
            <div className={MENU_GROUP_CLASS}>
              <MenuNavRow label="Чат с MyEng" onClick={() => onMenuViewChange('aiChat')} />
              <MenuNavRow label="Уроки" onClick={() => onMenuViewChange('lessons')} />
              <MenuNavRow label="Прогресс" onClick={() => onMenuViewChange('progress')} />
              <MenuNavRow label="Настройки" onClick={() => onMenuViewChange('settings')} />
              <MenuNavRow label="Профиль" onClick={() => onMenuViewChange('profile')} />
            </div>
          </div>
        )}

        {menuView === 'lessons' && (
          <div className="flex w-full items-start gap-3">
            <span className={MENU_FIELD_LABEL}>Раздел</span>
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
              Скоро здесь будут уроки. Раздел в разработке.
            </p>
          </div>
        )}

        {menuView === 'profile' && (
          <div className="flex w-full items-start gap-3">
            <span className={MENU_FIELD_LABEL}>Раздел</span>
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
              Профиль появится позже.
            </p>
          </div>
        )}

        {menuView === 'aiChat' && aiChatPanel === 'summary' && (
          <>
            <div className={MENU_GROUP_OUTER}>
              <div className={MENU_GROUP_CLASS}>
              <MenuSettingRow label="Режим" value={modeLabel} onClick={() => setAiChatPanel('mode')} />
              <MenuSettingRow label="Стиль общения" value={audienceLabel} onClick={() => setAiChatPanel('audience')} />
              {!isCommunication && (
                <MenuSettingRow label="Время" value={tenseLabel} onClick={() => setAiChatPanel('tense')} />
              )}
              {settings.mode === 'translation' && (
                <>
                  <MenuSettingRow
                    label="Тип предложений"
                    value={sentenceTypeLabel}
                    onClick={() => setAiChatPanel('sentenceType')}
                  />
                  <MenuSettingRow label="Тема" value={topicLabel} onClick={() => setAiChatPanel('topic')} />
                </>
              )}
              <MenuSettingRow label="Уровень" value={levelLabel} onClick={() => setAiChatPanel('level')} />
              <MenuSettingRow label="ИИ" value={providerLabel} onClick={() => setAiChatPanel('provider')} />
              <VoiceSummaryRow
                label="Голос"
                voiceId={settings.voiceId}
                preferredLangPrefixes={VOICE_DROPDOWN_LANG_PREFIXES}
                onOpen={() => setAiChatPanel('voice')}
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

        {menuView === 'aiChat' && aiChatPanel === 'mode' && (
          <PickerList
            options={MODE_OPTIONS}
            value={settings.mode}
            onSelect={(id) => {
              update({ mode: id })
              setAiChatPanel('summary')
            }}
          />
        )}

        {menuView === 'aiChat' && aiChatPanel === 'audience' && (
          <PickerList
            options={AUDIENCE_OPTIONS}
            value={settings.audience}
            onSelect={(id) => {
              if (id === 'child') {
                update({ audience: id, level: 'all', tenses: ['present_simple'] })
              } else {
                update({ audience: id })
              }
              setAiChatPanel('summary')
            }}
          />
        )}

        {menuView === 'aiChat' && aiChatPanel === 'tense' && (
          <PickerList
            options={tenseOptions.map((t) => ({ id: t.id as TenseId, label: t.label }))}
            value={settings.tenses[0] ?? 'present_simple'}
            onSelect={(id) => {
              update({ tenses: [id] })
              setAiChatPanel('summary')
            }}
          />
        )}

        {menuView === 'aiChat' && aiChatPanel === 'sentenceType' && (
          <PickerList
            options={SENTENCE_TYPES.map((t) => ({ id: t.id, label: t.label }))}
            value={settings.sentenceType}
            onSelect={(id) => {
              update({ sentenceType: id as SentenceType })
              setAiChatPanel('summary')
            }}
          />
        )}

        {menuView === 'aiChat' && aiChatPanel === 'topic' && (
          <PickerList
            options={topicOptions.map((t) => ({ id: t.id, label: t.label }))}
            value={settings.topic}
            onSelect={(id) => {
              update({ topic: id as TopicId })
              setAiChatPanel('summary')
            }}
          />
        )}

        {menuView === 'aiChat' && aiChatPanel === 'level' && (
          <PickerList
            options={levelOptions.map((l) => ({ id: l.id, label: l.label }))}
            value={settings.level}
            onSelect={(id) => {
              update({ level: id as LevelId })
              setAiChatPanel('summary')
            }}
          />
        )}

        {menuView === 'aiChat' && aiChatPanel === 'provider' && (
          <PickerList
            options={PROVIDER_OPTIONS}
            value={settings.provider}
            onSelect={(id) => {
              update({ provider: id })
              setAiChatPanel('summary')
            }}
          />
        )}

        {menuView === 'aiChat' && aiChatPanel === 'voice' && (
          <VoicePickerPanel
            value={settings.voiceId}
            onChange={(voiceId) => update({ voiceId })}
            preferredLangPrefixes={VOICE_DROPDOWN_LANG_PREFIXES}
          />
        )}

        {menuView === 'settings' && (
          <div className="flex w-full items-start gap-3">
            <span className={MENU_FIELD_LABEL}>Раздел</span>
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
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
                    className="shrink-0 whitespace-nowrap text-[13px] font-medium leading-normal text-[var(--text-muted)]"
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
                <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
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

function MenuSettingRow({
  label,
  value,
  onClick,
}: {
  label: string
  value: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
    >
      <span className="shrink-0 text-sm font-medium leading-normal text-[var(--text-muted)]">{label}</span>
      <span className={`min-w-0 flex-1 truncate text-right leading-normal text-[var(--text)] ${MENU_CHOICE_TEXT_CLASS}`}>
        {value}
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
    </button>
  )
}

function VoiceSummaryRow({
  label,
  voiceId,
  preferredLangPrefixes,
  onOpen,
}: {
  label: string
  voiceId: string
  preferredLangPrefixes: string[]
  onOpen: () => void
}) {
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([])
  React.useEffect(() => {
    const list = () => setVoices(window.speechSynthesis.getVoices())
    window.speechSynthesis.onvoiceschanged = list
    list()
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])
  const display =
    !voiceId
      ? 'По умолчанию'
      : (() => {
          const allowed = voices.filter((v) => preferredLangPrefixes.some((p) => v.lang.startsWith(p)))
          const v = allowed.find((x) => x.voiceURI === voiceId)
          return v ? `${v.name} (${v.lang})` : 'По умолчанию'
        })()

  return <MenuSettingRow label={label} value={display} onClick={onOpen} />
}

function PickerList<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { id: T; label: string }[]
  value: T
  onSelect: (id: T) => void
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
            <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
          ) : (
            <span className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </button>
      ))}
      </div>
    </div>
  )
}

function VoicePickerPanel({
  value,
  onChange,
  preferredLangPrefixes,
}: {
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
  const finalList = list.filter((v) => preferredLangPrefixes.some((p) => v.lang.startsWith(p)))

  const voicePrefixKey = preferredLangPrefixes.join('|')
  React.useEffect(() => {
    if (!mounted || !value || list.length === 0) return
    const allowed = list.filter((v) => preferredLangPrefixes.some((p) => v.lang.startsWith(p)))
    if (!allowed.some((v) => v.voiceURI === value)) onChange('')
  }, [mounted, value, list, voicePrefixKey, onChange, preferredLangPrefixes])

  if (!mounted && list.length === 0) {
    return <div className="px-3 py-2 text-[13px] leading-normal text-[var(--text-muted)]">Загрузка голосов…</div>
  }

  return (
    <div className={MENU_GROUP_OUTER}>
      <div className={MENU_GROUP_CLASS}>
      <button
        type="button"
        onClick={() => onChange('')}
        className="flex w-full min-h-[44px] items-center justify-end gap-1 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
      >
        <span className={`min-w-0 flex-1 text-right leading-normal text-[var(--text)] pr-1 ${MENU_CHOICE_TEXT_CLASS}`}>
          По умолчанию
        </span>
        {!value ? (
          <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
        ) : (
          <span className="h-4 w-4 shrink-0" aria-hidden />
        )}
      </button>
      {finalList.map((v) => (
        <button
          key={v.voiceURI}
          type="button"
          onClick={() => onChange(v.voiceURI)}
          className="flex w-full min-h-[44px] items-center justify-end gap-1 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
        >
          <span className={`min-w-0 flex-1 text-right leading-normal text-[var(--text)] pr-1 ${MENU_CHOICE_TEXT_CLASS}`}>
            {v.name} ({v.lang})
          </span>
          {value === v.voiceURI ? (
            <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
          ) : (
            <span className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </button>
      ))}
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
      className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 text-left text-[15px] font-normal leading-normal text-[var(--text)] transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,'Noto_Sans',Arial,sans-serif]"
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
