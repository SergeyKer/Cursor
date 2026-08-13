'use client'

import React from 'react'
import VocabCardFooterButton from '@/components/vocabulary/VocabCardFooterButton'
import VocabWordCard from '@/components/vocabulary/VocabWordCard'
import { buildCustomWordPackTitle, parseCustomWordListText } from '@/lib/adaptiveRetention/customWordListParser'
import { createCustomWordPack, saveCustomWordPack } from '@/lib/adaptiveRetention/customWordPackStorage'
import {
  applyImportedStudyMarks,
  pairsForPack,
  resolveImportRows,
  toCustomWordItems,
  type ResolvedImportPair,
} from '@/lib/vocabulary/resolveImportRows'
import { VOCAB_INSET_EXPAND_BTN, VOCAB_INSET_LAUNCH_BTN } from '@/lib/vocabulary/cardStyles'
import { loadVocabularyProgress, saveVocabularyProgress } from '@/lib/vocabulary/storage'
import { vocabHubCopy } from '@/lib/uiCopy/vocabularyHub'
import type { Audience } from '@/lib/types'
import type { CustomWordPackSource } from '@/types/adaptiveRetention'
import type { NecessaryWord, VocabularyWordProgress } from '@/types/vocabulary'

type Props = {
  catalog: NecessaryWord[]
  audience?: Audience
  progressMap: Record<string, VocabularyWordProgress>
  onSaved: (packId: string) => void
}

const fileLabelClass = `${VOCAB_INSET_LAUNCH_BTN} cursor-pointer`

async function fillMissingTranslations(items: string[]): Promise<Array<{ en: string; ru: string }>> {
  if (items.length === 0) return []
  const response = await fetch('/api/vocab/fill-translations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  const data = (await response.json()) as { items?: Array<{ en?: string; ru?: string }>; userMessage?: string }
  if (!response.ok) throw new Error(data.userMessage || 'Не удалось подставить перевод.')
  return (data.items ?? []).flatMap((row) => {
    const en = row.en?.trim() ?? ''
    const ru = row.ru?.trim() ?? ''
    return en && ru ? [{ en, ru }] : []
  })
}

export default function VocabularyPackImportScreen({
  catalog,
  audience = 'adult',
  progressMap,
  onSaved,
}: Props) {
  const copy = vocabHubCopy(audience)
  const child = audience === 'child'
  const [title, setTitle] = React.useState('')
  const [text, setText] = React.useState('')
  const [pasteOpen, setPasteOpen] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [preview, setPreview] = React.useState<ResolvedImportPair[]>([])
  const [source, setSource] = React.useState<CustomWordPackSource>('paste')

  const ingestRows = React.useCallback(
    async (rows: Array<{ en?: string; ru?: string }>, nextSource: CustomWordPackSource) => {
      setSource(nextSource)
      let resolved = resolveImportRows({ rows, catalog, progressMap })
      if (resolved.needsTranslation.length > 0) {
        const filled = await fillMissingTranslations(resolved.needsTranslation)
        resolved = resolveImportRows({
          rows: [...rows, ...filled],
          catalog,
          progressMap,
        })
      }
      const packPairs = pairsForPack(resolved.ready)
      const mastered = resolved.ready.filter((row) => row.already === 'mastered').length
      const inFeed = resolved.ready.filter((row) => row.already === 'in_feed').length
      const already = copy.importAlreadyLine(mastered, inFeed)
      setPreview(packPairs)
      if (packPairs.length === 0 && resolved.ready.length === 0) {
        setMessage(copy.importNoPairs)
        return []
      }
      setMessage([copy.importFound(resolved.ready.length), already].filter(Boolean).join(' '))
      return packPairs
    },
    [catalog, copy, progressMap]
  )

  const persistPack = React.useCallback(
    (pairs: ResolvedImportPair[], nextSource: CustomWordPackSource) => {
      const items = toCustomWordItems(pairs)
      if (items.length === 0) {
        setMessage(copy.importNoPairs)
        return
      }
      const pack = createCustomWordPack({
        title: title.trim() || buildCustomWordPackTitle(nextSource),
        source: nextSource,
        items,
      })
      saveCustomWordPack(pack)
      const nextProgress = applyImportedStudyMarks(loadVocabularyProgress(), pairs, pack.id)
      saveVocabularyProgress(nextProgress)
      onSaved(pack.id)
    },
    [copy.importNoPairs, onSaved, title]
  )

  const handlePaste = async () => {
    setBusy(true)
    try {
      const parsed = parseCustomWordListText(text)
      const pairs = await ingestRows(
        parsed.rows.map((row) => ({ en: row.en, ru: row.ru })),
        'paste'
      )
      if (child && pairs.length > 0) persistPack(pairs, 'paste')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.importNoPairs)
    } finally {
      setBusy(false)
    }
  }

  const handleExcel = async (file: File) => {
    setBusy(true)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0] ?? '']
      const table = sheet ? XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false }) : []
      const raw = table.map((row) => row.join('\t')).join('\n')
      setText(raw)
      const parsed = parseCustomWordListText(raw)
      const pairs = await ingestRows(
        parsed.rows.map((row) => ({ en: row.en, ru: row.ru })),
        'excel'
      )
      if (child && pairs.length > 0) persistPack(pairs, 'excel')
    } catch {
      setMessage('Не удалось импортировать Excel.')
    } finally {
      setBusy(false)
    }
  }

  const handlePhoto = async (file: File) => {
    setBusy(true)
    try {
      const reader = new FileReader()
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('read'))
        reader.readAsDataURL(file)
      })
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl,
          audience,
          mode: 'vocabListPhoto',
        }),
      })
      const data = (await response.json()) as {
        vocabListPhoto?: { vocabulary?: Array<{ word?: string; translation?: string }> }
        userMessage?: string
      }
      if (!response.ok) {
        setMessage(data.userMessage || copy.importRetryPhoto)
        return
      }
      const vocab = data.vocabListPhoto?.vocabulary ?? []
      const rows = vocab.map((row) => ({ en: row.word ?? '', ru: row.translation ?? '' }))
      const pairs = await ingestRows(rows, 'photo')
      if (child && pairs.length > 0) persistPack(pairs, 'photo')
    } catch {
      setMessage(copy.importRetryPhoto)
    } finally {
      setBusy(false)
    }
  }

  const resetFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.currentTarget.value = ''
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[17px] font-semibold text-[var(--text)]">{copy.importTitle}</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название (необязательно)"
        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[14px]"
      />
      <label className={fileLabelClass}>
        {copy.importPhoto}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            resetFile(e)
            if (file) void handlePhoto(file)
          }}
        />
      </label>
      <label className={fileLabelClass}>
        {copy.importGallery}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            resetFile(e)
            if (file) void handlePhoto(file)
          }}
        />
      </label>
      <label className={`${VOCAB_INSET_EXPAND_BTN} cursor-pointer`}>
        {copy.importExcel}
        <input
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            resetFile(e)
            if (file) void handleExcel(file)
          }}
        />
      </label>
      <button type="button" className={`${VOCAB_INSET_EXPAND_BTN} w-full`} onClick={() => setPasteOpen((open) => !open)}>
        {copy.importPaste}
      </button>
      {pasteOpen ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={copy.importPastePlaceholder}
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[14px]"
          />
          <VocabCardFooterButton variant="expand" label={copy.importParse} onClick={() => void handlePaste()} roundBottom={false} />
        </>
      ) : null}
      {message ? <p className="text-[13px] text-[var(--text-muted)]">{message}</p> : null}
      {busy ? <p className="text-[13px]">Готовим…</p> : null}
      {!child && preview.length > 0 ? (
        <div className="space-y-2">
          {preview.map((row) => (
            <VocabWordCard
              key={`${row.wordId}-${row.en}`}
              word={{
                id: row.wordId,
                en: row.en,
                ru: row.ru,
                transcription: '',
                source: 'preview',
                tags: [],
                status: 'active',
                primaryWorld: 'core',
                primaryLevel: 'a2',
                primaryVocabularyTopic: 'core',
              }}
            />
          ))}
          <VocabCardFooterButton
            variant="expand"
            label={copy.studyList}
            onClick={() => persistPack(preview, source)}
            roundBottom={false}
          />
        </div>
      ) : null}
    </div>
  )
}
