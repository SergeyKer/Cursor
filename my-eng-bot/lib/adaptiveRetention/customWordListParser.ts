import type { CustomWordItem, CustomWordPackSource } from '@/types/adaptiveRetention'

export interface ParsedCustomWordRow extends Partial<CustomWordItem> {
  raw: string
  rowNumber: number
  error?: string
}

export interface CustomWordListParseResult {
  rows: ParsedCustomWordRow[]
  validItems: CustomWordItem[]
  duplicateCount: number
  errorCount: number
}

const HEADER_ALIASES = new Map([
  ['word', 'en'],
  ['english', 'en'],
  ['en', 'en'],
  ['слово', 'en'],
  ['translation', 'ru'],
  ['translate', 'ru'],
  ['russian', 'ru'],
  ['ru', 'ru'],
  ['перевод', 'ru'],
  ['example', 'example'],
  ['пример', 'example'],
  ['topic', 'topic'],
  ['тема', 'topic'],
])

function normalizeCell(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeKey(value: string): string {
  return normalizeCell(value).toLowerCase()
}

function looksLikeHeader(cells: string[]): boolean {
  const mapped = cells.map((cell) => HEADER_ALIASES.get(normalizeKey(cell))).filter(Boolean)
  return mapped.includes('en') && (mapped.includes('ru') || mapped.includes('example') || mapped.includes('topic'))
}

function splitDelimitedLine(line: string): string[] {
  const delimiters = ['\t', '|', ';', ',', ' - ', ' – ', ' - ']
  for (const delimiter of delimiters) {
    if (line.includes(delimiter)) {
      return line.split(delimiter).map(normalizeCell)
    }
  }
  return [normalizeCell(line)]
}

function createId(en: string, index: number): string {
  return `custom-${en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'word'}-${index}`
}

function parseRowFromCells(cells: string[], rowNumber: number, headerMap?: Record<string, number>): ParsedCustomWordRow {
  const raw = cells.join(' | ')
  const getByHeader = (key: string) => {
    const index = headerMap?.[key]
    return typeof index === 'number' ? normalizeCell(cells[index] ?? '') : ''
  }

  const en = headerMap ? getByHeader('en') : normalizeCell(cells[0] ?? '')
  const ru = headerMap ? getByHeader('ru') : normalizeCell(cells[1] ?? '')
  const example = headerMap ? getByHeader('example') : normalizeCell(cells[2] ?? '')
  const topic = headerMap ? getByHeader('topic') : normalizeCell(cells[3] ?? '')

  if (!en) return { raw, rowNumber, error: 'Не найдено английское слово.' }
  if (!/^[a-zA-Z][a-zA-Z' -]*$/.test(en)) return { raw, rowNumber, en, error: 'Английское слово выглядит некорректно.' }

  return {
    raw,
    rowNumber,
    id: createId(en, rowNumber),
    en,
    ru,
    ...(example ? { example } : {}),
    ...(topic ? { topic } : {}),
    ...(!ru ? { error: 'Не найден перевод.' } : {}),
  }
}

export function parseCustomWordListText(text: string): CustomWordListParseResult {
  const lines = text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { rows: [], validItems: [], duplicateCount: 0, errorCount: 0 }
  }

  const firstCells = splitDelimitedLine(lines[0] ?? '')
  const hasHeader = looksLikeHeader(firstCells)
  const headerMap: Record<string, number> | undefined = hasHeader
    ? Object.fromEntries(
        firstCells
          .map((cell, index) => [HEADER_ALIASES.get(normalizeKey(cell)), index] as const)
          .filter((entry): entry is [string, number] => Boolean(entry[0]))
      )
    : undefined

  const sourceLines = hasHeader ? lines.slice(1) : lines
  const rows = sourceLines.map((line, index) => parseRowFromCells(splitDelimitedLine(line), index + (hasHeader ? 2 : 1), headerMap))
  const seen = new Set<string>()
  let duplicateCount = 0
  const validItems: CustomWordItem[] = []

  for (const row of rows) {
    if (row.error || !row.id || !row.en || !row.ru) continue
    const key = row.en.toLowerCase()
    if (seen.has(key)) {
      duplicateCount += 1
      continue
    }
    seen.add(key)
    validItems.push({
      id: row.id,
      en: row.en,
      ru: row.ru,
      ...(row.example ? { example: row.example } : {}),
      ...(row.topic ? { topic: row.topic } : {}),
    })
  }

  return {
    rows,
    validItems,
    duplicateCount,
    errorCount: rows.filter((row) => row.error).length,
  }
}

export function buildCustomWordPackTitle(source: CustomWordPackSource, now: Date = new Date()): string {
  const date = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  if (source === 'excel') return `Excel список ${date}`
  if (source === 'word') return `Word список ${date}`
  if (source === 'paste') return `Свой список ${date}`
  return `Список слов ${date}`
}
