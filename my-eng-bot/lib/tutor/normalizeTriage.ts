import { TUTOR_TRIAGE_MAX_CHIPS, type TutorComposerChip, type TutorTriageResult } from '@/lib/tutor/types'
import { asRecord, compactList, compactText } from '@/lib/tutor/text'

function normalizeChips(value: unknown): TutorComposerChip[] {
  if (!Array.isArray(value)) return []
  const out: TutorComposerChip[] = []
  for (const item of value) {
    const row = asRecord(item)
    if (!row) continue
    const id = compactText(row.id, 64)
    const labelRu = compactText(row.labelRu ?? row.label, 80)
    if (!id || !labelRu) continue
    out.push({ id, labelRu })
    if (out.length >= TUTOR_TRIAGE_MAX_CHIPS) break
  }
  return out
}

/**
 * Normalize triage payload from model/API.
 * Returns null when required fields for the kind are missing.
 */
export function normalizeTutorTriage(input: unknown): TutorTriageResult | null {
  const row = asRecord(input)
  if (!row) return null

  const kindRaw = compactText(row.kind ?? row.triage, 1).toUpperCase()
  const kind = kindRaw === 'A' || kindRaw === 'B' || kindRaw === 'C' || kindRaw === 'D' ? kindRaw : null
  if (!kind) return null

  if (kind === 'A') {
    const query = compactText(row.query ?? row.text ?? row.question, 400)
    if (!query) return null
    return { kind: 'A', query }
  }

  if (kind === 'B') {
    const topicHint = compactText(row.topicHint ?? row.topic ?? row.query, 120)
    const chips = normalizeChips(row.chips)
    if (!topicHint || chips.length === 0) return null
    return { kind: 'B', topicHint, chips }
  }

  if (kind === 'C') {
    const broadTerm = compactText(row.broadTerm ?? row.term ?? row.query, 80)
    const chips = normalizeChips(row.chips)
    if (!broadTerm || chips.length === 0) return null
    return { kind: 'C', broadTerm, chips }
  }

  const clarifyPromptRu = compactText(
    row.clarifyPromptRu ?? row.clarifyPrompt ?? row.promptRu ?? row.message,
    240
  )
  if (!clarifyPromptRu) return null
  return { kind: 'D', clarifyPromptRu }
}

/** Soft helper: treat bare string list as chip labels with slug ids (tests / stubs). */
export function chipsFromLabels(labels: string[]): TutorComposerChip[] {
  return compactList(labels, TUTOR_TRIAGE_MAX_CHIPS, 80).map((labelRu, index) => ({
    id: `chip_${index + 1}`,
    labelRu,
  }))
}
