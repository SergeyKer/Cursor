let playingIndex: number | null = null
let generation = 0
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getMessageSpeakPlayingIndex(): number | null {
  return playingIndex
}

export function isMessageSpeakGenerationCurrent(sessionGeneration: number): boolean {
  return generation === sessionGeneration
}

export function subscribeMessageSpeakPlayback(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function beginMessageSpeakPlayback(index: number): number {
  generation += 1
  playingIndex = index
  emit()
  return generation
}

export function clearMessageSpeakPlayback(): void {
  generation += 1
  if (playingIndex === null) return
  playingIndex = null
  emit()
}

export function createMessageSpeakSession(): {
  endHandler: () => void
  begin: (index: number) => void
} {
  const session = { gen: 0 }
  return {
    endHandler: () => {
      if (!isMessageSpeakGenerationCurrent(session.gen)) return
      clearMessageSpeakPlayback()
    },
    begin: (index: number) => {
      session.gen = beginMessageSpeakPlayback(index)
    },
  }
}
