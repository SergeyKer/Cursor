import { appendVoiceText } from '@/lib/voice/useVoiceComposer'

type RealtimeTranscriptItem = {
  previousItemId: string | null
  deltaText: string
  completedText: string
}

export type RealtimeTranscriptState = {
  orderedItemIds: string[]
  items: Record<string, RealtimeTranscriptItem>
}

type RealtimeServerEvent =
  | {
      type: 'input_audio_buffer.committed'
      item_id?: string
      previous_item_id?: string | null
    }
  | {
      type: 'conversation.item.input_audio_transcription.delta'
      item_id?: string
      delta?: string
    }
  | {
      type: 'conversation.item.input_audio_transcription.completed'
      item_id?: string
      transcript?: string
    }

export type RealtimeTranscriptView = {
  finalText: string
  interimText: string
}

export type RealtimeSttSession = {
  stop: () => void
  close: () => void
}

type StartRealtimeSttParams = {
  language: 'ru' | 'en'
  sessionUrl: string
  onTranscript: (view: RealtimeTranscriptView) => void
  onFinal: (text: string) => void
  onError: (message: string) => void
  onStatus?: (status: string | null) => void
  finalizeGraceMs?: number
}

export function createRealtimeTranscriptState(): RealtimeTranscriptState {
  return {
    orderedItemIds: [],
    items: {},
  }
}

function insertOrderedItemIds(order: string[], itemId: string, previousItemId: string | null): string[] {
  if (order.includes(itemId)) return order
  if (!previousItemId) return [...order, itemId]
  const previousIndex = order.indexOf(previousItemId)
  if (previousIndex === -1) return [...order, itemId]
  return [...order.slice(0, previousIndex + 1), itemId, ...order.slice(previousIndex + 1)]
}

function ensureRealtimeTranscriptItem(
  state: RealtimeTranscriptState,
  itemId: string,
  previousItemId: string | null
): RealtimeTranscriptState {
  const existing = state.items[itemId]
  const nextItem: RealtimeTranscriptItem = existing ?? {
    previousItemId,
    deltaText: '',
    completedText: '',
  }
  return {
    orderedItemIds: insertOrderedItemIds(state.orderedItemIds, itemId, previousItemId),
    items: {
      ...state.items,
      [itemId]: existing ? { ...existing, previousItemId: existing.previousItemId ?? previousItemId } : nextItem,
    },
  }
}

export function reduceRealtimeTranscriptEvent(
  state: RealtimeTranscriptState,
  event: RealtimeServerEvent
): RealtimeTranscriptState {
  const itemId = event.item_id?.trim()
  if (!itemId) return state

  if (event.type === 'input_audio_buffer.committed') {
    return ensureRealtimeTranscriptItem(state, itemId, event.previous_item_id ?? null)
  }

  const withItem = ensureRealtimeTranscriptItem(state, itemId, null)
  const current = withItem.items[itemId]

  if (event.type === 'conversation.item.input_audio_transcription.delta') {
    return {
      ...withItem,
      items: {
        ...withItem.items,
        [itemId]: {
          ...current,
          deltaText: `${current.deltaText}${event.delta ?? ''}`,
        },
      },
    }
  }

  return {
    ...withItem,
    items: {
      ...withItem.items,
      [itemId]: {
        ...current,
        deltaText: '',
        completedText: (event.transcript ?? '').trim(),
      },
    },
  }
}

export function getRealtimeTranscriptView(state: RealtimeTranscriptState): RealtimeTranscriptView {
  let finalText = ''
  let interimText = ''

  for (const itemId of state.orderedItemIds) {
    const item = state.items[itemId]
    if (!item) continue
    if (item.completedText) {
      finalText = appendVoiceText(finalText, item.completedText)
      continue
    }
    if (!interimText && item.deltaText.trim()) {
      interimText = item.deltaText.trim()
    }
  }

  if (!interimText) {
    for (let i = state.orderedItemIds.length - 1; i >= 0; i -= 1) {
      const item = state.items[state.orderedItemIds[i]]
      if (!item?.deltaText.trim() || item.completedText) continue
      interimText = item.deltaText.trim()
      break
    }
  }

  return { finalText, interimText }
}

export function getRealtimeTranscriptFinalText(state: RealtimeTranscriptState): string {
  const view = getRealtimeTranscriptView(state)
  return appendVoiceText(view.finalText, view.interimText)
}

export async function startRealtimeSttSession(params: StartRealtimeSttParams): Promise<RealtimeSttSession> {
  if (typeof window === 'undefined') throw new Error('Realtime STT is only available in the browser')
  if (typeof RTCPeerConnection === 'undefined') throw new Error('WebRTC is unavailable in this browser')

  let transcriptState = createRealtimeTranscriptState()
  let localStream: MediaStream | null = null
  let peerConnection: RTCPeerConnection | null = null
  let dataChannel: RTCDataChannel | null = null
  let stopTimerId: number | null = null
  let finalized = false
  let stopRequested = false

  const cleanup = () => {
    if (stopTimerId != null) {
      window.clearTimeout(stopTimerId)
      stopTimerId = null
    }
    if (dataChannel) {
      try {
        dataChannel.close()
      } catch {
        // ignore
      }
      dataChannel = null
    }
    if (peerConnection) {
      try {
        peerConnection.close()
      } catch {
        // ignore
      }
      peerConnection = null
    }
    if (localStream) {
      for (const track of localStream.getTracks()) track.stop()
      localStream = null
    }
  }

  const emitTranscript = () => {
    params.onTranscript(getRealtimeTranscriptView(transcriptState))
  }

  const finalize = () => {
    if (finalized) return
    finalized = true
    const finalText = getRealtimeTranscriptFinalText(transcriptState)
    cleanup()
    params.onFinal(finalText)
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    peerConnection = new RTCPeerConnection()
    dataChannel = peerConnection.createDataChannel('oai-events')

    for (const track of localStream.getTracks()) {
      peerConnection.addTrack(track, localStream)
    }

    peerConnection.addEventListener('connectionstatechange', () => {
      const state = peerConnection?.connectionState
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        if (stopRequested || finalized) return
        cleanup()
        params.onError('Realtime STT connection failed')
      }
    })

    dataChannel.addEventListener('message', (message) => {
      const raw = typeof message.data === 'string' ? message.data : ''
      if (!raw) return
      try {
        const parsed = JSON.parse(raw) as { type?: string; error?: { message?: string } }
        if (parsed.type === 'error') {
          params.onError(parsed.error?.message ?? 'Realtime STT error')
          return
        }
        const event = parsed as RealtimeServerEvent
        if (
          event.type === 'input_audio_buffer.committed' ||
          event.type === 'conversation.item.input_audio_transcription.delta' ||
          event.type === 'conversation.item.input_audio_transcription.completed'
        ) {
          transcriptState = reduceRealtimeTranscriptEvent(transcriptState, event)
          emitTranscript()
        }
      } catch {
        // ignore malformed events
      }
    })

    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    const sessionResponse = await fetch(params.sessionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sdp: offer.sdp,
        language: params.language,
      }),
    })

    const sessionData = (await sessionResponse.json()) as { sdp?: string; error?: string }
    if (!sessionResponse.ok || !sessionData.sdp) {
      cleanup()
      throw new Error(sessionData.error ?? 'Failed to initialize realtime transcription')
    }

    await peerConnection.setRemoteDescription({
      type: 'answer',
      sdp: sessionData.sdp,
    })

    return {
      stop: () => {
        if (stopRequested) return
        stopRequested = true
        params.onStatus?.('Завершаю распознавание...')
        if (localStream) {
          for (const track of localStream.getTracks()) track.stop()
        }
        stopTimerId = window.setTimeout(() => {
          finalize()
        }, params.finalizeGraceMs ?? 1200)
      },
      close: () => {
        stopRequested = true
        finalized = true
        cleanup()
      },
    }
  } catch (error) {
    cleanup()
    throw error instanceof Error ? error : new Error('Failed to start realtime transcription')
  }
}
