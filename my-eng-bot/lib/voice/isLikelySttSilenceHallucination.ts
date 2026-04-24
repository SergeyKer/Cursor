const SILENCE_HALLUCINATION_PHRASES = new Set([
  'thank you for watching',
  'thanks for watching',
  'thank you for listening',
  'thanks for listening',
  'like and subscribe',
])

function normalizeTranscript(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[.!?…]+$/g, '')
}

export function isLikelySttSilenceHallucination(text: string): boolean {
  return SILENCE_HALLUCINATION_PHRASES.has(normalizeTranscript(text))
}
