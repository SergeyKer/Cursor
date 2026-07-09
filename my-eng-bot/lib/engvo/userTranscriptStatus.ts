/** xAI may emit partial `…transcription.completed` with these statuses before the final. */
export function isPartialUserTranscriptStatus(status: unknown): boolean {
  return status === 'in_progress' || status === 'incomplete'
}
