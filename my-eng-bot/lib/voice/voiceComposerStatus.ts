import type { VoicePhase } from '@/lib/voice/useVoiceComposer'

export const VOICE_COMPOSER_LISTENING_STATUS = 'Слушаю...'
export const VOICE_COMPOSER_FINALIZING_STATUS = 'Распознаю речь...'

export function showVoiceComposerOverlay(phase: VoicePhase): boolean {
  return phase === 'recording' || phase === 'finalizing'
}

export function voiceComposerOverlayText(phase: VoicePhase): string {
  return phase === 'finalizing' ? VOICE_COMPOSER_FINALIZING_STATUS : VOICE_COMPOSER_LISTENING_STATUS
}
