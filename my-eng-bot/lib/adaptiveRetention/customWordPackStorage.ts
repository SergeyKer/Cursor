import type { CustomWordItem, CustomWordPack, CustomWordPackSource } from '@/types/adaptiveRetention'

const STORAGE_KEY = 'my-eng-bot-custom-word-packs'
const STORAGE_VERSION = 1
const MAX_PACKS = 20

interface StoredCustomWordPacks {
  version: number
  packs: CustomWordPack[]
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeItem(value: unknown): CustomWordItem | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Partial<CustomWordItem>
  if (typeof row.id !== 'string' || typeof row.en !== 'string' || typeof row.ru !== 'string') return null
  const en = row.en.trim()
  const ru = row.ru.trim()
  if (!en || !ru) return null
  return {
    id: row.id,
    en,
    ru,
    ...(typeof row.example === 'string' && row.example.trim() ? { example: row.example.trim() } : {}),
    ...(typeof row.topic === 'string' && row.topic.trim() ? { topic: row.topic.trim() } : {}),
  }
}

function normalizePack(value: unknown): CustomWordPack | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Partial<CustomWordPack>
  if (typeof row.id !== 'string' || typeof row.title !== 'string') return null
  const items = Array.isArray(row.items) ? row.items.map(normalizeItem).filter((item): item is CustomWordItem => Boolean(item)) : []
  if (items.length === 0) return null
  const source: CustomWordPackSource =
    row.source === 'manual' || row.source === 'paste' || row.source === 'excel' || row.source === 'word' || row.source === 'ai-assisted'
      ? row.source
      : 'manual'
  const now = Date.now()
  return {
    id: row.id,
    title: row.title.trim() || 'Свой список слов',
    source,
    createdAt: typeof row.createdAt === 'number' ? row.createdAt : now,
    updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : now,
    items,
  }
}

export function loadCustomWordPacks(): CustomWordPack[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<StoredCustomWordPacks>
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.packs)) return []
    return parsed.packs.map(normalizePack).filter((pack): pack is CustomWordPack => Boolean(pack))
  } catch {
    return []
  }
}

export function saveCustomWordPack(pack: CustomWordPack): CustomWordPack[] {
  if (!canUseStorage()) return [pack]
  const normalized = normalizePack(pack)
  if (!normalized) return loadCustomWordPacks()
  const current = loadCustomWordPacks()
  const next = [normalized, ...current.filter((item) => item.id !== normalized.id)].slice(0, MAX_PACKS)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, packs: next }))
  } catch {
    // Custom packs are local best-effort data for MVP.
  }
  return next
}

export function createCustomWordPack(params: {
  title: string
  source: CustomWordPackSource
  items: CustomWordItem[]
  now?: number
}): CustomWordPack {
  const now = params.now ?? Date.now()
  return {
    id: `custom-pack-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: params.title.trim() || 'Свой список слов',
    source: params.source,
    createdAt: now,
    updatedAt: now,
    items: params.items,
  }
}
