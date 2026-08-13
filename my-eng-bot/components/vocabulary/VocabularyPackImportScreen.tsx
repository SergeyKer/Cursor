'use client'

import React from 'react'
import ProgressCtaButton from '@/components/ProgressCtaButton'
import VocabularySpaceScroll from '@/components/vocabulary/VocabularySpaceScroll'
import VocabularyWordRow from '@/components/vocabulary/VocabularyWordRow'
import { buildCustomWordPackTitle, parseCustomWordListText } from '@/lib/adaptiveRetention/customWordListParser'
import { createCustomWordPack, saveCustomWordPack } from '@/lib/adaptiveRetention/customWordPackStorage'
import { lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'
import type { NecessaryWord } from '@/types/vocabulary'

type Props = {
  catalog: NecessaryWord[]
  onBack: () => void
  onSaved: () => void
}

function fillFromCatalog(en: string, ru: string, catalog: NecessaryWord[]): { en: string; ru: string } | null {
  const hasEn = /[A-Za-z]/.test(en)
  const hasRu = /[А-Яа-яЁё]/.test(ru) || /[А-Яа-яЁё]/.test(en)
  if (hasEn && ru.trim()) return { en: en.trim(), ru: ru.trim() }
  if (hasEn && !ru.trim()) {
    const key = lemmaKeyFromEn(en)
    const hits = catalog.filter((word) => lemmaKeyFromEn(word.en) === key)
    if (hits.length === 1) return { en: hits[0].en, ru: hits[0].ru }
    return null
  }
  if (!hasEn && hasRu) {
    const needle = (ru || en).trim().toLowerCase()
    const hits = catalog.filter((word) => word.ru.trim().toLowerCase() === needle)
    if (hits.length === 1) return { en: hits[0].en, ru: hits[0].ru }
    return null
  }
  return en.trim() && ru.trim() ? { en: en.trim(), ru: ru.trim() } : null
}

export default function VocabularyPackImportScreen({ catalog, onBack, onSaved }: Props) {
  const [title, setTitle] = React.useState('')
  const [text, setText] = React.useState('')
  const [message, setMessage] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [preview, setPreview] = React.useState<{ en: string; ru: string }[]>([])

  const parseText = (raw: string) => {
    const parsed = parseCustomWordListText(raw)
    const items: { en: string; ru: string }[] = []
    let incomplete = 0
    for (const row of parsed.rows) {
      if (row.error && !row.en) {
        incomplete += 1
        continue
      }
      const filled = fillFromCatalog(row.en ?? '', row.ru ?? '', catalog)
      if (!filled) {
        incomplete += 1
        continue
      }
      items.push(filled)
    }
    for (const item of parsed.validItems) {
      if (!items.some((row) => lemmaKeyFromEn(row.en) === lemmaKeyFromEn(item.en))) {
        items.push({ en: item.en, ru: item.ru })
      }
    }
    setPreview(items)
    setMessage(`Сохранено в превью: ${items.length}. Неполных: ${incomplete}. Дубли: ${parsed.duplicateCount}.`)
  }

  const save = () => {
    if (preview.length === 0) {
      setMessage('Нет пар для сохранения.')
      return
    }
    const pack = createCustomWordPack({
      title: title.trim() || buildCustomWordPackTitle('paste'),
      source: 'paste',
      items: preview.map((row, index) => ({
        id: `imp-${index}-${row.en}`,
        en: row.en,
        ru: row.ru,
      })),
    })
    saveCustomWordPack(pack)
    onSaved()
  }

  return (
    <VocabularySpaceScroll>
        <div className="flex items-center justify-between">
          <p className="text-[17px] font-semibold text-[var(--text)]">Залить список</p>
          <button type="button" onClick={onBack} className="text-[14px] font-semibold">
            ← Назад
          </button>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название (необязательно)"
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[14px]"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="apple - яблоко"
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[14px]"
        />
        <div className="flex flex-col gap-2">
          <ProgressCtaButton onClick={() => parseText(text)}>Разобрать текст</ProgressCtaButton>
          <label className="text-center text-[13px] text-[var(--text-muted)]">
            Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setBusy(true)
                try {
                  const XLSX = await import('xlsx')
                  const buffer = await file.arrayBuffer()
                  const workbook = XLSX.read(buffer, { type: 'array' })
                  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? '']
                  const rows = sheet ? XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false }) : []
                  const next = rows.map((row) => row.join('\t')).join('\n')
                  setText(next)
                  parseText(next)
                } finally {
                  setBusy(false)
                }
              }}
            />
          </label>
          <label className="text-center text-[13px] text-[var(--text-muted)]">
            Фото
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
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
                      customFocus:
                        'Extract bilingual vocabulary list. Prefer English word + Russian translation pairs.',
                    }),
                  })
                  const data = (await response.json()) as {
                    analysis?: { whatToLearn?: { vocabulary?: Array<{ word?: string; translation?: string }> } }
                  }
                  const vocab = data.analysis?.whatToLearn?.vocabulary ?? []
                  const next = vocab
                    .map((row) => `${row.word ?? ''} - ${row.translation ?? ''}`.trim())
                    .filter((line) => line !== '-')
                    .join('\n')
                  if (!next) {
                    setMessage('не нашёл пары')
                    return
                  }
                  setText(next)
                  parseText(next)
                } finally {
                  setBusy(false)
                }
              }}
            />
          </label>
        </div>
        {message ? <p className="text-[13px] text-[var(--text-muted)]">{message}</p> : null}
        {busy ? <p className="text-[13px]">Готовим…</p> : null}
        <div className="space-y-2">
          {preview.map((row) => (
            <VocabularyWordRow key={`${row.en}-${row.ru}`} word={{
              id: Math.abs(row.en.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)) || 1,
              en: row.en,
              ru: row.ru,
              transcription: '',
              source: 'preview',
              tags: [],
              status: 'active',
              primaryWorld: 'core',
              primaryLevel: 'a2',
              primaryVocabularyTopic: 'core',
            }} />
          ))}
        </div>
        {preview.length > 0 ? <ProgressCtaButton onClick={save}>Учить этот список</ProgressCtaButton> : null}
    </VocabularySpaceScroll>
  )
}
