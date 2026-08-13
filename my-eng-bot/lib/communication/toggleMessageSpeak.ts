import { speak } from '@/lib/speech'
import { stopCommunicationTts } from '@/lib/communication/playCommunicationTts'
import { createMessageSpeakSession } from '@/lib/communication/messageSpeakPlayback'

export type ToggleMessageSpeakOptions = {
  playing: boolean
  text: string
  voiceId: string
  rate: number
  messageIndex: number
}

export function toggleMessageSpeak(options: ToggleMessageSpeakOptions): void {
  const text = options.text.trim()
  if (!text) return

  if (options.playing) {
    stopCommunicationTts()
    return
  }

  const session = createMessageSpeakSession()
  speak(text, options.voiceId, {
    rate: options.rate,
    onEnd: session.endHandler,
    onError: session.endHandler,
  })
  session.begin(options.messageIndex)
}
