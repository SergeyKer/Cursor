import {
  DEFAULT_PHRASEBOOK_TOPIC_ID,
  isPhrasebookTopicId,
  type PhrasebookTopicId,
} from '@/lib/phrasebook/topics'

export const PHRASEBOOK_ACTIVE_TOPIC_KEY = 'engvo_phrasebook_active_topic'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadActivePhrasebookTopicId(): PhrasebookTopicId {
  if (!canUseStorage()) return DEFAULT_PHRASEBOOK_TOPIC_ID
  try {
    const raw = window.localStorage.getItem(PHRASEBOOK_ACTIVE_TOPIC_KEY)
    if (raw && isPhrasebookTopicId(raw)) return raw
  } catch {
    // ignore
  }
  return DEFAULT_PHRASEBOOK_TOPIC_ID
}

export function saveActivePhrasebookTopicId(id: PhrasebookTopicId): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(PHRASEBOOK_ACTIVE_TOPIC_KEY, id)
  } catch {
    // ignore
  }
}
