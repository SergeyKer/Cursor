/**
 * Pass B: AppShell xAI hear wiring (arm/mic/filters/keyterms/uplink).
 * Run after pass A: node scripts/patches/apply-engvo-xai-hear-appshell-b.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCyrillicIntegrity } from '../check-cyrillic-integrity.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const FILE = path.join(ROOT, 'components/app/AppShell.tsx')

function mustReplace(content, from, to, label) {
  if (!content.includes(from)) {
    throw new Error(`Missing block [${label}]: ${JSON.stringify(from.slice(0, 160))}`)
  }
  return content.replace(from, to)
}

let s = fs.readFileSync(FILE, 'utf8')

if (!s.includes('armEngvoXaiListen')) {
  throw new Error('Pass A required first (armEngvoXaiListen missing)')
}
if (s.includes('ensureEngvoXaiReadyToListen')) {
  console.log('Pass B already applied')
  process.exit(0)
}

// Refs for arm/disarm callable from earlier callbacks
s = mustReplace(
  s,
  `  const engvoListenArmedRef = React.useRef(false)
  const engvoXaiUplinkDropCountRef = React.useRef(0)
  const engvoLastAssistantTextForKeytermsRef = React.useRef('')
  const engvoLastMeaningfulActivityAtRef = React.useRef<number>(0)`,
  `  const engvoListenArmedRef = React.useRef(false)
  const engvoXaiUplinkDropCountRef = React.useRef(0)
  const engvoLastAssistantTextForKeytermsRef = React.useRef('')
  const armEngvoXaiListenRef = React.useRef<() => void>(() => {})
  const disarmEngvoXaiListenRef = React.useRef<() => void>(() => {})
  const engvoLastMeaningfulActivityAtRef = React.useRef<number>(0)`,
  'arm-refs'
)

// Wire keyterms text + disarm on reclaim start
s = mustReplace(
  s,
  `      engvoTeacherReclaimUsedThisUserTurnRef.current = true
      engvoTeacherReclaimInFlightRef.current = true
      setEngvoCallPhase('assistantPending')
      const sent = sendEngvoRealtimeEvent({
        type: 'response.create',
        response: {
          instructions: buildEngvoTeacherDrillReclaimResponseInstructions({
            level: engvoCefrLevel,
            tense: engvoTeacherTense,
            sentenceType: engvoTeacherSentenceType,
          }),
        },
      })`,
  `      engvoTeacherReclaimUsedThisUserTurnRef.current = true
      engvoTeacherReclaimInFlightRef.current = true
      disarmEngvoXaiListenRef.current()
      setEngvoCallPhase('assistantPending')
      const sent = sendEngvoRealtimeEvent({
        type: 'response.create',
        response: {
          instructions: buildEngvoTeacherDrillReclaimResponseInstructions({
            level: engvoCefrLevel,
            tense: engvoTeacherTense,
            sentenceType: engvoTeacherSentenceType,
          }),
        },
      })`,
  'reclaim-disarm'
)

s = mustReplace(
  s,
  `      markEngvoAssistantAheadOfPendingUserTranscript()
      engvoLastMeaningfulActivityAtRef.current = Date.now()
      engvoGotAssistantForCurrentUserTurnRef.current = true
      setMessages((prev) => {`,
  `      markEngvoAssistantAheadOfPendingUserTranscript()
      engvoLastMeaningfulActivityAtRef.current = Date.now()
      engvoGotAssistantForCurrentUserTurnRef.current = true
      engvoLastAssistantTextForKeytermsRef.current = cleanText
      setMessages((prev) => {`,
  'keyterms-text'
)

// Assign refs after arm/disarm definitions + ensure helper
s = mustReplace(
  s,
  `  const disarmEngvoXaiListen = useCallback(() => {
    if (engvoActiveProviderRef.current !== 'xai') return
    engvoListenArmedRef.current = false
    sendEngvoRealtimeEvent(buildCurrentXaiSessionUpdate({ createResponse: false }))
    console.info('[engvo] listen-disarmed')
  }, [buildCurrentXaiSessionUpdate, sendEngvoRealtimeEvent])

  const updateEngvoRealtimeSession = useCallback(`,
  `  const disarmEngvoXaiListen = useCallback(() => {
    if (engvoActiveProviderRef.current !== 'xai') return
    engvoListenArmedRef.current = false
    sendEngvoRealtimeEvent(buildCurrentXaiSessionUpdate({ createResponse: false }))
    console.info('[engvo] listen-disarmed')
  }, [buildCurrentXaiSessionUpdate, sendEngvoRealtimeEvent])

  armEngvoXaiListenRef.current = armEngvoXaiListen
  disarmEngvoXaiListenRef.current = disarmEngvoXaiListen

  const ensureEngvoXaiReadyToListen = useCallback(() => {
    if (engvoActiveProviderRef.current !== 'xai') return
    engvoXaiTransportRef.current?.startMicCapture()
    armEngvoXaiListen()
  }, [armEngvoXaiListen])

  const updateEngvoRealtimeSession = useCallback(`,
  'ensure-listen'
)

// updateEngvoRealtimeSession xAI branch
s = mustReplace(
  s,
  `      if (provider === 'xai') {
        const voice = (payload.voice as EngvoXaiCallVoice | undefined) ?? engvoXaiVoice
        return sendEngvoRealtimeEvent(
          buildEngvoXaiClientSessionUpdate({
            ...(instructions ? { instructions } : {}),
            voice,
            speed: speechSpeed,
          })
        )
      }`,
  `      if (provider === 'xai') {
        const voice = (payload.voice as EngvoXaiCallVoice | undefined) ?? engvoXaiVoice
        const keyterms =
          engvoSessionKindRef.current === 'teacher' && engvoTeacherPhaseRef.current === 'drill'
            ? buildEngvoTeacherKeyterms({
                canonicalEnglish:
                  extractTeacherCallRepeatPrompt(engvoLastAssistantTextForKeytermsRef.current)
                    ?.repeatText ?? null,
              })
            : undefined
        return sendEngvoRealtimeEvent(
          buildEngvoXaiClientSessionUpdate({
            ...(instructions ? { instructions } : {}),
            voice,
            speed: speechSpeed,
            kind: engvoSessionKindRef.current,
            teacherPhase: engvoTeacherPhaseRef.current,
            createResponse: engvoListenArmedRef.current,
            ...(keyterms && keyterms.length > 0 ? { keyterms } : {}),
          })
        )
      }`,
  'session-update-xai'
)

// Early mic on greeting paths + session ack
s = mustReplace(
  s,
  `            if (continuationSent) {
              engvoGreetingTriggeredRef.current = true
              setEngvoCallPhase('assistantPending')
              // xAI: do not open mic until response.done — early VAD cancels the turn.
            } else {
              setEngvoCallPhase('listening')
              engvoXaiTransportRef.current?.startMicCapture()
            }`,
  `            if (continuationSent) {
              engvoGreetingTriggeredRef.current = true
              setEngvoCallPhase('assistantPending')
              // xAI: early mic (create_response stays false until arm on response.done).
              engvoXaiTransportRef.current?.startMicCapture()
            } else {
              setEngvoCallPhase('listening')
              ensureEngvoXaiReadyToListen()
            }`,
  'continuation-mic'
)

s = mustReplace(
  s,
  `            if (greetingSent) {
              engvoGreetingTriggeredRef.current = true
              setEngvoCallPhase('assistantPending')
              console.info('[engvo] greeting-sent', parsed.type)
            } else {
              setEngvoCallPhase('listening')
              engvoXaiTransportRef.current?.startMicCapture()
            }`,
  `            if (greetingSent) {
              engvoGreetingTriggeredRef.current = true
              setEngvoCallPhase('assistantPending')
              console.info('[engvo] greeting-sent', parsed.type)
              engvoXaiTransportRef.current?.startMicCapture()
            } else {
              setEngvoCallPhase('listening')
              ensureEngvoXaiReadyToListen()
            }`,
  'greeting-mic'
)

s = mustReplace(
  s,
  `        if (engvoActiveProviderRef.current !== 'xai') {
          // OpenAI uses WebRTC mic tracks already attached.
        } else if (engvoGreetingTriggeredRef.current) {
          // Mic starts on response.done (avoid VAD killing greeting).
        } else if (
          parsed.type !== 'conversation.created' &&
          parsed.type !== 'session.created'
        ) {
          engvoXaiTransportRef.current?.startMicCapture()
        }
        return
      }`,
  `        if (engvoActiveProviderRef.current === 'xai') {
          // Early mic; arm only after assistant response.done (create_response false until then).
          engvoXaiTransportRef.current?.startMicCapture()
        }
        return
      }`,
  'ack-early-mic'
)

// Transcript gates: unarmed ignore, soft noise, echo while playback, replace gate
s = mustReplace(
  s,
  `          if (engvoCommittedUserItemIdsRef.current.has(itemId)) {
            if (transcript) {
              setEngvoUserInterimText('')
              setMessages((prev) => updateLastEngvoUserMessage(prev, transcript))
            }
            return
          }

          setEngvoUserInterimText('')
          const hasActiveAssistantResponse = hasActiveEngvoAssistantResponse({
            responseId: engvoAssistantResponseIdRef.current,
            responseDone: engvoAssistantResponseDoneRef.current,
          })
          const interruptCommitted = engvoInterruptDebounceStateRef.current.committed
          const isLikelyNoise = !transcript || engvoVoiceTranscriptIsLikelyNoise(transcript)
          if (
            shouldIgnoreNoiseTranscriptDuringAssistantSpeech({
              isLikelyNoise,
              hasActiveAssistantResponse,
              interruptCommitted,
            })
          ) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            return
          }
          const restorePhaseAfterNoiseReject = (phase: EngvoCallPhase) => {
            if (hasActiveAssistantResponse && !interruptCommitted) return
            setEngvoCallPhase(phase)
          }
          const normalizedTranscript = normalizeForEchoCompare(transcript)
          const normalizedAssistantPending = normalizeForEchoCompare(engvoAssistantPendingText)
          const lastMessage = messages[messages.length - 1]
          const normalizedLastAssistant =
            lastMessage?.role === 'assistant' ? normalizeForEchoCompare(lastMessage.content) : ''
          const looksLikeAssistantEcho =
            !!normalizedTranscript &&
            (normalizedTranscript === normalizedAssistantPending || normalizedTranscript === normalizedLastAssistant)
          if (looksLikeAssistantEcho) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            restorePhaseAfterNoiseReject('listening')
            return
          }
          if (isLikelyEngvoCallHallucination(transcript)) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            restorePhaseAfterNoiseReject('listening')
            return
          }
          if (transcript && !shouldShowEngvoVoiceUserTranscript(transcript)) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            restorePhaseAfterNoiseReject('listening')
            return
          }
          engvoCommittedUserItemIdsRef.current.add(itemId)
          setEngvoCallPhase('userFinalizing')
          if (transcript) {
            const now = Date.now()
            const isXai = engvoActiveProviderRef.current === 'xai'
            const lastUser = [...messages].reverse().find((m) => m.role === 'user')
            const shouldCoalesce =
              isXai &&
              shouldCoalesceEngvoUserTranscript({
                previousUserText: lastUser?.content ?? null,
                nextUserText: transcript,
                elapsedMsSincePreviousUser: now - engvoLastFinalUserAtRef.current,
                windowMs: ENGVO_XAI_USER_COALESCE_WINDOW_MS,
              })
            if (shouldCoalesce) {
              engvoLastUserCoalescedAtRef.current = now
              engvoLastFinalUserAtRef.current = now
              markEngvoMeaningfulActivity()
              setMessages((prev) => updateLastEngvoUserMessage(prev, transcript))`,
  `          if (engvoCommittedUserItemIdsRef.current.has(itemId)) {
            if (transcript) {
              setEngvoUserInterimText('')
              const gateXai = engvoActiveProviderRef.current === 'xai'
              setMessages((prev) =>
                updateLastEngvoUserMessage(prev, transcript, {
                  requireReplaceGate: gateXai,
                })
              )
            }
            return
          }

          setEngvoUserInterimText('')
          const isXaiProviderPath = engvoActiveProviderRef.current === 'xai'
          if (isXaiProviderPath && !engvoListenArmedRef.current) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            return
          }
          const hasActiveAssistantResponse = hasActiveEngvoAssistantResponse({
            responseId: engvoAssistantResponseIdRef.current,
            responseDone: engvoAssistantResponseDoneRef.current,
          })
          const interruptCommitted = engvoInterruptDebounceStateRef.current.committed
          const sessionKindForNoise = engvoSessionKindRef.current
          const isLikelyNoise =
            !transcript ||
            (isXaiProviderPath
              ? engvoVoiceTranscriptIsLikelyNoiseForKind(transcript, sessionKindForNoise)
              : engvoVoiceTranscriptIsLikelyNoise(transcript))
          if (
            shouldIgnoreNoiseTranscriptDuringAssistantSpeech({
              isLikelyNoise,
              hasActiveAssistantResponse,
              interruptCommitted,
            })
          ) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            return
          }
          const restorePhaseAfterNoiseReject = (phase: EngvoCallPhase) => {
            if (hasActiveAssistantResponse && !interruptCommitted) return
            setEngvoCallPhase(phase)
          }
          const normalizedTranscript = normalizeForEchoCompare(transcript)
          const normalizedAssistantPending = normalizeForEchoCompare(engvoAssistantPendingText)
          const lastMessage = messages[messages.length - 1]
          const normalizedLastAssistant =
            lastMessage?.role === 'assistant' ? normalizeForEchoCompare(lastMessage.content) : ''
          const echoGuardActive = isXaiProviderPath
            ? engvoRemotePlaybackActive
            : true
          const looksLikeAssistantEcho =
            echoGuardActive &&
            !!normalizedTranscript &&
            (normalizedTranscript === normalizedAssistantPending ||
              normalizedTranscript === normalizedLastAssistant)
          if (looksLikeAssistantEcho) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            restorePhaseAfterNoiseReject('listening')
            return
          }
          if (isLikelyEngvoCallHallucination(transcript)) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            restorePhaseAfterNoiseReject('listening')
            return
          }
          if (
            transcript &&
            !shouldShowEngvoVoiceUserTranscript(
              transcript,
              isXaiProviderPath ? sessionKindForNoise : 'free_call'
            )
          ) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            restorePhaseAfterNoiseReject('listening')
            return
          }
          engvoCommittedUserItemIdsRef.current.add(itemId)
          setEngvoCallPhase('userFinalizing')
          if (transcript) {
            const now = Date.now()
            const isXai = isXaiProviderPath
            const lastUser = [...messages].reverse().find((m) => m.role === 'user')
            const shouldCoalesce =
              isXai &&
              shouldCoalesceEngvoUserTranscript({
                previousUserText: lastUser?.content ?? null,
                nextUserText: transcript,
                elapsedMsSincePreviousUser: now - engvoLastFinalUserAtRef.current,
                windowMs: ENGVO_XAI_USER_COALESCE_WINDOW_MS,
              })
            if (shouldCoalesce) {
              engvoLastUserCoalescedAtRef.current = now
              engvoLastFinalUserAtRef.current = now
              markEngvoMeaningfulActivity()
              setMessages((prev) =>
                updateLastEngvoUserMessage(prev, transcript, { requireReplaceGate: true })
              )`,
  'transcript-gates'
)

// Phase flip topic→drill: refresh xAI session (en hint + keyterms)
s = mustReplace(
  s,
                `                if (
                  engvoTeacherPhaseRef.current === 'topic_choice' &&
                  engvoTeacherUserFinalCountRef.current >= 1
                ) {
                  // After topic naming, next assistant turn is drill; corrections only after that.
                  engvoTeacherPhaseRef.current = 'drill'
                  engvoTeacherAwaitingFirstDrillRef.current = true
                }`,
  `                if (
                  engvoTeacherPhaseRef.current === 'topic_choice' &&
                  engvoTeacherUserFinalCountRef.current >= 1
                ) {
                  // After topic naming, next assistant turn is drill; corrections only after that.
                  engvoTeacherPhaseRef.current = 'drill'
                  engvoTeacherAwaitingFirstDrillRef.current = true
                  if (engvoActiveProviderRef.current === 'xai' && engvoListenArmedRef.current) {
                    const repeat = extractTeacherCallRepeatPrompt(
                      engvoLastAssistantTextForKeytermsRef.current
                    )
                    sendEngvoRealtimeEvent(
                      buildCurrentXaiSessionUpdate({
                        createResponse: true,
                        keyterms: buildEngvoTeacherKeyterms({
                          canonicalEnglish: repeat?.repeatText ?? null,
                        }),
                      })
                    )
                  }
                }`,
  'phase-flip'
)

// response.created comment + response.done / fallbacks → ensure listen
s = mustReplace(
  s,
  `        setEngvoCallPhase('assistantPending')
        // xAI mic starts on response.done — opening mic here lets VAD kill greeting audio.
        return
      }`,
  `        setEngvoCallPhase('assistantPending')
        // xAI: mic may already be on; arm stays false until response.done.
        return
      }`,
  'response-created-comment'
)

s = mustReplace(
  s,
  `            commitEngvoAssistantText(fallbackText, id)
            if (
              engvoActiveProviderRef.current === 'xai' &&
              !engvoTeacherReclaimInFlightRef.current
            ) {
              engvoXaiTransportRef.current?.startMicCapture()
            }
          }, ENGVO_RESPONSE_DONE_FALLBACK_MS)
        }
        return
      }

      if (isEngvoOutputAudioTranscriptDeltaEvent(parsed.type)) {`,
  `            commitEngvoAssistantText(fallbackText, id)
            if (
              engvoActiveProviderRef.current === 'xai' &&
              !engvoTeacherReclaimInFlightRef.current
            ) {
              ensureEngvoXaiReadyToListen()
            }
          }, ENGVO_RESPONSE_DONE_FALLBACK_MS)
        }
        return
      }

      if (isEngvoOutputAudioTranscriptDeltaEvent(parsed.type)) {`,
  'fallback-text-arm'
)

s = mustReplace(
  s,
  `            commitEngvoAssistantText(fallbackText, id)
            if (
              engvoActiveProviderRef.current === 'xai' &&
              !engvoTeacherReclaimInFlightRef.current
            ) {
              engvoXaiTransportRef.current?.startMicCapture()
            }
          }, ENGVO_RESPONSE_DONE_FALLBACK_MS)
        }
        return
      }

      if (parsed.type === 'response.done') {`,
  `            commitEngvoAssistantText(fallbackText, id)
            if (
              engvoActiveProviderRef.current === 'xai' &&
              !engvoTeacherReclaimInFlightRef.current
            ) {
              ensureEngvoXaiReadyToListen()
            }
          }, ENGVO_RESPONSE_DONE_FALLBACK_MS)
        }
        return
      }

      if (parsed.type === 'response.done') {`,
  'fallback-audio-arm'
)

s = mustReplace(
  s,
  `        const reclaimStarted = commitEngvoAssistantText(fallbackText, responseId)
        if (
          engvoActiveProviderRef.current === 'xai' &&
          !reclaimStarted &&
          !engvoTeacherReclaimInFlightRef.current
        ) {
          engvoXaiTransportRef.current?.startMicCapture()
        }
      }
    },
    [
      clearEngvoTimeout,
      markEngvoMeaningfulActivity,
      sendEngvoRealtimeEvent,
      commitEngvoAssistantText,`,
  `        const reclaimStarted = commitEngvoAssistantText(fallbackText, responseId)
        if (
          engvoActiveProviderRef.current === 'xai' &&
          !reclaimStarted &&
          !engvoTeacherReclaimInFlightRef.current
        ) {
          ensureEngvoXaiReadyToListen()
        }
      }
    },
    [
      clearEngvoTimeout,
      ensureEngvoXaiReadyToListen,
      markEngvoMeaningfulActivity,
      sendEngvoRealtimeEvent,
      commitEngvoAssistantText,`,
  'response-done-arm'
)

// Initial session.update + onUplinkDrop
s = mustReplace(
  s,
  `              const sent = sendEngvoRealtimeEvent(
                buildEngvoXaiClientSessionUpdate({
                  instructions: buildEngvoLiveInstructions(speechSpeed),
                  voice: callXaiVoice,
                  speed: speechSpeed,
                })
              )`,
  `              const initialKeyterms =
                engvoSessionKind === 'teacher' && engvoTeacherPhaseRef.current === 'drill'
                  ? buildEngvoTeacherKeyterms({ canonicalEnglish: null })
                  : undefined
              const sent = sendEngvoRealtimeEvent(
                buildEngvoXaiClientSessionUpdate({
                  instructions: buildEngvoLiveInstructions(speechSpeed),
                  voice: callXaiVoice,
                  speed: speechSpeed,
                  kind: engvoSessionKind,
                  teacherPhase: engvoTeacherPhaseRef.current,
                  createResponse: false,
                  ...(initialKeyterms && initialKeyterms.length > 0
                    ? { keyterms: initialKeyterms }
                    : {}),
                })
              )`,
  'initial-session'
)

s = mustReplace(
  s,
  `            onPlaybackActiveChange: (active) => {
              setEngvoRemotePlaybackActive(active)
              if (active) setEngvoCallPhase('assistantSpeaking')
            },
            onRemoteStream: (stream) => {
              setEngvoRemoteAudioStream(stream)
            },
          },
        })
        engvoXaiTransportRef.current = transport`,
  `            onPlaybackActiveChange: (active) => {
              setEngvoRemotePlaybackActive(active)
              if (active) setEngvoCallPhase('assistantSpeaking')
            },
            onRemoteStream: (stream) => {
              setEngvoRemoteAudioStream(stream)
            },
            onUplinkDrop: (totalDrops) => {
              engvoXaiUplinkDropCountRef.current = totalDrops
              if (process.env.NODE_ENV !== 'production') {
                console.info('[engvo] uplink-drop', { totalDrops })
              }
            },
          },
        })
        engvoXaiTransportRef.current = transport
        // Early mic: buffer PCM while create_response is still false.
        transport.startMicCapture()`,
  'uplink-drop'
)

// End-call DEV summary
s = mustReplace(
  s,
  `  const finishEngvoCall = useCallback(() => {
    engvoRedialWithoutWelcomeRef.current = true
    cleanupEngvoRuntime({ markIgnoredCurrent: true })`,
  `  const finishEngvoCall = useCallback(() => {
    if (process.env.NODE_ENV !== 'production' && engvoActiveProviderRef.current === 'xai') {
      const drops =
        engvoXaiTransportRef.current?.getUplinkDropCount?.() ?? engvoXaiUplinkDropCountRef.current
      console.info('[engvo] call-end uplink-drops', { drops })
    }
    engvoRedialWithoutWelcomeRef.current = true
    cleanupEngvoRuntime({ markIgnoredCurrent: true })`,
  'end-call-log'
)

// handleEngvo deps: engvoRemotePlaybackActive for echo gate
s = mustReplace(
  s,
  `      stopEngvoPlayback,
      engvoCallPhase,
    ]
  )

  const startEngvoCall = useCallback(async () => {`,
  `      stopEngvoPlayback,
      engvoCallPhase,
      engvoRemotePlaybackActive,
      buildCurrentXaiSessionUpdate,
    ]
  )

  const startEngvoCall = useCallback(async () => {`,
  'handler-deps'
)

fs.writeFileSync(FILE, s, 'utf8')
const failures = checkCyrillicIntegrity({ root: ROOT, files: [FILE] })
if (failures.length) {
  console.error(failures)
  process.exit(1)
}
console.log('pass B OK')
