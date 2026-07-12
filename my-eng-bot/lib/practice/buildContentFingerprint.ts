import type { PracticeSession } from '@/types/practice'

function normalizeFingerprintPart(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

function hashFingerprintContent(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

export function buildContentFingerprint(session: Pick<PracticeSession, 'lessonId' | 'mode' | 'questions'>): string {
  const content = session.questions
    .map((question) =>
      [
        question.type,
        normalizeFingerprintPart(question.prompt),
        normalizeFingerprintPart(question.targetAnswer),
      ].join('\u001f')
    )
    .sort()
    .join('\u001e')
  return `${session.lessonId}|${session.mode}|${hashFingerprintContent(content)}`
}
