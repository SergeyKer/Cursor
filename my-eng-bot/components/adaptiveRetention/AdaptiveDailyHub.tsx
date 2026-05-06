'use client'

import React from 'react'
import { buildCustomWordPackTitle, parseCustomWordListText } from '@/lib/adaptiveRetention/customWordListParser'
import { createCustomWordPack, saveCustomWordPack } from '@/lib/adaptiveRetention/customWordPackStorage'
import { recordAdaptiveEvent } from '@/lib/adaptiveRetention/events'
import { buildLearnerSnapshot } from '@/lib/adaptiveRetention/learnerSnapshot'
import { buildDailyPlan } from '@/lib/adaptiveRetention/nextBestAction'
import { TOPIC_GOAL_PACKS } from '@/lib/adaptiveRetention/topicGoalPacks'
import type { Settings } from '@/lib/types'
import type { AdaptiveFooterView, CustomWordPack, NextBestAction, TopicGoalPack } from '@/types/adaptiveRetention'

type AdaptiveDailyHubProps = {
  settings: Settings
  onFooterViewChange?: (view: AdaptiveFooterView | null) => void
  onOpenVocabularyWorlds: () => void
  onOpenPracticeTopic: (topic: string) => void
  onStartChat: () => void
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'))
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
      } else {
        reject(new Error('Не удалось прочитать файл как таблицу.'))
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

function actionMeta(action: NextBestAction): { label: string; helper: string } {
  if (action.kind === 'return_flow') return { label: 'Мягкий вход', helper: 'без давления после паузы' }
  if (action.kind === 'srs_review') return { label: 'Повторение', helper: 'слова уже ждут' }
  if (action.kind === 'custom_pack') return { label: 'Свой список', helper: 'домашка или личная цель' }
  if (action.kind === 'weak_spot') return { label: 'Слабое место', helper: 'закрываем ошибки' }
  if (action.kind === 'topic_pack') return { label: 'Цель', helper: 'жизненная ситуация' }
  return { label: 'Свободно', helper: 'можно выбрать вручную' }
}

export default function AdaptiveDailyHub({
  settings,
  onFooterViewChange,
  onOpenVocabularyWorlds,
  onOpenPracticeTopic,
  onStartChat,
}: AdaptiveDailyHubProps) {
  const [nonce, setNonce] = React.useState(0)
  const [customText, setCustomText] = React.useState('')
  const [importTitle, setImportTitle] = React.useState('')
  const [importMessage, setImportMessage] = React.useState<string | null>(null)
  const [importBusy, setImportBusy] = React.useState(false)
  const [latestPack, setLatestPack] = React.useState<CustomWordPack | null>(null)

  const snapshot = React.useMemo(() => {
    // Rebuild after imports save new local progress data.
    void nonce
    return buildLearnerSnapshot(settings)
  }, [settings, nonce])
  const plan = React.useMemo(() => buildDailyPlan(snapshot), [snapshot])

  React.useEffect(() => {
    onFooterViewChange?.(plan.footer)
    recordAdaptiveEvent({
      eventName: 'daily_hub_opened',
      occurredAt: Date.now(),
      source: 'dailyHub',
      audience: snapshot.segment,
      level: settings.level,
      actionId: plan.primaryAction.id,
      result: 'shown',
    })
    return () => onFooterViewChange?.(null)
  }, [onFooterViewChange, plan.footer, plan.primaryAction.id, settings.level, snapshot.segment])

  const runAction = React.useCallback(
    (action: NextBestAction) => {
      const target = action.target
      recordAdaptiveEvent({
        eventName: 'next_action_clicked',
        occurredAt: Date.now(),
        source: 'dailyHub',
        audience: snapshot.segment,
        level: settings.level,
        actionId: action.id,
        result: 'clicked',
      })
      if (target.kind === 'chat') {
        onStartChat()
        return
      }
      if (target.kind === 'practice') {
        onOpenPracticeTopic(target.customTopic ?? action.title)
        return
      }
      if (target.kind === 'topic_pack') {
        const pack = TOPIC_GOAL_PACKS.find((item) => item.id === target.packId)
        onOpenPracticeTopic(pack?.title ?? action.title)
        return
      }
      if (target.kind === 'custom_pack') {
        onOpenPracticeTopic(action.title)
        return
      }
      onOpenVocabularyWorlds()
    },
    [onOpenPracticeTopic, onOpenVocabularyWorlds, onStartChat, settings.level, snapshot.segment]
  )

  const startTopicPack = React.useCallback(
    (pack: TopicGoalPack) => {
      recordAdaptiveEvent({
        eventName: 'topic_pack_selected',
        occurredAt: Date.now(),
        source: 'dailyHub',
        audience: snapshot.segment,
        level: settings.level,
        goalPackId: pack.id,
        result: 'clicked',
      })
      onOpenPracticeTopic(pack.title)
    },
    [onOpenPracticeTopic, settings.level, snapshot.segment]
  )

  const saveParsedCustomPack = React.useCallback(
    (text: string, source: 'paste' | 'excel' | 'word' = 'paste') => {
      const parsed = parseCustomWordListText(text)
      if (parsed.validItems.length === 0) {
        setImportMessage('Не нашёл готовых пар слово-перевод. Проверьте формат и попробуйте ещё раз.')
        return
      }
      const title = importTitle.trim() || buildCustomWordPackTitle(source)
      const pack = createCustomWordPack({ title, source, items: parsed.validItems })
      saveCustomWordPack(pack)
      setLatestPack(pack)
      setImportMessage(
        `Сохранено: ${parsed.validItems.length} слов. Дубли: ${parsed.duplicateCount}. Строк с ошибками: ${parsed.errorCount}.`
      )
      setCustomText('')
      setImportTitle('')
      setNonce((value) => value + 1)
      recordAdaptiveEvent({
        eventName: 'custom_word_pack_import_completed',
        occurredAt: Date.now(),
        source: 'customPack',
        audience: snapshot.segment,
        level: settings.level,
        actionId: pack.id,
        result: 'completed',
        metadata: {
          words: parsed.validItems.length,
          duplicates: parsed.duplicateCount,
          errors: parsed.errorCount,
          source,
        },
      })
    },
    [importTitle, settings.level, snapshot.segment]
  )

  const handleExcelFile = React.useCallback(
    async (file: File) => {
      setImportBusy(true)
      setImportMessage(null)
      recordAdaptiveEvent({
        eventName: 'custom_word_pack_import_started',
        occurredAt: Date.now(),
        source: 'customPack',
        audience: snapshot.segment,
        level: settings.level,
        result: 'started',
        metadata: { fileName: file.name, source: 'excel' },
      })
      try {
        const XLSX = await import('xlsx')
        const buffer = await readFileAsArrayBuffer(file)
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : null
        if (!sheet) throw new Error('В файле нет листов.')
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false })
        const text = rows.map((row) => row.join('\t')).join('\n')
        saveParsedCustomPack(text, 'excel')
      } catch (error) {
        setImportMessage(error instanceof Error ? error.message : 'Не удалось импортировать Excel.')
      } finally {
        setImportBusy(false)
      }
    },
    [saveParsedCustomPack, settings.level, snapshot.segment]
  )

  const primaryMeta = actionMeta(plan.primaryAction)

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className="chat-shell-x flex min-h-0 flex-1 flex-col py-2 sm:py-3">
        <div className="mx-auto flex min-h-0 w-full max-w-[29rem] flex-1 flex-col gap-3 overflow-y-auto pb-3">
          <section className="rounded-[1.25rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-4 py-4 shadow-sm">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Мой путь сегодня</p>
            <h1 className="mt-1 text-[22px] font-bold text-[var(--text)]">{plan.greeting}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-muted)]">
              Один главный шаг, короткая практика и понятное продолжение после блока.
            </p>
          </section>

          <section className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-emerald-700">{primaryMeta.label}</p>
                <h2 className="mt-1 text-[19px] font-bold text-emerald-950">{plan.primaryAction.title}</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-emerald-900">{plan.primaryAction.description}</p>
                <p className="mt-2 text-[12px] font-medium text-emerald-700">{plan.primaryAction.reason}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                {primaryMeta.helper}
              </span>
            </div>
            <button
              type="button"
              onClick={() => runAction(plan.primaryAction)}
              className="btn-3d-menu mt-4 w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-base font-semibold text-emerald-800"
            >
              {plan.primaryAction.primaryCta}
            </button>
          </section>

          {plan.secondaryActions.length > 0 && (
            <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {plan.secondaryActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => runAction(action)}
                  className="btn-3d-menu rounded-[1rem] border border-[var(--border)] bg-white/75 px-3 py-3 text-left shadow-sm"
                >
                  <p className="text-[14px] font-semibold text-[var(--text)]">{action.title}</p>
                  <p className="mt-1 text-[12px] leading-snug text-[var(--text-muted)]">{action.description}</p>
                </button>
              ))}
            </section>
          )}

          <section className="rounded-[1.25rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[15px] font-semibold text-[var(--text)]">Выбрать жизненную цель</p>
                <p className="mt-1 text-[12px] text-[var(--text-muted)]">Еда, аэропорт, отель, работа и другие короткие наборы.</p>
              </div>
              <button
                type="button"
                onClick={onOpenVocabularyWorlds}
                className="btn-3d-menu rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[12px] font-semibold text-[var(--text)]"
              >
                Все миры
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {TOPIC_GOAL_PACKS.slice(0, 4).map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => startTopicPack(pack)}
                  className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-white/75 px-3 py-3 text-left"
                >
                  <p className="text-[14px] font-semibold text-[var(--text)]">{pack.title}</p>
                  <p className="mt-1 text-[12px] leading-snug text-[var(--text-muted)]">{pack.goal}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[1.25rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-4 py-4 shadow-sm">
            <p className="text-[15px] font-semibold text-[var(--text)]">Свой список слов</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">
              Вставьте домашнее задание или загрузите Excel. Word пока можно вставить текстом.
            </p>
            <input
              value={importTitle}
              onChange={(event) => setImportTitle(event.target.value)}
              placeholder="Название: Unit 5, Airport words..."
              className="mt-3 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[14px] text-[var(--text)] outline-none"
            />
            <textarea
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder="apple - яблоко&#10;ticket | билет&#10;gate, выход на посадку"
              className="mt-2 min-h-24 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[14px] text-[var(--text)] outline-none"
            />
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={!customText.trim() || importBusy}
                onClick={() => saveParsedCustomPack(customText, 'paste')}
                className="btn-3d-menu rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Сохранить список
              </button>
              <label className="btn-3d-menu cursor-pointer rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-center text-sm font-semibold text-[var(--text)]">
                Excel файл
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleExcelFile(file)
                    event.currentTarget.value = ''
                  }}
                />
              </label>
            </div>
            {importMessage && (
              <p className="mt-3 rounded-lg border border-[var(--border)] bg-white/75 px-3 py-2 text-[12px] leading-relaxed text-[var(--text)]">
                {importMessage}
              </p>
            )}
            {latestPack && (
              <button
                type="button"
                onClick={() => onOpenPracticeTopic(latestPack.title)}
                className="btn-3d-menu mt-2 w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
              >
                Учить: {latestPack.title}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
