/**
 * Apply Engvo xAI hear fixes to AppShell.tsx (UTF-8 safe) — pass A core.
 * Run: node scripts/patches/apply-engvo-xai-hear-appshell.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCyrillicIntegrity } from '../check-cyrillic-integrity.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const FILE = path.join(ROOT, 'components/app/AppShell.tsx')

function mustReplace(content, from, to, label) {
  if (!content.includes(from)) {
    throw new Error(`Missing block [${label}]: ${JSON.stringify(from.slice(0, 140))}`)
  }
  return content.replace(from, to)
}

let s = fs.readFileSync(FILE, 'utf8')

// Ensure clean start from git if previous partial run
if (!s.includes('ENGVO_XAI_FORCE_COMMIT_AFTER_SPEECH_STOPPED_MS')) {
  console.log('Force-commit imports already gone — assuming prior partial; abort and restore first.')
  process.exit(2)
}

s = mustReplace(
  s,
  `  ENGVO_INTERRUPT_DEBOUNCE_MS,
  ENGVO_XAI_FORCE_COMMIT_AFTER_SPEECH_STOPPED_MS,
  ENGVO_XAI_FORCE_COMMIT_MAX_UTTERANCE_MS,
  ENGVO_XAI_USER_COALESCE_WINDOW_MS,`,
  `  ENGVO_INTERRUPT_DEBOUNCE_MS,
  ENGVO_XAI_USER_COALESCE_WINDOW_MS,`,
  'imports-force'
)

s = mustReplace(
  s,
  `import { isIncompleteTeacherAssistantTurn } from '@/lib/engvo/teacherDrillCompleteness'
import { buildEngvoRealtimeInstructionsClient } from '@/lib/engvo/instructionsClient'`,
  `import { isIncompleteTeacherAssistantTurn } from '@/lib/engvo/teacherDrillCompleteness'
import { extractTeacherCallRepeatPrompt } from '@/lib/engvo/teacherRepeatAntiLoop'
import { buildEngvoRealtimeInstructionsClient } from '@/lib/engvo/instructionsClient'`,
  'import-extract'
)

s = mustReplace(
  s,
  `import { engvoVoiceTranscriptIsLikelyNoise, shouldShowEngvoVoiceUserTranscript } from '@/lib/engvo/transcriptGuard'`,
  `import {
  engvoVoiceTranscriptIsLikelyNoise,
  engvoVoiceTranscriptIsLikelyNoiseForKind,
  shouldShowEngvoVoiceUserTranscript,
} from '@/lib/engvo/transcriptGuard'
import {
  buildEngvoTeacherKeyterms,
  getEngvoXaiInterruptDebounceMs,
} from '@/lib/engvo/xaiListenPolicy'`,
  'import-noise'
)

s = mustReplace(
  s,
  `  const engvoForceCommitTimeoutRef = React.useRef<number | null>(null)
  const engvoForceCommitArmedRef = React.useRef(false)
  const engvoLastMeaningfulActivityAtRef = React.useRef<number>(0)`,
  `  const engvoListenArmedRef = React.useRef(false)
  const engvoXaiUplinkDropCountRef = React.useRef(0)
  const engvoLastAssistantTextForKeytermsRef = React.useRef('')
  const engvoLastMeaningfulActivityAtRef = React.useRef<number>(0)`,
  'refs'
)

s = mustReplace(
  s,
  `  const clearEngvoForceCommitTimeout = useCallback(() => {
    clearEngvoTimeout(engvoForceCommitTimeoutRef)
  }, [clearEngvoTimeout])

  const markEngvoMeaningfulActivity = useCallback(() => {`,
  `  const markEngvoMeaningfulActivity = useCallback(() => {`,
  'rm-clear-fn'
)

s = mustReplace(
  s,
  `      clearEngvoForceCommitTimeout()
      engvoForceCommitArmedRef.current = false
      engvoLastMeaningfulActivityAtRef.current = 0`,
  `      engvoListenArmedRef.current = false
      engvoXaiUplinkDropCountRef.current = 0
      engvoLastMeaningfulActivityAtRef.current = 0`,
  'cleanup'
)

s = mustReplace(
  s,
  `  const scheduleEngvoForceCommit = useCallback(
    (delayMs: number) => {
      if (engvoActiveProviderRef.current !== 'xai') return
      if (engvoForceCommitArmedRef.current) return
      clearEngvoForceCommitTimeout()
      engvoForceCommitTimeoutRef.current = window.setTimeout(() => {
        engvoForceCommitTimeoutRef.current = null
        if (engvoActiveProviderRef.current !== 'xai') return
        if (engvoForceCommitArmedRef.current) return
        const hasActiveAssistant = hasActiveEngvoAssistantResponse({
          responseId: engvoAssistantResponseIdRef.current,
          responseDone: engvoAssistantResponseDoneRef.current,
        })
        if (hasActiveAssistant) return
        engvoForceCommitArmedRef.current = true
        sendEngvoRealtimeEvent({ type: 'input_audio_buffer.commit' })
      }, delayMs)
    },
    [clearEngvoForceCommitTimeout, sendEngvoRealtimeEvent]
  )

  const updateEngvoRealtimeSession = useCallback(`,
  `  const buildCurrentXaiSessionUpdate = useCallback(
    (options?: { createResponse?: boolean; keyterms?: string[] }) => {
      const speechSpeed = clampEngvoRealtimeSpeed(
        engvoSpeechSpeedFromPreset(engvoSpeechSpeedPreset, 'xai'),
        'xai'
      )
      const createResponse = options?.createResponse ?? engvoListenArmedRef.current
      return buildEngvoXaiClientSessionUpdate({
        voice: engvoXaiVoice,
        speed: speechSpeed,
        kind: engvoSessionKindRef.current,
        teacherPhase: engvoTeacherPhaseRef.current,
        createResponse,
        ...(options?.keyterms && options.keyterms.length > 0
          ? { keyterms: options.keyterms }
          : {}),
      })
    },
    [engvoSpeechSpeedPreset, engvoXaiVoice]
  )

  const armEngvoXaiListen = useCallback(() => {
    if (engvoActiveProviderRef.current !== 'xai') return
    sendEngvoRealtimeEvent({ type: 'input_audio_buffer.clear' })
    const repeat = extractTeacherCallRepeatPrompt(engvoLastAssistantTextForKeytermsRef.current)
    const keyterms =
      engvoSessionKindRef.current === 'teacher' && engvoTeacherPhaseRef.current === 'drill'
        ? buildEngvoTeacherKeyterms({ canonicalEnglish: repeat?.repeatText ?? null })
        : undefined
    sendEngvoRealtimeEvent(buildCurrentXaiSessionUpdate({ createResponse: true, keyterms }))
    engvoListenArmedRef.current = true
    console.info('[engvo] listen-armed', { drops: engvoXaiUplinkDropCountRef.current })
  }, [buildCurrentXaiSessionUpdate, sendEngvoRealtimeEvent])

  const disarmEngvoXaiListen = useCallback(() => {
    if (engvoActiveProviderRef.current !== 'xai') return
    engvoListenArmedRef.current = false
    sendEngvoRealtimeEvent(buildCurrentXaiSessionUpdate({ createResponse: false }))
    console.info('[engvo] listen-disarmed')
  }, [buildCurrentXaiSessionUpdate, sendEngvoRealtimeEvent])

  const updateEngvoRealtimeSession = useCallback(`,
  'arm-helpers'
)

s = mustReplace(
  s,
  `      if (parsed.type === 'input_audio_buffer.speech_started') {
        if (engvoTeacherReclaimInFlightRef.current) {
          engvoTeacherReclaimInFlightRef.current = false
        }
        const hasActiveAssistantResponse = hasActiveEngvoAssistantResponse({
          responseId: engvoAssistantResponseIdRef.current,
          responseDone: engvoAssistantResponseDoneRef.current,
        })
        const debounceInterrupt = shouldDebounceEngvoBargeIn({
          callPhase: engvoCallPhase,
          hasActiveAssistantResponse,
        })
        clearEngvoTimeout(engvoInterruptDebounceTimeoutRef)
        engvoForceCommitArmedRef.current = false
        scheduleEngvoForceCommit(ENGVO_XAI_FORCE_COMMIT_MAX_UTTERANCE_MS)
        if (debounceInterrupt) {
          markEngvoInterruptDebouncePending(engvoInterruptDebounceStateRef.current)
          engvoInterruptDebounceTimeoutRef.current = window.setTimeout(() => {
            engvoInterruptDebounceTimeoutRef.current = null
            markEngvoInterruptCommitted(engvoInterruptDebounceStateRef.current)
            stopEngvoPlayback(true)
            setEngvoCallPhase('listening')
          }, ENGVO_INTERRUPT_DEBOUNCE_MS)
        } else {
          resetEngvoInterruptDebounceState(engvoInterruptDebounceStateRef.current)
          stopEngvoPlayback(true)
          setEngvoCallPhase('listening')
        }
        return
      }`,
  `      if (parsed.type === 'input_audio_buffer.speech_started') {
        if (engvoActiveProviderRef.current === 'xai' && !engvoListenArmedRef.current) {
          return
        }
        if (engvoTeacherReclaimInFlightRef.current) {
          engvoTeacherReclaimInFlightRef.current = false
        }
        const hasActiveAssistantResponse = hasActiveEngvoAssistantResponse({
          responseId: engvoAssistantResponseIdRef.current,
          responseDone: engvoAssistantResponseDoneRef.current,
        })
        const debounceInterrupt = shouldDebounceEngvoBargeIn({
          callPhase: engvoCallPhase,
          hasActiveAssistantResponse,
        })
        clearEngvoTimeout(engvoInterruptDebounceTimeoutRef)
        const interruptMs =
          engvoActiveProviderRef.current === 'xai'
            ? getEngvoXaiInterruptDebounceMs(engvoSessionKindRef.current)
            : ENGVO_INTERRUPT_DEBOUNCE_MS
        if (debounceInterrupt) {
          markEngvoInterruptDebouncePending(engvoInterruptDebounceStateRef.current)
          engvoInterruptDebounceTimeoutRef.current = window.setTimeout(() => {
            engvoInterruptDebounceTimeoutRef.current = null
            markEngvoInterruptCommitted(engvoInterruptDebounceStateRef.current)
            stopEngvoPlayback(true)
            setEngvoCallPhase('listening')
          }, interruptMs)
        } else {
          resetEngvoInterruptDebounceState(engvoInterruptDebounceStateRef.current)
          stopEngvoPlayback(true)
          setEngvoCallPhase('listening')
        }
        return
      }`,
  'speech-started'
)

s = mustReplace(
  s,
  `      if (parsed.type === 'input_audio_buffer.speech_stopped') {
        clearEngvoTimeout(engvoInterruptDebounceTimeoutRef)
        if (cancelEngvoPendingInterrupt(engvoInterruptDebounceStateRef.current)) {
          return
        }
        scheduleEngvoForceCommit(ENGVO_XAI_FORCE_COMMIT_AFTER_SPEECH_STOPPED_MS)
        setEngvoCallPhase('userFinalizing')
        return
      }`,
  `      if (parsed.type === 'input_audio_buffer.speech_stopped') {
        if (engvoActiveProviderRef.current === 'xai' && !engvoListenArmedRef.current) {
          return
        }
        clearEngvoTimeout(engvoInterruptDebounceTimeoutRef)
        if (cancelEngvoPendingInterrupt(engvoInterruptDebounceStateRef.current)) {
          return
        }
        setEngvoCallPhase('userFinalizing')
        return
      }`,
  'speech-stopped'
)

// Remove remaining force-commit crumbs
s = s.replace(/\s*clearEngvoForceCommitTimeout\(\)\n/g, '\n')
s = s.replace(/\s*engvoForceCommitArmedRef\.current = true\n/g, '\n')
s = s.replace(/\s*engvoForceCommitArmedRef\.current = false\n/g, '\n')
s = s.replace(/\s*clearEngvoForceCommitTimeout,?\n/g, '\n')
s = s.replace(/\s*scheduleEngvoForceCommit,?\n/g, '\n')

fs.writeFileSync(FILE, s, 'utf8')
const failures = checkCyrillicIntegrity({ root: ROOT, files: [FILE] })
if (failures.length) {
  console.error(failures)
  process.exit(1)
}
console.log('pass A OK')
