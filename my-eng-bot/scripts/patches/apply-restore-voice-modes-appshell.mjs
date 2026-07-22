/**
 * Apply restore voice-call modes wiring to AppShell (UTF-8 safe).
 * Run: node scripts/patches/apply-restore-voice-modes-appshell.mjs
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

s = mustReplace(
  s,
  `import {
  buildEngvoContinuationResponseInstructions,
  buildEngvoFirstTurnResponseInstructions,
  buildEngvoTeacherDrillReclaimResponseInstructions,
} from '@/lib/engvo/instructions'
import { isIncompleteTeacherAssistantTurn } from '@/lib/engvo/teacherDrillCompleteness'
import { extractTeacherCallRepeatPrompt } from '@/lib/engvo/teacherRepeatAntiLoop'`,
  `import {
  buildEngvoContinuationResponseInstructions,
  buildEngvoFirstTurnResponseInstructions,
  buildEngvoFreeCallLengthReclaimResponseInstructions,
  buildEngvoTeacherDrillReclaimResponseInstructions,
} from '@/lib/engvo/instructions'
import { isTooLongFreeCallAssistantTurn } from '@/lib/engvo/freeCallTurnCompleteness'
import { isIncompleteTeacherAssistantTurn } from '@/lib/engvo/teacherDrillCompleteness'
import {
  resolveTeacherDetectPhase,
  shouldAllowTeacherHandoffReclaim,
} from '@/lib/engvo/teacherHandoffReclaim'
import { extractTeacherCallRepeatPrompt } from '@/lib/engvo/teacherRepeatAntiLoop'`,
  'imports'
)

s = mustReplace(
  s,
  `  const engvoTeacherReclaimUsedThisUserTurnRef = React.useRef(false)
  const engvoTeacherReclaimInFlightRef = React.useRef(false)
  const maybeReclaimTeacherDrillRef = React.useRef<(rawText: string) => boolean>(() => false)`,
  `  const engvoTeacherReclaimUsedThisUserTurnRef = React.useRef(false)
  const engvoTeacherReclaimAttemptsThisUserTurnRef = React.useRef(0)
  const engvoTeacherReclaimInFlightRef = React.useRef(false)
  const engvoFreeCallUserFinalCountRef = React.useRef(0)
  const engvoFreeCallReclaimUsedThisUserTurnRef = React.useRef(false)
  const engvoFreeCallReclaimInFlightRef = React.useRef(false)
  const maybeReclaimTeacherDrillRef = React.useRef<(rawText: string) => boolean>(() => false)
  const maybeReclaimFreeCallLengthRef = React.useRef<(rawText: string) => boolean>(() => false)`,
  'refs'
)

s = mustReplace(
  s,
  `    resetEngvoAssistantTurn()
    const reclaimStarted = maybeReclaimTeacherDrillRef.current(rawText)
    if (!reclaimStarted) {
      setEngvoCallPhase('listening')
    }
    setEngvoErrorText(null)
  }, [guardEngvoAssistantContent, markEngvoAssistantAheadOfPendingUserTranscript, resetEngvoAssistantTurn])`,
  `    resetEngvoAssistantTurn()
    const reclaimStarted =
      maybeReclaimTeacherDrillRef.current(rawText) ||
      maybeReclaimFreeCallLengthRef.current(rawText)
    if (!reclaimStarted) {
      setEngvoCallPhase('listening')
    }
    setEngvoErrorText(null)
  }, [guardEngvoAssistantContent, markEngvoAssistantAheadOfPendingUserTranscript, resetEngvoAssistantTurn])`,
  'maybeCommit reclaim dual'
)

s = mustReplace(
  s,
  `      resetEngvoAssistantTurn()
      const reclaimStarted = maybeReclaimTeacherDrillRef.current(rawText)
      if (!reclaimStarted) {
        setEngvoCallPhase('listening')
      }
      setEngvoErrorText(null)
      return reclaimStarted
    },
    [guardEngvoAssistantContent, markEngvoAssistantAheadOfPendingUserTranscript, resetEngvoAssistantTurn]
  )`,
  `      resetEngvoAssistantTurn()
      const reclaimStarted =
        maybeReclaimTeacherDrillRef.current(rawText) ||
        maybeReclaimFreeCallLengthRef.current(rawText)
      if (!reclaimStarted) {
        setEngvoCallPhase('listening')
      }
      setEngvoErrorText(null)
      return reclaimStarted
    },
    [guardEngvoAssistantContent, markEngvoAssistantAheadOfPendingUserTranscript, resetEngvoAssistantTurn]
  )`,
  'commitEngvoAssistantText reclaim dual'
)

const teacherReclaimOld = `  const maybeReclaimTeacherDrill = useCallback(
    (rawText: string): boolean => {
      if (engvoSessionKindRef.current !== 'teacher') return false

      const wasReclaimResponse = engvoTeacherReclaimInFlightRef.current
      if (wasReclaimResponse) {
        engvoTeacherReclaimInFlightRef.current = false
      }

      const result = isIncompleteTeacherAssistantTurn({
        text: rawText,
        phase: engvoTeacherPhaseRef.current,
        awaitingFirstDrill: engvoTeacherAwaitingFirstDrillRef.current,
      })

      if (result.isCompleteDrill) {
        engvoTeacherAwaitingFirstDrillRef.current = false
      }

      if (!result.incomplete) return false

      if (wasReclaimResponse || engvoTeacherReclaimUsedThisUserTurnRef.current) {
        console.info('[engvo] teacher-reclaim', {
          skip: 'reclaim_budget',
          reason: result.reason,
          preview: rawText.slice(0, 80),
        })
        return false
      }

      engvoTeacherReclaimUsedThisUserTurnRef.current = true
      engvoTeacherReclaimInFlightRef.current = true
      if (engvoActiveProviderRef.current === 'xai') {
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
      }
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
      })
      console.info('[engvo] teacher-reclaim', {
        reason: result.reason,
        preview: rawText.slice(0, 80),
        sent,
      })
      if (!sent) {
        engvoTeacherReclaimInFlightRef.current = false
        setEngvoCallPhase('listening')
        return false
      }
      return true
    },
    [engvoCefrLevel, engvoTeacherSentenceType, engvoTeacherTense, engvoSpeechSpeedPreset, engvoXaiVoice, sendEngvoRealtimeEvent]
  )
  maybeReclaimTeacherDrillRef.current = maybeReclaimTeacherDrill`

const teacherReclaimNew = `  const maybeReclaimTeacherDrill = useCallback(
    (rawText: string): boolean => {
      if (engvoSessionKindRef.current !== 'teacher') return false

      const wasReclaimResponse = engvoTeacherReclaimInFlightRef.current
      if (wasReclaimResponse) {
        engvoTeacherReclaimInFlightRef.current = false
      }

      const detectPhase = resolveTeacherDetectPhase({
        phase: engvoTeacherPhaseRef.current,
        userFinalCount: engvoTeacherUserFinalCountRef.current,
        awaitingFirstDrill: engvoTeacherAwaitingFirstDrillRef.current,
      })
      if (
        detectPhase === 'drill' &&
        engvoTeacherPhaseRef.current !== 'drill' &&
        engvoTeacherAwaitingFirstDrillRef.current
      ) {
        engvoTeacherPhaseRef.current = 'drill'
      }

      const result = isIncompleteTeacherAssistantTurn({
        text: rawText,
        phase: detectPhase,
        awaitingFirstDrill: engvoTeacherAwaitingFirstDrillRef.current,
      })

      if (result.isCompleteDrill) {
        engvoTeacherAwaitingFirstDrillRef.current = false
      }

      if (!result.incomplete) return false

      if (engvoTeacherUserFinalCountRef.current < 1) {
        console.info('[engvo] teacher-reclaim', {
          skip: 'greeting',
          reason: result.reason,
          preview: rawText.slice(0, 80),
        })
        return false
      }

      const allow = shouldAllowTeacherHandoffReclaim({
        userFinalCount: engvoTeacherUserFinalCountRef.current,
        awaitingFirstDrill: engvoTeacherAwaitingFirstDrillRef.current,
        attemptsThisUserTurn: engvoTeacherReclaimAttemptsThisUserTurnRef.current,
      })
      if (!allow) {
        console.info('[engvo] teacher-reclaim', {
          skip: engvoTeacherAwaitingFirstDrillRef.current ? 'reclaim_failed' : 'reclaim_budget',
          reason: result.reason,
          attempts: engvoTeacherReclaimAttemptsThisUserTurnRef.current,
          preview: rawText.slice(0, 80),
        })
        return false
      }

      engvoTeacherReclaimAttemptsThisUserTurnRef.current += 1
      engvoTeacherReclaimUsedThisUserTurnRef.current = true
      engvoTeacherReclaimInFlightRef.current = true
      if (engvoActiveProviderRef.current === 'xai') {
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
      }
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
      })
      console.info('[engvo] teacher-reclaim', {
        reason: result.reason,
        attempt: engvoTeacherReclaimAttemptsThisUserTurnRef.current,
        preview: rawText.slice(0, 80),
        sent,
      })
      if (!sent) {
        engvoTeacherReclaimInFlightRef.current = false
        setEngvoCallPhase('listening')
        return false
      }
      return true
    },
    [engvoCefrLevel, engvoTeacherSentenceType, engvoTeacherTense, engvoSpeechSpeedPreset, engvoXaiVoice, sendEngvoRealtimeEvent]
  )
  maybeReclaimTeacherDrillRef.current = maybeReclaimTeacherDrill

  const maybeReclaimFreeCallLength = useCallback(
    (rawText: string): boolean => {
      if (engvoSessionKindRef.current !== 'free_call') return false

      const wasReclaimResponse = engvoFreeCallReclaimInFlightRef.current
      if (wasReclaimResponse) {
        engvoFreeCallReclaimInFlightRef.current = false
      }

      const result = isTooLongFreeCallAssistantTurn({
        text: rawText,
        level: engvoCefrLevel,
        userFinalCount: engvoFreeCallUserFinalCountRef.current,
      })
      if (!result.tooLong) return false

      if (wasReclaimResponse || engvoFreeCallReclaimUsedThisUserTurnRef.current) {
        console.info('[engvo] free-reclaim', {
          skip: 'reclaim_budget',
          reason: result.reason,
          preview: rawText.slice(0, 80),
        })
        return false
      }

      engvoFreeCallReclaimUsedThisUserTurnRef.current = true
      engvoFreeCallReclaimInFlightRef.current = true
      if (engvoActiveProviderRef.current === 'xai') {
        engvoListenArmedRef.current = false
        sendEngvoRealtimeEvent(
          buildEngvoXaiClientSessionUpdate({
            voice: engvoXaiVoice,
            speed: clampEngvoRealtimeSpeed(engvoSpeechSpeedFromPreset(engvoSpeechSpeedPreset, 'xai'), 'xai'),
            kind: engvoSessionKindRef.current,
            createResponse: false,
          })
        )
      }
      setEngvoCallPhase('assistantPending')
      const sent = sendEngvoRealtimeEvent({
        type: 'response.create',
        response: {
          instructions: buildEngvoFreeCallLengthReclaimResponseInstructions({
            level: engvoCefrLevel,
          }),
        },
      })
      console.info('[engvo] free-reclaim', {
        reason: result.reason,
        preview: rawText.slice(0, 80),
        sent,
      })
      if (!sent) {
        engvoFreeCallReclaimInFlightRef.current = false
        setEngvoCallPhase('listening')
        return false
      }
      return true
    },
    [engvoCefrLevel, engvoSpeechSpeedPreset, engvoXaiVoice, sendEngvoRealtimeEvent]
  )
  maybeReclaimFreeCallLengthRef.current = maybeReclaimFreeCallLength`

s = mustReplace(s, teacherReclaimOld, teacherReclaimNew, 'teacher+free reclaim fns')

// Reset refs on endCall
s = mustReplace(
  s,
  `    engvoTeacherReclaimUsedThisUserTurnRef.current = false
    engvoTeacherReclaimInFlightRef.current = false
    engvoLastFinalUserTranscriptRef.current = ''
    setEngvoCallPhase('ended')`,
  `    engvoTeacherReclaimUsedThisUserTurnRef.current = false
    engvoTeacherReclaimAttemptsThisUserTurnRef.current = 0
    engvoTeacherReclaimInFlightRef.current = false
    engvoFreeCallUserFinalCountRef.current = 0
    engvoFreeCallReclaimUsedThisUserTurnRef.current = false
    engvoFreeCallReclaimInFlightRef.current = false
    engvoLastFinalUserTranscriptRef.current = ''
    setEngvoCallPhase('ended')`,
  'endCall reset'
)

// response.created coalesce + ignore — exempt free reclaim too
s = mustReplace(
  s,
  `        if (
          !engvoTeacherReclaimInFlightRef.current &&
          coalescedRecently &&
          responseId &&
          responseId !== engvoAssistantResponseIdRef.current &&
          (hasActiveAssistantTurn || engvoGotAssistantForCurrentUserTurnRef.current)
        ) {
          engvoIgnoredResponseIdsRef.current.add(responseId)
          sendEngvoRealtimeEvent({ type: 'response.cancel' })
          return
        }
        if (hasActiveAssistantTurn && responseId && responseId !== activeResponseId) {
          engvoIgnoredResponseIdsRef.current.add(responseId)
          return
        }`,
  `        const reclaimInFlight =
          engvoTeacherReclaimInFlightRef.current || engvoFreeCallReclaimInFlightRef.current
        if (
          !reclaimInFlight &&
          coalescedRecently &&
          responseId &&
          responseId !== engvoAssistantResponseIdRef.current &&
          (hasActiveAssistantTurn || engvoGotAssistantForCurrentUserTurnRef.current)
        ) {
          engvoIgnoredResponseIdsRef.current.add(responseId)
          sendEngvoRealtimeEvent({ type: 'response.cancel' })
          return
        }
        if (
          !reclaimInFlight &&
          hasActiveAssistantTurn &&
          responseId &&
          responseId !== activeResponseId
        ) {
          engvoIgnoredResponseIdsRef.current.add(responseId)
          return
        }`,
  'response.created reclaim exempt'
)

// speech_started clears free reclaim too
s = mustReplace(
  s,
  `        if (engvoTeacherReclaimInFlightRef.current) {
          engvoTeacherReclaimInFlightRef.current = false
        }`,
  `        if (engvoTeacherReclaimInFlightRef.current) {
          engvoTeacherReclaimInFlightRef.current = false
        }
        if (engvoFreeCallReclaimInFlightRef.current) {
          engvoFreeCallReclaimInFlightRef.current = false
        }`,
  'speech_started clear free reclaim'
)

// arm checks — also free reclaim in flight
s = mustReplace(
  s,
  `          !engvoTeacherReclaimInFlightRef.current
            ) {
              armEngvoXaiListen()
            }
          }, ENGVO_RESPONSE_DONE_FALLBACK_MS)
        }
        return
      }

      if (isEngvoOutputAudioTranscriptDeltaEvent(parsed.type)) {`,
  `          !engvoTeacherReclaimInFlightRef.current &&
              !engvoFreeCallReclaimInFlightRef.current
            ) {
              armEngvoXaiListen()
            }
          }, ENGVO_RESPONSE_DONE_FALLBACK_MS)
        }
        return
      }

      if (isEngvoOutputAudioTranscriptDeltaEvent(parsed.type)) {`,
  'arm after text fallback'
)

// Find second similar arm block for audio transcript done - need to be careful
// And response.done arm

s = mustReplace(
  s,
  `        const reclaimStarted = commitEngvoAssistantText(fallbackText, responseId)
        if (
          engvoActiveProviderRef.current === 'xai' &&
          !reclaimStarted &&
          !engvoTeacherReclaimInFlightRef.current
        ) {
          armEngvoXaiListen()
        }
      }
    },`,
  `        const reclaimStarted = commitEngvoAssistantText(fallbackText, responseId)
        if (
          engvoActiveProviderRef.current === 'xai' &&
          !reclaimStarted &&
          !engvoTeacherReclaimInFlightRef.current &&
          !engvoFreeCallReclaimInFlightRef.current
        ) {
          armEngvoXaiListen()
        }
      }
    },`,
  'response.done arm'
)

// Unarmed user bubble: show lexical instead of silent drop
s = mustReplace(
  s,
  `          const itemId = parsed.item_id
          if (engvoActiveProviderRef.current === 'xai' && !engvoListenArmedRef.current) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            return
          }
          if (isPartialUserTranscriptStatus((parsed as { status?: unknown }).status)) {`,
  `          const itemId = parsed.item_id
          const isXaiUnarmed =
            engvoActiveProviderRef.current === 'xai' && !engvoListenArmedRef.current
          if (isPartialUserTranscriptStatus((parsed as { status?: unknown }).status)) {`,
  'remove early unarmed return'
)

// After we have transcript and filters, before insert — handle unarmed show-only.
// Find the block after shouldShow check and before engvoCommittedUserItemIds add for new insert.
// Actually the flow continues after removing early return. We need to skip phase machine when unarmed
// but still show bubble. Best place: after noise/echo/hallucination/shouldShow filters, when about to insert.

s = mustReplace(
  s,
  `          if (transcript && !shouldShowEngvoVoiceUserTranscript(transcript, isXai ? transcriptKind : 'free_call')) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            restorePhaseAfterNoiseReject('listening')
            return
          }
          engvoCommittedUserItemIdsRef.current.add(itemId)
          setEngvoCallPhase('userFinalizing')
          if (transcript) {`,
  `          if (transcript && !shouldShowEngvoVoiceUserTranscript(transcript, isXai ? transcriptKind : 'free_call')) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            restorePhaseAfterNoiseReject('listening')
            return
          }
          if (isXaiUnarmed) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            if (transcript) {
              console.info('[engvo] unarmed-user-bubble', { preview: transcript.slice(0, 80) })
              setEngvoUserInterimText('')
              setMessages((prev) =>
                insertEngvoUserMessage(prev, transcript, false)
              )
            }
            restorePhaseAfterNoiseReject('listening')
            return
          }
          engvoCommittedUserItemIdsRef.current.add(itemId)
          setEngvoCallPhase('userFinalizing')
          if (transcript) {`,
  'unarmed show bubble'
)

// Reset attempts on user final (teacher) and free_call user final count
s = mustReplace(
  s,
  `              if (engvoSessionKindRef.current === 'teacher') {
                engvoTeacherUserFinalCountRef.current += 1
                engvoTeacherReclaimUsedThisUserTurnRef.current = false
                if (
                  engvoTeacherPhaseRef.current === 'topic_choice' &&
                  engvoTeacherUserFinalCountRef.current >= 1
                ) {`,
  `              if (engvoSessionKindRef.current === 'free_call') {
                engvoFreeCallUserFinalCountRef.current += 1
                engvoFreeCallReclaimUsedThisUserTurnRef.current = false
              }
              if (engvoSessionKindRef.current === 'teacher') {
                engvoTeacherUserFinalCountRef.current += 1
                engvoTeacherReclaimUsedThisUserTurnRef.current = false
                engvoTeacherReclaimAttemptsThisUserTurnRef.current = 0
                if (
                  engvoTeacherPhaseRef.current === 'topic_choice' &&
                  engvoTeacherUserFinalCountRef.current >= 1
                ) {`,
  'user final counters'
)

// startEngvoCall reset - find similar block
const startResetPatterns = [
  [
    `    engvoTeacherReclaimUsedThisUserTurnRef.current = false
    engvoTeacherReclaimInFlightRef.current = false`,
    `    engvoTeacherReclaimUsedThisUserTurnRef.current = false
    engvoTeacherReclaimAttemptsThisUserTurnRef.current = 0
    engvoTeacherReclaimInFlightRef.current = false
    engvoFreeCallUserFinalCountRef.current = 0
    engvoFreeCallReclaimUsedThisUserTurnRef.current = false
    engvoFreeCallReclaimInFlightRef.current = false`,
  ],
]

let startResetCount = 0
for (const [from, to] of startResetPatterns) {
  while (s.includes(from)) {
    s = s.replace(from, to)
    startResetCount += 1
    if (startResetCount > 8) break
  }
}
if (startResetCount < 1) {
  throw new Error('Failed to reset reclaim refs on start/kind paths')
}
console.info('reset-ref replacements:', startResetCount)

// Fix remaining armEngvoXaiListen guards that only check teacher reclaim
// Use replace_all carefully for the pattern in fallback timeouts
const armGuardFrom = `!engvoTeacherReclaimInFlightRef.current
            ) {
              armEngvoXaiListen()`
const armGuardTo = `!engvoTeacherReclaimInFlightRef.current &&
              !engvoFreeCallReclaimInFlightRef.current
            ) {
              armEngvoXaiListen()`
let armGuardCount = 0
while (s.includes(armGuardFrom)) {
  s = s.replace(armGuardFrom, armGuardTo)
  armGuardCount += 1
  if (armGuardCount > 10) break
}
console.info('arm-guard replacements:', armGuardCount)

fs.writeFileSync(FILE, s, 'utf8')
const failures = checkCyrillicIntegrity({ root: ROOT, files: [FILE] })
if (failures.length > 0) {
  console.error('cyrillic check failed')
  for (const { relPath, violations } of failures) {
    for (const v of violations) {
      console.error(`  ${relPath}:L${v.line} [${v.type}] ${v.snippet}`)
    }
  }
  process.exit(1)
}
console.info('apply-restore-voice-modes-appshell: ok')
