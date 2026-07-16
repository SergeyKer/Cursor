import type { AppMode } from '@/lib/types'
import type { LearningSource } from '@/lib/learningMemory/types'

/** Map app mode + voice overlay → learning source. */
export function mapLearningSource(params: {
  mode: AppMode
  engvoVoiceMode?: boolean
}): LearningSource {
  if (params.engvoVoiceMode) return 'call'
  if (params.mode === 'communication') return 'chat'
  if (params.mode === 'translation') return 'translation'
  return 'guided_dialogue'
}
