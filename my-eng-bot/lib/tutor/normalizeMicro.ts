import {
  TUTOR_MICRO_MAX_ITEMS,
  TUTOR_MICRO_MAX_OPTIONS,
  TUTOR_MICRO_MIN_ITEMS,
  TUTOR_MICRO_MIN_OPTIONS,
  type TutorMicroItem,
  type TutorMicroItemKind,
  type TutorMicroPack,
} from '@/lib/tutor/types'
import { asRecord, compactList, compactText } from '@/lib/tutor/text'

const ITEM_KINDS: readonly TutorMicroItemKind[] = [
  'pick_side',
  'best_fit',
  'fix_one',
  'signal_spot',
  'job_of_bit',
  'choice',
] as const

function normalizeItemKind(value: unknown): TutorMicroItemKind {
  if (typeof value === 'string' && (ITEM_KINDS as readonly string[]).includes(value)) {
    return value as TutorMicroItemKind
  }
  return 'choice'
}

function normalizeMicroItem(value: unknown, index: number): TutorMicroItem | null {
  const row = asRecord(value)
  if (!row) return null
  const promptRu = compactText(row.promptRu ?? row.prompt, 240)
  const options = compactList(row.options, TUTOR_MICRO_MAX_OPTIONS, 120)
  if (!promptRu || options.length < TUTOR_MICRO_MIN_OPTIONS) return null

  const correctRaw = row.correctIndex ?? row.correct
  let correctIndex = typeof correctRaw === 'number' ? Math.trunc(correctRaw) : Number(correctRaw)
  if (!Number.isFinite(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    return null
  }

  const id = compactText(row.id, 64) || `micro_${index + 1}`
  const skillTagId = compactText(row.skillTagId, 64) || undefined

  return {
    id,
    kind: normalizeItemKind(row.kind),
    promptRu,
    options,
    correctIndex,
    ...(skillTagId ? { skillTagId } : {}),
  }
}

/**
 * Normalize in-thread micro pack. Requires 2–5 valid items + summary.
 */
export function normalizeTutorMicroPack(input: unknown): TutorMicroPack | null {
  const row = asRecord(input)
  if (!row) return null

  const summaryRu = compactText(row.summaryRu ?? row.summary, 400)
  if (!summaryRu) return null

  const rawItems = Array.isArray(row.items) ? row.items : Array.isArray(row.questions) ? row.questions : null
  if (!rawItems) return null

  const items: TutorMicroItem[] = []
  for (let i = 0; i < rawItems.length; i += 1) {
    const item = normalizeMicroItem(rawItems[i], i)
    if (!item) continue
    items.push(item)
    if (items.length >= TUTOR_MICRO_MAX_ITEMS) break
  }

  if (items.length < TUTOR_MICRO_MIN_ITEMS) return null
  return { items, summaryRu }
}
