/**
 * Pass C: finish gaps after partial AppShell hear wiring (idempotent).
 * Run: node scripts/patches/apply-engvo-xai-hear-appshell-c.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCyrillicIntegrity } from '../check-cyrillic-integrity.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const FILE = path.join(ROOT, 'components/app/AppShell.tsx')

function tryReplace(content, from, to, label) {
  if (!content.includes(from)) {
    console.log(`skip [${label}] (already applied or missing)`)
    return content
  }
  console.log(`apply [${label}]`)
  return content.replace(from, to)
}

let s = fs.readFileSync(FILE, 'utf8')

s = tryReplace(
  s,
  `      markEngvoAssistantAheadOfPendingUserTranscript()
      engvoLastMeaningfulActivityAtRef.current = Date.now()
      engvoGotAssistantForCurrentUserTurnRef.current = true
      setMessages((prev) => {
        const withoutDial = prev.filter((m) => !m.engvoServiceLine)`,
  `      markEngvoAssistantAheadOfPendingUserTranscript()
      engvoLastMeaningfulActivityAtRef.current = Date.now()
      engvoGotAssistantForCurrentUserTurnRef.current = true
      engvoLastAssistantTextForKeytermsRef.current = cleanText
      setMessages((prev) => {
        const withoutDial = prev.filter((m) => !m.engvoServiceLine)`,
  'keyterms-commit'
)

s = tryReplace(
  s,
  `      engvoTeacherReclaimUsedThisUserTurnRef.current = true
      engvoTeacherReclaimInFlightRef.current = true
      engvoListenArmedRef.current = false
      sendEngvoRealtimeEvent(
        buildEngvoXaiClientSessionUpdate({
          voice: engvoXaiVoice,
          speed: clampEngvoRealtimeSpeed(engvoSpeechSpeedFromPreset(engvoSpeechSpeedPreset, 'xai'), 'xai'),
          kind: engvoSessionKindRef.current,
          teacherPhase: engvoTeacherPhaseRef.current,
          createResponse: false,
        })
      )
      setEngvoCallPhase('assistantPending')`,
  `      engvoTeacherReclaimUsedThisUserTurnRef.current = true
      engvoTeacherReclaimInFlightRef.current = true
      if (engvoActiveProviderRef.current === 'xai') {
        engvoListenArmedRef.current = false
        sendEngvoRealtimeEvent(
          buildEngvoXaiClientSessionUpdate({
            voice: engvoXaiVoice,
            speed: clampEngvoRealtimeSpeed(
              engvoSpeechSpeedFromPreset(engvoSpeechSpeedPreset, 'xai'),
              'xai'
            ),
            kind: engvoSessionKindRef.current,
            teacherPhase: engvoTeacherPhaseRef.current,
            createResponse: false,
          })
        )
      }
      setEngvoCallPhase('assistantPending')`,
  'reclaim-xai-only'
)

s = tryReplace(
  s,
  `  const armEngvoXaiListen = useCallback(() => {
    if (engvoActiveProviderRef.current !== 'xai') return
    sendEngvoRealtimeEvent({ type: 'input_audio_buffer.clear' })`,
  `  const armEngvoXaiListen = useCallback(() => {
    if (engvoActiveProviderRef.current !== 'xai') return
    engvoXaiTransportRef.current?.startMicCapture()
    sendEngvoRealtimeEvent({ type: 'input_audio_buffer.clear' })`,
  'arm-mic'
)

s = tryReplace(
  s,
  `      if (provider === 'xai') {
        const voice = (payload.voice as EngvoXaiCallVoice | undefined) ?? engvoXaiVoice
        return sendEngvoRealtimeEvent(
          buildEngvoXaiClientSessionUpdate({
            ...(instructions ? { instructions } : {}),
            voice,
            speed: speechSpeed,
            kind: engvoSessionKind,
            teacherPhase: engvoTeacherPhaseRef.current,
            createResponse: engvoListenArmedRef.current,
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
  'session-keyterms'
)

s = tryReplace(
  s,
  `        } else if (
          parsed.type !== 'conversation.created' &&
          parsed.type !== 'session.created'
        ) {
          engvoXaiTransportRef.current?.startMicCapture()
          armEngvoXaiListen()
        }
        return
      }

      if (parsed.type === 'input_audio_buffer.speech_started') {`,
  `        } else if (
          parsed.type !== 'conversation.created' &&
          parsed.type !== 'session.created'
        ) {
          engvoXaiTransportRef.current?.startMicCapture()
        }
        return
      }

      if (parsed.type === 'input_audio_buffer.speech_started') {`,
  'no-early-arm'
)

s = tryReplace(
  s,
  `              const sent = sendEngvoRealtimeEvent(
                buildEngvoXaiClientSessionUpdate({
                  instructions: buildEngvoLiveInstructions(speechSpeed),
                  voice: callXaiVoice,
                  speed: speechSpeed,
                  kind: engvoSessionKind,
                  teacherPhase: engvoTeacherPhaseRef.current,
                  createResponse: false,
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
  'initial-keyterms'
)

s = tryReplace(
  s,
  `        })
        engvoXaiTransportRef.current = transport
        clearEngvoTimeout(engvoPcConnectTimeoutRef)
        engvoPcConnectTimeoutRef.current = window.setTimeout(() => {
          setEngvoSessionError(ENGVO_XAI_WS_USER_MESSAGE)
        }, ENGVO_CONNECTION_TIMEOUT_MS)
        return
      }

      const peerConnection = new RTCPeerConnection({`,
  `        })
        engvoXaiTransportRef.current = transport
        // Early mic while create_response stays false until arm on response.done.
        transport.startMicCapture()
        clearEngvoTimeout(engvoPcConnectTimeoutRef)
        engvoPcConnectTimeoutRef.current = window.setTimeout(() => {
          setEngvoSessionError(ENGVO_XAI_WS_USER_MESSAGE)
        }, ENGVO_CONNECTION_TIMEOUT_MS)
        return
      }

      const peerConnection = new RTCPeerConnection({`,
  'early-mic-connect'
)

s = tryReplace(
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

fs.writeFileSync(FILE, s, 'utf8')
const failures = checkCyrillicIntegrity({ root: ROOT, files: [FILE] })
if (failures.length) {
  console.error(failures)
  process.exit(1)
}
console.log('pass C OK')
