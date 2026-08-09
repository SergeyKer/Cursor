/**
 * Legacy clipboard prompt for vocab reward — replaced by VocabFinale → translation handoff.
 * Kept as thin helper for any residual imports; do not use for UX.
 */
import type { NecessaryWord } from '@/types/vocabulary'

/** @deprecated use writeVocabTranslationHandoff + live Перевод */
export function buildNecessaryWordsChatPrompt(words: NecessaryWord[], worldTitle: string): string {
  const sample = words
    .slice(0, 4)
    .map((word) => word.en)
    .join(', ')
  return `Focus words from "${worldTitle}": ${sample}. Prefer prompts that elicit these lemmas.`
}
