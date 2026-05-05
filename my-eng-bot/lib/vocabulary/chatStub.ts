import type { NecessaryWord } from '@/types/vocabulary'

export function buildNecessaryWordsChatPrompt(words: NecessaryWord[], worldTitle: string): string {
  const sample = words.slice(0, 4).map((word) => word.en).join(', ')
  return `Поговорим про слова из мира "${worldTitle}": ${sample}. Помоги составить 3 очень простые фразы на английском.`
}
