/**
 * UTF-8 safe AppShell wire for teacher ERROR micro-reason patch + audio-only reclaim.
 * Usage: node scripts/patches/apply-teacher-micro-reason-appshell.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCyrillicIntegrity } from '../check-cyrillic-integrity.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const file = path.join(ROOT, 'components/app/AppShell.tsx')

function apply(content, from, to) {
  if (!content.includes(from)) {
    throw new Error(`Missing block: ${from.slice(0, 140).replace(/\n/g, '\\n')}`)
  }
  if (content.includes(to) && to.length > 40) {
    // idempotent-ish: allow re-run if already applied for this chunk
  }
  return content.replace(from, to)
}

let content = fs.readFileSync(file, 'utf8')

content = apply(
  content,
  `  buildEngvoTeacherAntiLoopReclaimResponseInstructions,
  buildEngvoTeacherDrillReclaimResponseInstructions,
  buildEngvoTeacherDuplicateDrillReclaimResponseInstructions,
  buildEngvoTeacherRussianEchoReclaimResponseInstructions,
} from '@/lib/engvo/instructions'`,
  `  buildEngvoTeacherAntiLoopReclaimResponseInstructions,
  buildEngvoTeacherDrillReclaimResponseInstructions,
  buildEngvoTeacherDuplicateDrillReclaimResponseInstructions,
  buildEngvoTeacherMicroReasonReclaimResponseInstructions,
  buildEngvoTeacherRussianEchoReclaimResponseInstructions,
} from '@/lib/engvo/instructions'
import { ensureTeacherErrorMicroReason } from '@/lib/engvo/teacherErrorMicroReason'`
)

content = apply(
  content,
  `  const engvoTeacherReclaimUsedThisUserTurnRef = React.useRef(false)
  const engvoTeacherReclaimInFlightRef = React.useRef(false)
  const engvoTeacherDrillProgressRef = React.useRef(createTeacherDrillProgressState())
  const engvoTeacherErrorRepeatGateRef = React.useRef<TeacherErrorRepeatGateState>(
    createTeacherErrorRepeatGateState()
  )
  const maybeReclaimTeacherAntiLoopRef = React.useRef<() => boolean>(() => false)`,
  `  const engvoTeacherReclaimUsedThisUserTurnRef = React.useRef(false)
  const engvoTeacherReclaimInFlightRef = React.useRef(false)
  const engvoTeacherMicroReasonAudioOnlyRef = React.useRef(false)
  const engvoTeacherDrillProgressRef = React.useRef(createTeacherDrillProgressState())
  const engvoTeacherErrorRepeatGateRef = React.useRef<TeacherErrorRepeatGateState>(
    createTeacherErrorRepeatGateState()
  )
  const maybeReclaimTeacherAntiLoopRef = React.useRef<() => boolean>(() => false)
  const maybeReclaimTeacherMicroReasonRef = React.useRef<(contrastLine: string) => boolean>(
    () => false
  )`
)

content = apply(
  content,
  `  const commitEngvoAssistantText = useCallback(
    (text: string, responseId?: string | null): boolean => {
      const rawText = prepareEngvoAssistantRawText(text)
      let cleanText = guardEngvoAssistantContent(rawText)
      if (!cleanText) return false
      const id = responseId ?? engvoAssistantResponseIdRef.current
      if (id) {
        if (engvoCommittedResponseIdsRef.current.has(id)) return false
        engvoCommittedResponseIdsRef.current.add(id)
      }

      let errorGateBlocked = false
      let shouldAntiLoopReclaim = false
      if (
        engvoSessionKindRef.current === 'teacher' &&
        engvoTeacherPhaseRef.current === 'drill'
      ) {
        const policy = applyTeacherErrorRepeatGate(
          engvoTeacherErrorRepeatGateRef.current,
          rawText || cleanText
        )
        engvoTeacherErrorRepeatGateRef.current = policy.state
        if (policy.armed || policy.blocked) {
          console.info('[engvo] teacher-error-gate', {
            action: policy.blocked ? 'block' : 'arm',
            preview: (rawText || cleanText).slice(0, 80),
          })
        }
        if (policy.blocked) {
          errorGateBlocked = true
          shouldAntiLoopReclaim = policy.shouldAntiLoopReclaim
          const strippedGuarded = guardEngvoAssistantContent(policy.displayText)
          cleanText = strippedGuarded
        }
      }

      let teacherMatchAttach: ReturnType<typeof resolveTeacherMatchAttach> = null
      if (
        engvoSessionKindRef.current === 'teacher' &&
        engvoTeacherPhaseRef.current === 'drill' &&
        !errorGateBlocked
      ) {
        const extracted = extractTeacherCorrection(rawText || cleanText)
        const userText = engvoLastFinalUserTranscriptRef.current.trim()
        if (extracted.corrected && userText) {
          recordTeacherCorrectionSignal({
            userText,
            corrected: extracted.corrected,
          })
          pushCallReviewBufferItem(
            {
              utteranceHash: hashUtterance(userText),
              original: userText,
              correct: extracted.corrected.trim(),
              teacherEtalon: true,
              reviewTopics: [],
              lessonId: null,
              sourceNote: null,
            },
            callReviewEpochRef.current
          )
        }
        teacherMatchAttach = resolveTeacherMatchAttach({
          assistantRawText: rawText || cleanText,
          userText,
        })
      }`,
  `  const commitEngvoAssistantText = useCallback(
    (text: string, responseId?: string | null): boolean => {
      const rawText = prepareEngvoAssistantRawText(text)
      let cleanText = guardEngvoAssistantContent(rawText)
      if (!cleanText) return false
      const id = responseId ?? engvoAssistantResponseIdRef.current
      if (id) {
        if (engvoCommittedResponseIdsRef.current.has(id)) return false
        engvoCommittedResponseIdsRef.current.add(id)
      }

      if (engvoTeacherMicroReasonAudioOnlyRef.current) {
        engvoTeacherMicroReasonAudioOnlyRef.current = false
        engvoTeacherReclaimInFlightRef.current = false
        console.info('[engvo] teacher-reclaim', {
          reason: 'micro_reason',
          audioOnly: true,
          preview: cleanText.slice(0, 80),
        })
        resetEngvoAssistantTurn()
        setEngvoCallPhase('listening')
        setEngvoErrorText(null)
        return false
      }

      let errorGateBlocked = false
      let shouldAntiLoopReclaim = false
      let microReasonContrastLine: string | null = null
      if (
        engvoSessionKindRef.current === 'teacher' &&
        engvoTeacherPhaseRef.current === 'drill'
      ) {
        const policy = applyTeacherErrorRepeatGate(
          engvoTeacherErrorRepeatGateRef.current,
          rawText || cleanText
        )
        engvoTeacherErrorRepeatGateRef.current = policy.state
        if (policy.armed || policy.blocked) {
          console.info('[engvo] teacher-error-gate', {
            action: policy.blocked ? 'block' : 'arm',
            preview: (rawText || cleanText).slice(0, 80),
          })
        }
        if (policy.blocked) {
          errorGateBlocked = true
          shouldAntiLoopReclaim = policy.shouldAntiLoopReclaim
          const strippedGuarded = guardEngvoAssistantContent(policy.displayText)
          cleanText = strippedGuarded
        }
      }

      let sourceText = rawText || cleanText
      if (
        engvoSessionKindRef.current === 'teacher' &&
        engvoTeacherPhaseRef.current === 'drill' &&
        !errorGateBlocked
      ) {
        const micro = ensureTeacherErrorMicroReason(sourceText, {
          userText: engvoLastFinalUserTranscriptRef.current.trim(),
          level: engvoCefrLevel,
        })
        if (micro.patched) {
          const guarded = guardEngvoAssistantContent(micro.text)
          if (guarded) {
            cleanText = guarded
            sourceText = micro.text
            microReasonContrastLine = micro.contrastLine
            console.info('[engvo] teacher-micro-reason', {
              patched: true,
              preview: sourceText.slice(0, 80),
            })
          }
        }
      }

      let teacherMatchAttach: ReturnType<typeof resolveTeacherMatchAttach> = null
      if (
        engvoSessionKindRef.current === 'teacher' &&
        engvoTeacherPhaseRef.current === 'drill' &&
        !errorGateBlocked
      ) {
        const extracted = extractTeacherCorrection(sourceText)
        const userText = engvoLastFinalUserTranscriptRef.current.trim()
        if (extracted.corrected && userText) {
          recordTeacherCorrectionSignal({
            userText,
            corrected: extracted.corrected,
          })
          pushCallReviewBufferItem(
            {
              utteranceHash: hashUtterance(userText),
              original: userText,
              correct: extracted.corrected.trim(),
              teacherEtalon: true,
              reviewTopics: [],
              lessonId: null,
              sourceNote: null,
            },
            callReviewEpochRef.current
          )
        }
        teacherMatchAttach = resolveTeacherMatchAttach({
          assistantRawText: sourceText,
          userText,
        })
      }`
)

content = apply(
  content,
  `      resetEngvoAssistantTurn()
      if (shouldAntiLoopReclaim) {
        const reclaimStarted = maybeReclaimTeacherAntiLoopRef.current()
        if (!reclaimStarted) {
          setEngvoCallPhase('listening')
        }
        setEngvoErrorText(null)
        return reclaimStarted
      }
      const reclaimStarted = maybeReclaimTeacherDrillRef.current(rawText)
      if (!reclaimStarted) {
        setEngvoCallPhase('listening')
      }
      setEngvoErrorText(null)
      return reclaimStarted
    },
    [
      guardEngvoAssistantContent,
      markEngvoAssistantAheadOfPendingUserTranscript,
      pushCallReviewBufferItem,
      resetEngvoAssistantTurn,
    ]
  )`,
  `      resetEngvoAssistantTurn()
      if (shouldAntiLoopReclaim) {
        const reclaimStarted = maybeReclaimTeacherAntiLoopRef.current()
        if (!reclaimStarted) {
          setEngvoCallPhase('listening')
        }
        setEngvoErrorText(null)
        return reclaimStarted
      }
      if (microReasonContrastLine) {
        const reclaimStarted = maybeReclaimTeacherMicroReasonRef.current(microReasonContrastLine)
        if (!reclaimStarted) {
          setEngvoCallPhase('listening')
        }
        setEngvoErrorText(null)
        return reclaimStarted
      }
      const reclaimStarted = maybeReclaimTeacherDrillRef.current(rawText)
      if (!reclaimStarted) {
        setEngvoCallPhase('listening')
      }
      setEngvoErrorText(null)
      return reclaimStarted
    },
    [
      engvoCefrLevel,
      guardEngvoAssistantContent,
      markEngvoAssistantAheadOfPendingUserTranscript,
      pushCallReviewBufferItem,
      resetEngvoAssistantTurn,
    ]
  )`
)

content = apply(
  content,
  `  maybeReclaimTeacherAntiLoopRef.current = maybeReclaimTeacherAntiLoop

  const scheduleEngvoForceCommit = useCallback(`,
  `  maybeReclaimTeacherAntiLoopRef.current = maybeReclaimTeacherAntiLoop

  const maybeReclaimTeacherMicroReason = useCallback(
    (contrastLine: string): boolean => {
      if (engvoSessionKindRef.current !== 'teacher') return false
      const line = contrastLine.trim()
      if (!line) return false
      if (engvoTeacherReclaimInFlightRef.current || engvoTeacherReclaimUsedThisUserTurnRef.current) {
        console.info('[engvo] teacher-reclaim', {
          skip: 'reclaim_budget',
          reason: 'micro_reason',
        })
        return false
      }
      engvoTeacherReclaimUsedThisUserTurnRef.current = true
      engvoTeacherReclaimInFlightRef.current = true
      engvoTeacherMicroReasonAudioOnlyRef.current = true
      stopEngvoPlayback(false)
      setEngvoCallPhase('assistantPending')
      const sent = sendEngvoRealtimeEvent({
        type: 'response.create',
        response: {
          instructions: buildEngvoTeacherMicroReasonReclaimResponseInstructions({
            contrastLine: line,
          }),
        },
      })
      console.info('[engvo] teacher-reclaim', {
        reason: 'micro_reason',
        sent,
        preview: line.slice(0, 80),
      })
      if (!sent) {
        engvoTeacherReclaimInFlightRef.current = false
        engvoTeacherMicroReasonAudioOnlyRef.current = false
        setEngvoCallPhase('listening')
        return false
      }
      return true
    },
    [sendEngvoRealtimeEvent, stopEngvoPlayback]
  )
  maybeReclaimTeacherMicroReasonRef.current = maybeReclaimTeacherMicroReason

  const scheduleEngvoForceCommit = useCallback(`
)

// Reset audio-only flag alongside reclaim budget (preserve surrounding indent).
content = content.replace(
  /(\n[ \t]*)engvoTeacherReclaimUsedThisUserTurnRef\.current = false\n(?![ \t]*engvoTeacherMicroReasonAudioOnlyRef)/g,
  '$1engvoTeacherReclaimUsedThisUserTurnRef.current = false\n$1engvoTeacherMicroReasonAudioOnlyRef.current = false\n'
)

// replaceAll might have broken indentation in some places - check. Some sites use different indent.
// Fix over-indent if we doubled on already-patched - first run only.

fs.writeFileSync(file, content, 'utf8')

const failures = checkCyrillicIntegrity({ root: ROOT, files: [file] })
if (failures.length > 0) {
  console.error('apply-teacher-micro-reason-appshell: check:cyrillic failed')
  for (const { relPath, violations } of failures) {
    for (const v of violations) {
      console.error(`  ${relPath}:L${v.line} [${v.type}] ${v.snippet}`)
    }
  }
  process.exit(1)
}

console.log('OK: teacher micro-reason wired into AppShell')
