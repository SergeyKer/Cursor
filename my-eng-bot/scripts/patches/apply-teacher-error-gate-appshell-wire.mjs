/**
 * UTF-8 safe AppShell wire for teacher error-repeat gate + anti-loop reclaim.
 * Usage: node scripts/patches/apply-teacher-error-gate-appshell-wire.mjs
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
    throw new Error(`Missing block: ${from.slice(0, 120).replace(/\n/g, '\\n')}`)
  }
  return content.replace(from, to)
}

let content = fs.readFileSync(file, 'utf8')

content = apply(
  content,
  `  const commitEngvoAssistantText = useCallback(
    (text: string, responseId?: string | null): boolean => {
      const rawText = prepareEngvoAssistantRawText(text)
      const cleanText = guardEngvoAssistantContent(rawText)
      if (!cleanText) return false
      const id = responseId ?? engvoAssistantResponseIdRef.current
      if (id) {
        if (engvoCommittedResponseIdsRef.current.has(id)) return false
        engvoCommittedResponseIdsRef.current.add(id)
      }

      let teacherMatchAttach: ReturnType<typeof resolveTeacherMatchAttach> = null
      if (
        engvoSessionKindRef.current === 'teacher' &&
        engvoTeacherPhaseRef.current === 'drill'
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
      }

      markEngvoAssistantAheadOfPendingUserTranscript()
      engvoLastMeaningfulActivityAtRef.current = Date.now()
      engvoGotAssistantForCurrentUserTurnRef.current = true
      setMessages((prev) => {
        const withoutDial = prev.filter((m) => !m.engvoServiceLine)
        const streamingIndex = engvoStreamingAssistantIndexRef.current
        let nextMessages = withoutDial
        if (streamingIndex !== null && streamingIndex >= 0 && streamingIndex < withoutDial.length) {
          const candidate = withoutDial[streamingIndex]
          if (candidate?.role === 'assistant') {
            const updated = [...withoutDial]
            let patched = {
              ...candidate,
              content: cleanText,
              engvoServiceLine: undefined,
            }
            if (id) {
              const pending = engvoPendingTranslationByResponseIdRef.current.get(id)
              if (pending) {
                engvoPendingTranslationByResponseIdRef.current.delete(id)
                patched = {
                  ...patched,
                  translation: pending.translation,
                  translationError: pending.translationError,
                }
              }
            }
            updated[streamingIndex] = patched
            nextMessages = updated
            return patchMessagesWithTeacherMatchAttach(nextMessages, teacherMatchAttach)
          }
        }
        const last = withoutDial[withoutDial.length - 1]
        const lastNormalized = normalizeForEchoCompare(last?.content ?? '')
        const nextNormalized = normalizeForEchoCompare(cleanText)
        if (
          last?.role === 'assistant' &&
          last.engvoLocalWelcome !== true &&
          !last.engvoServiceLine &&
          last.content.trim() !== ENGVO_CALL_FINISHED_ASSISTANT_TEXT &&
          lastNormalized === nextNormalized
        ) {
          return patchMessagesWithTeacherMatchAttach(withoutDial, teacherMatchAttach)
        }
        const assistantMsg: ChatMessage = { role: 'assistant', content: cleanText }
        nextMessages = [...withoutDial, assistantMsg]
        if (id) {
          const pending = engvoPendingTranslationByResponseIdRef.current.get(id)
          if (pending) {
            engvoPendingTranslationByResponseIdRef.current.delete(id)
            const idx = findAssistantIndexByTranslationText(nextMessages, nextMessages.length - 1, cleanText)
            if (nextMessages[idx]?.role === 'assistant') {
              const patched = [...nextMessages]
              patched[idx] = {
                ...patched[idx],
                translation: pending.translation,
                translationError: pending.translationError,
              }
              return patchMessagesWithTeacherMatchAttach(patched, teacherMatchAttach)
            }
          }
        }
        return patchMessagesWithTeacherMatchAttach(nextMessages, teacherMatchAttach)
      })
      resetEngvoAssistantTurn()
      const reclaimStarted = maybeReclaimTeacherDrillRef.current(rawText)
      if (!reclaimStarted) {
        setEngvoCallPhase('listening')
      }
      setEngvoErrorText(null)
      return reclaimStarted
    },`,
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
      }

      markEngvoAssistantAheadOfPendingUserTranscript()
      engvoLastMeaningfulActivityAtRef.current = Date.now()
      engvoGotAssistantForCurrentUserTurnRef.current = true

      if (cleanText.trim()) {
        setMessages((prev) => {
          const withoutDial = prev.filter((m) => !m.engvoServiceLine)
          const streamingIndex = engvoStreamingAssistantIndexRef.current
          let nextMessages = withoutDial
          if (streamingIndex !== null && streamingIndex >= 0 && streamingIndex < withoutDial.length) {
            const candidate = withoutDial[streamingIndex]
            if (candidate?.role === 'assistant') {
              const updated = [...withoutDial]
              let patched = {
                ...candidate,
                content: cleanText,
                engvoServiceLine: undefined,
              }
              if (id) {
                const pending = engvoPendingTranslationByResponseIdRef.current.get(id)
                if (pending) {
                  engvoPendingTranslationByResponseIdRef.current.delete(id)
                  patched = {
                    ...patched,
                    translation: pending.translation,
                    translationError: pending.translationError,
                  }
                }
              }
              updated[streamingIndex] = patched
              nextMessages = updated
              return patchMessagesWithTeacherMatchAttach(nextMessages, teacherMatchAttach)
            }
          }
          const last = withoutDial[withoutDial.length - 1]
          const lastNormalized = normalizeForEchoCompare(last?.content ?? '')
          const nextNormalized = normalizeForEchoCompare(cleanText)
          if (
            last?.role === 'assistant' &&
            last.engvoLocalWelcome !== true &&
            !last.engvoServiceLine &&
            last.content.trim() !== ENGVO_CALL_FINISHED_ASSISTANT_TEXT &&
            lastNormalized === nextNormalized
          ) {
            return patchMessagesWithTeacherMatchAttach(withoutDial, teacherMatchAttach)
          }
          const assistantMsg: ChatMessage = { role: 'assistant', content: cleanText }
          nextMessages = [...withoutDial, assistantMsg]
          if (id) {
            const pending = engvoPendingTranslationByResponseIdRef.current.get(id)
            if (pending) {
              engvoPendingTranslationByResponseIdRef.current.delete(id)
              const idx = findAssistantIndexByTranslationText(nextMessages, nextMessages.length - 1, cleanText)
              if (nextMessages[idx]?.role === 'assistant') {
                const patched = [...nextMessages]
                patched[idx] = {
                  ...patched[idx],
                  translation: pending.translation,
                  translationError: pending.translationError,
                }
                return patchMessagesWithTeacherMatchAttach(patched, teacherMatchAttach)
              }
            }
          }
          return patchMessagesWithTeacherMatchAttach(nextMessages, teacherMatchAttach)
        })
      }

      resetEngvoAssistantTurn()
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
    },`
)

content = apply(
  content,
  `                noteTeacherDrillUserAttempt(engvoTeacherDrillProgressRef.current, transcript)
                if (
                  engvoTeacherTense === 'all' &&
                  engvoTeacherDrillKind === 'tense_drill' &&
                  !engvoTeacherDrillProgressRef.current.drillAwaitingAnswer
                ) {
                  engvoTeacherPostAttemptRotateArmedRef.current = true
                }`,
  `                noteTeacherDrillUserAttempt(engvoTeacherDrillProgressRef.current, transcript)
                if (engvoTeacherPhaseRef.current === 'drill') {
                  engvoTeacherErrorRepeatGateRef.current = noteErrorRepeatUserTry(
                    engvoTeacherErrorRepeatGateRef.current,
                    transcript
                  )
                }
                if (
                  engvoTeacherTense === 'all' &&
                  engvoTeacherDrillKind === 'tense_drill' &&
                  !engvoTeacherDrillProgressRef.current.drillAwaitingAnswer
                ) {
                  engvoTeacherPostAttemptRotateArmedRef.current = true
                }`
)

content = apply(
  content,
  `      if (progress.action === 'commit') {
        if (
          engvoTeacherTense === 'all' &&
          engvoTeacherDrillKind === 'tense_drill' &&
          engvoTeacherPostAttemptRotateArmedRef.current &&
          engvoTeacherNextTenseRef.current
        ) {`,
  `      if (progress.action === 'commit') {
        engvoTeacherErrorRepeatGateRef.current = noteErrorRepeatCompleteDrill(
          engvoTeacherErrorRepeatGateRef.current
        )
        if (
          engvoTeacherTense === 'all' &&
          engvoTeacherDrillKind === 'tense_drill' &&
          engvoTeacherPostAttemptRotateArmedRef.current &&
          engvoTeacherNextTenseRef.current
        ) {`
)

content = apply(
  content,
  `  maybeReclaimTeacherDrillRef.current = maybeReclaimTeacherDrill`,
  `  maybeReclaimTeacherDrillRef.current = maybeReclaimTeacherDrill

  const maybeReclaimTeacherAntiLoop = useCallback((): boolean => {
    if (engvoSessionKindRef.current !== 'teacher') return false
    if (engvoTeacherReclaimInFlightRef.current || engvoTeacherReclaimUsedThisUserTurnRef.current) {
      console.info('[engvo] teacher-reclaim', {
        skip: 'reclaim_budget',
        reason: 'error_anti_loop',
      })
      return false
    }
    engvoTeacherReclaimUsedThisUserTurnRef.current = true
    engvoTeacherReclaimInFlightRef.current = true
    setEngvoCallPhase('assistantPending')
    const sent = sendEngvoRealtimeEvent({
      type: 'response.create',
      response: {
        instructions: buildEngvoTeacherAntiLoopReclaimResponseInstructions({
          level: engvoCefrLevel,
          tense: resolveTeacherLiveTense() as import('@/lib/types').TenseId,
          sentenceType: engvoTeacherSentenceType,
          lessonAxis: engvoTeacherLessonAxisRef.current,
        }),
      },
    })
    console.info('[engvo] teacher-reclaim', {
      reason: 'error_anti_loop',
      sent,
    })
    if (!sent) {
      engvoTeacherReclaimInFlightRef.current = false
      setEngvoCallPhase('listening')
      return false
    }
    return true
  }, [
    engvoCefrLevel,
    engvoTeacherSentenceType,
    resolveTeacherLiveTense,
    sendEngvoRealtimeEvent,
  ])
  maybeReclaimTeacherAntiLoopRef.current = maybeReclaimTeacherAntiLoop`
)

fs.writeFileSync(file, content, 'utf8')
const failures = checkCyrillicIntegrity({ root: ROOT, files: [file] })
if (failures.length > 0) {
  console.error('cyrillic check failed')
  process.exit(1)
}
console.log('apply-teacher-error-gate-appshell-wire OK')
