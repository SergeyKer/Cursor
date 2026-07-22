/**
 * Wire anti-loop into Engvo assistant commit paths (CRLF-aware).
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
    throw new Error(`Missing block: ${from.slice(0, 120).replace(/\r/g, '\\r').replace(/\n/g, '\\n')}`)
  }
  return content.replace(from, to)
}

let content = fs.readFileSync(file, 'utf8')
const nl = content.includes('\r\n') ? '\r\n' : '\n'

const maybeCommitFrom = [
  '  const maybeCommitEngvoAssistantMessage = useCallback(() => {',
  '    const responseId = engvoAssistantResponseIdRef.current',
  '    const rawText = cleanNewlines(engvoFinalAssistantTextRef.current)',
  '    const finalText = guardEngvoAssistantContent(rawText)',
  '    if (',
  '      !canCommitEngvoAssistantMessage({',
  '        responseDone: engvoAssistantResponseDoneRef.current,',
  '        playbackPendingCount: engvoPlaybackPendingCountRef.current,',
  '        finalText,',
  '        alreadyCommittedResponseIds: engvoCommittedResponseIdsRef.current,',
  '        responseId,',
  '      })',
  '    ) {',
  '      return',
  '    }',
  '',
  '    engvoCommittedResponseIdsRef.current.add(responseId as string)',
  '    markEngvoAssistantAheadOfPendingUserTranscript()',
  '    setMessages((prev) => {',
  '      const withoutDial = prev.filter((m) => !m.engvoServiceLine)',
  '      const pending = responseId ? engvoPendingTranslationByResponseIdRef.current.get(responseId) : undefined',
  '      if (responseId && pending) {',
  '        engvoPendingTranslationByResponseIdRef.current.delete(responseId)',
  '      }',
  '      const msg: ChatMessage = {',
  "        role: 'assistant',",
  '        content: finalText,',
  '        ...(pending ? { translation: pending.translation, translationError: pending.translationError } : {}),',
  '      }',
  '      return [...withoutDial, msg]',
  '    })',
  '    resetEngvoAssistantTurn()',
  '    const reclaimStarted = maybeReclaimTeacherDrillRef.current(rawText)',
  '    if (!reclaimStarted) {',
  "      setEngvoCallPhase('listening')",
  '    }',
  '    setEngvoErrorText(null)',
  '  }, [guardEngvoAssistantContent, markEngvoAssistantAheadOfPendingUserTranscript, resetEngvoAssistantTurn])',
].join(nl)

const maybeCommitTo = [
  '  const maybeCommitEngvoAssistantMessage = useCallback(() => {',
  '    const responseId = engvoAssistantResponseIdRef.current',
  '    const rawText = cleanNewlines(engvoFinalAssistantTextRef.current)',
  '    const finalText = guardEngvoAssistantContent(rawText)',
  '    if (',
  '      !canCommitEngvoAssistantMessage({',
  '        responseDone: engvoAssistantResponseDoneRef.current,',
  '        playbackPendingCount: engvoPlaybackPendingCountRef.current,',
  '        finalText,',
  '        alreadyCommittedResponseIds: engvoCommittedResponseIdsRef.current,',
  '        responseId,',
  '      })',
  '    ) {',
  '      return',
  '    }',
  '',
  '    let commitText = finalText',
  '    let shouldAntiLoopReclaim = false',
  "    if (engvoSessionKindRef.current === 'teacher' && engvoTeacherPhaseRef.current === 'drill') {",
  '      const policy = applyAssistantAntiLoopPolicy(engvoTeacherRepeatAntiLoopRef.current, rawText)',
  '      engvoTeacherRepeatAntiLoopRef.current = policy.state',
  '      if (!policy.blocked) {',
  '        engvoTeacherRepeatAntiLoopRef.current = noteCompleteDrillFromAssistantText(',
  '          engvoTeacherRepeatAntiLoopRef.current,',
  '          rawText,',
  '          engvoTeacherPhaseRef.current',
  '        )',
  '        const extracted = extractTeacherCorrection(rawText)',
  '        if (extracted.corrected) {',
  '          const userText = engvoLastFinalUserTranscriptRef.current.trim()',
  '          if (userText) {',
  '            recordTeacherCorrectionSignal({',
  '              userText,',
  '              corrected: extracted.corrected,',
  '            })',
  '          }',
  '        }',
  '      } else {',
  '        shouldAntiLoopReclaim = policy.shouldAntiLoopReclaim',
  '        const stripped = guardEngvoAssistantContent(policy.displayText) || policy.displayText.trim()',
  '        commitText = stripped',
  '      }',
  '    }',
  '',
  '    engvoCommittedResponseIdsRef.current.add(responseId as string)',
  '    markEngvoAssistantAheadOfPendingUserTranscript()',
  '    if (commitText.trim()) {',
  '      setMessages((prev) => {',
  '        const withoutDial = prev.filter((m) => !m.engvoServiceLine)',
  '        const pending = responseId ? engvoPendingTranslationByResponseIdRef.current.get(responseId) : undefined',
  '        if (responseId && pending) {',
  '          engvoPendingTranslationByResponseIdRef.current.delete(responseId)',
  '        }',
  '        const msg: ChatMessage = {',
  "          role: 'assistant',",
  '          content: commitText,',
  '          ...(pending ? { translation: pending.translation, translationError: pending.translationError } : {}),',
  '        }',
  '        return [...withoutDial, msg]',
  '      })',
  '    } else if (responseId) {',
  '      engvoPendingTranslationByResponseIdRef.current.delete(responseId)',
  '    }',
  '    resetEngvoAssistantTurn()',
  '    const reclaimStarted = shouldAntiLoopReclaim',
  '      ? maybeReclaimTeacherAntiLoopRef.current()',
  '      : maybeReclaimTeacherDrillRef.current(rawText)',
  '    if (!reclaimStarted) {',
  "      setEngvoCallPhase('listening')",
  '    }',
  '    setEngvoErrorText(null)',
  '  }, [guardEngvoAssistantContent, markEngvoAssistantAheadOfPendingUserTranscript, resetEngvoAssistantTurn])',
].join(nl)

content = apply(content, maybeCommitFrom, maybeCommitTo)

const commitTeacherFrom = [
  '      if (',
  "        engvoSessionKindRef.current === 'teacher' &&",
  "        engvoTeacherPhaseRef.current === 'drill'",
  '      ) {',
  '        const extracted = extractTeacherCorrection(rawText || cleanText)',
  '        if (extracted.corrected) {',
  '          const userText = engvoLastFinalUserTranscriptRef.current.trim()',
  '          if (userText) {',
  '            recordTeacherCorrectionSignal({',
  '              userText,',
  '              corrected: extracted.corrected,',
  '            })',
  '          }',
  '        }',
  '      }',
  '',
  '      markEngvoAssistantAheadOfPendingUserTranscript()',
  '      engvoLastMeaningfulActivityAtRef.current = Date.now()',
  '      engvoGotAssistantForCurrentUserTurnRef.current = true',
  '      setMessages((prev) => {',
].join(nl)

const commitTeacherTo = [
  '      let commitText = cleanText',
  '      let shouldAntiLoopReclaim = false',
  '      if (',
  "        engvoSessionKindRef.current === 'teacher' &&",
  "        engvoTeacherPhaseRef.current === 'drill'",
  '      ) {',
  '        const policy = applyAssistantAntiLoopPolicy(engvoTeacherRepeatAntiLoopRef.current, rawText)',
  '        engvoTeacherRepeatAntiLoopRef.current = policy.state',
  '        if (!policy.blocked) {',
  '          engvoTeacherRepeatAntiLoopRef.current = noteCompleteDrillFromAssistantText(',
  '            engvoTeacherRepeatAntiLoopRef.current,',
  '            rawText,',
  '            engvoTeacherPhaseRef.current',
  '          )',
  '          const extracted = extractTeacherCorrection(rawText || cleanText)',
  '          if (extracted.corrected) {',
  '            const userText = engvoLastFinalUserTranscriptRef.current.trim()',
  '            if (userText) {',
  '              recordTeacherCorrectionSignal({',
  '                userText,',
  '                corrected: extracted.corrected,',
  '              })',
  '            }',
  '          }',
  '        } else {',
  '          shouldAntiLoopReclaim = policy.shouldAntiLoopReclaim',
  '          commitText = guardEngvoAssistantContent(policy.displayText) || policy.displayText.trim()',
  '        }',
  '      }',
  '',
  '      markEngvoAssistantAheadOfPendingUserTranscript()',
  '      engvoLastMeaningfulActivityAtRef.current = Date.now()',
  '      engvoGotAssistantForCurrentUserTurnRef.current = true',
  '      if (!commitText.trim()) {',
  '        resetEngvoAssistantTurn()',
  '        const reclaimStartedEmpty = shouldAntiLoopReclaim',
  '          ? maybeReclaimTeacherAntiLoopRef.current()',
  '          : maybeReclaimTeacherDrillRef.current(rawText)',
  '        if (!reclaimStartedEmpty) {',
  "          setEngvoCallPhase('listening')",
  '        }',
  '        setEngvoErrorText(null)',
        '        return reclaimStartedEmpty',
  '      }',
  '      setMessages((prev) => {',
].join(nl)

content = apply(content, commitTeacherFrom, commitTeacherTo)

// Replace cleanText with commitText inside commitEngvoAssistantText setMessages — careful, only in that function.
// Do targeted replacements for content: cleanText in the streaming/new message paths right after our insert.
content = apply(
  content,
  [
    '            let patched = {',
    '              ...candidate,',
    '              content: cleanText,',
    '              engvoServiceLine: undefined,',
    '            }',
  ].join(nl),
  [
    '            let patched = {',
    '              ...candidate,',
    '              content: commitText,',
    '              engvoServiceLine: undefined,',
    '            }',
  ].join(nl)
)

content = apply(
  content,
  [
    '        const lastNormalized = normalizeForEchoCompare(last?.content ?? \'\')',
    '        const nextNormalized = normalizeForEchoCompare(cleanText)',
  ].join(nl),
  [
    '        const lastNormalized = normalizeForEchoCompare(last?.content ?? \'\')',
    '        const nextNormalized = normalizeForEchoCompare(commitText)',
  ].join(nl)
)

content = apply(
  content,
  `        const assistantMsg: ChatMessage = { role: 'assistant', content: cleanText }`,
  `        const assistantMsg: ChatMessage = { role: 'assistant', content: commitText }`
)

content = apply(
  content,
  `            const idx = findAssistantIndexByTranslationText(nextMessages, nextMessages.length - 1, cleanText)`,
  `            const idx = findAssistantIndexByTranslationText(nextMessages, nextMessages.length - 1, commitText)`
)

content = apply(
  content,
  [
    '      resetEngvoAssistantTurn()',
    '      const reclaimStarted = maybeReclaimTeacherDrillRef.current(rawText)',
    '      if (!reclaimStarted) {',
    "        setEngvoCallPhase('listening')",
    '      }',
    '      setEngvoErrorText(null)',
    '      return reclaimStarted',
    '    },',
    '    [guardEngvoAssistantContent, markEngvoAssistantAheadOfPendingUserTranscript, resetEngvoAssistantTurn]',
  ].join(nl),
  [
    '      resetEngvoAssistantTurn()',
    '      const reclaimStarted = shouldAntiLoopReclaim',
    '        ? maybeReclaimTeacherAntiLoopRef.current()',
    '        : maybeReclaimTeacherDrillRef.current(rawText)',
    '      if (!reclaimStarted) {',
    "        setEngvoCallPhase('listening')",
    '      }',
    '      setEngvoErrorText(null)',
    '      return reclaimStarted',
    '    },',
    '    [guardEngvoAssistantContent, markEngvoAssistantAheadOfPendingUserTranscript, resetEngvoAssistantTurn]',
  ].join(nl)
)

fs.writeFileSync(file, content, 'utf8')
const failures = checkCyrillicIntegrity({ root: ROOT, files: [file] })
if (failures.length > 0) {
  console.error('cyrillic check failed')
  for (const { relPath, violations } of failures) {
    for (const v of violations) console.error(`  ${relPath}:L${v.line} ${v.snippet}`)
  }
  process.exit(1)
}
console.log('commit paths OK')
