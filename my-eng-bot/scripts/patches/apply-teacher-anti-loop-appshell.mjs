/**
 * UTF-8 safe AppShell patches for teacher anti-loop (CRLF-aware).
 * Usage: node scripts/patches/apply-teacher-anti-loop-appshell.mjs
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
    throw new Error(`Missing block: ${from.slice(0, 100).replace(/\r/g, '\\r').replace(/\n/g, '\\n')}`)
  }
  return content.replace(from, to)
}

let content = fs.readFileSync(file, 'utf8')
const nl = content.includes('\r\n') ? '\r\n' : '\n'

content = apply(
  content,
  [
    'import {',
    '  buildEngvoContinuationResponseInstructions,',
    '  buildEngvoFirstTurnResponseInstructions,',
    '  buildEngvoTeacherDrillReclaimResponseInstructions,',
    "} from '@/lib/engvo/instructions'",
    "import { isIncompleteTeacherAssistantTurn } from '@/lib/engvo/teacherDrillCompleteness'",
  ].join(nl),
  [
    'import {',
    '  buildEngvoContinuationResponseInstructions,',
    '  buildEngvoFirstTurnResponseInstructions,',
    '  buildEngvoTeacherAntiLoopReclaimResponseInstructions,',
    '  buildEngvoTeacherDrillReclaimResponseInstructions,',
    "} from '@/lib/engvo/instructions'",
    "import { isIncompleteTeacherAssistantTurn } from '@/lib/engvo/teacherDrillCompleteness'",
    'import {',
    '  applyAssistantAntiLoopPolicy,',
    '  createTeacherRepeatAntiLoopState,',
    '  noteCompleteDrillFromAssistantText,',
    '  noteUserFinal,',
    '  resetTeacherRepeatAntiLoop,',
    '  type TeacherRepeatAntiLoopState,',
    "} from '@/lib/engvo/teacherRepeatAntiLoop'",
  ].join(nl)
)

content = apply(
  content,
  `  const maybeReclaimTeacherDrillRef = React.useRef<(rawText: string) => boolean>(() => false)`,
  [
    `  const maybeReclaimTeacherDrillRef = React.useRef<(rawText: string) => boolean>(() => false)`,
    `  const maybeReclaimTeacherAntiLoopRef = React.useRef<() => boolean>(() => false)`,
    `  const engvoTeacherRepeatAntiLoopRef = React.useRef<TeacherRepeatAntiLoopState>(`,
    `    createTeacherRepeatAntiLoopState()`,
    `  )`,
  ].join(nl)
)

content = apply(
  content,
  [
    '    engvoTeacherReclaimUsedThisUserTurnRef.current = false',
    '    engvoTeacherReclaimInFlightRef.current = false',
    "    engvoLastFinalUserTranscriptRef.current = ''",
    "    setEngvoCallPhase('ended')",
  ].join(nl),
  [
    '    engvoTeacherReclaimUsedThisUserTurnRef.current = false',
    '    engvoTeacherReclaimInFlightRef.current = false',
    '    engvoTeacherRepeatAntiLoopRef.current = resetTeacherRepeatAntiLoop()',
    "    engvoLastFinalUserTranscriptRef.current = ''",
    "    setEngvoCallPhase('ended')",
  ].join(nl)
)

content = apply(
  content,
  [
    '    engvoTeacherReclaimUsedThisUserTurnRef.current = false',
    '    engvoTeacherReclaimInFlightRef.current = false',
    '  }, [])',
    '',
    '  const handleEngvoTeacherTenseChange',
  ].join(nl),
  [
    '    engvoTeacherReclaimUsedThisUserTurnRef.current = false',
    '    engvoTeacherReclaimInFlightRef.current = false',
    '    engvoTeacherRepeatAntiLoopRef.current = resetTeacherRepeatAntiLoop()',
    '  }, [])',
    '',
    '  const handleEngvoTeacherTenseChange',
  ].join(nl)
)

content = apply(
  content,
  [
    "              if (engvoSessionKindRef.current === 'teacher') {",
    '                engvoTeacherUserFinalCountRef.current += 1',
    '                engvoTeacherReclaimUsedThisUserTurnRef.current = false',
    '                if (',
    "                  engvoTeacherPhaseRef.current === 'topic_choice' &&",
    '                  engvoTeacherUserFinalCountRef.current >= 1',
    '                ) {',
  ].join(nl),
  [
    "              if (engvoSessionKindRef.current === 'teacher') {",
    '                engvoTeacherUserFinalCountRef.current += 1',
    '                engvoTeacherReclaimUsedThisUserTurnRef.current = false',
    "                if (engvoTeacherPhaseRef.current === 'drill') {",
    '                  engvoTeacherRepeatAntiLoopRef.current = noteUserFinal(',
    '                    engvoTeacherRepeatAntiLoopRef.current',
    '                  )',
    '                }',
    '                if (',
    "                  engvoTeacherPhaseRef.current === 'topic_choice' &&",
    '                  engvoTeacherUserFinalCountRef.current >= 1',
    '                ) {',
  ].join(nl)
)

content = apply(
  content,
  [
    '                  engvo={{',
    '                    active: engvoVoiceMode,',
    '                    callPhase: engvoCallPhase,',
  ].join(nl),
  [
    '                  engvo={{',
    '                    active: engvoVoiceMode,',
    '                    sessionKind: engvoSessionKind,',
    '                    callPhase: engvoCallPhase,',
  ].join(nl)
)

// Insert anti-loop reclaim after drill reclaim assignment
content = apply(
  content,
  [
    '  maybeReclaimTeacherDrillRef.current = maybeReclaimTeacherDrill',
    '',
    '  const scheduleEngvoForceCommit = useCallback(',
  ].join(nl),
  [
    '  maybeReclaimTeacherDrillRef.current = maybeReclaimTeacherDrill',
    '',
    '  const maybeReclaimTeacherAntiLoop = useCallback((): boolean => {',
    "    if (engvoSessionKindRef.current !== 'teacher') return false",
    '    if (engvoTeacherReclaimUsedThisUserTurnRef.current || engvoTeacherReclaimInFlightRef.current) {',
    "      console.info('[engvo] teacher-anti-loop', { skip: 'reclaim_budget' })",
    '      return false',
    '    }',
    '    engvoTeacherReclaimUsedThisUserTurnRef.current = true',
    '    engvoTeacherReclaimInFlightRef.current = true',
    "    setEngvoCallPhase('assistantPending')",
    '    const sent = sendEngvoRealtimeEvent({',
    "      type: 'response.create',",
    '      response: {',
    '        instructions: buildEngvoTeacherAntiLoopReclaimResponseInstructions({',
    '          level: engvoCefrLevel,',
    '          tense: engvoTeacherTense,',
    '          sentenceType: engvoTeacherSentenceType,',
    '        }),',
    '      },',
    '    })',
    "    console.info('[engvo] teacher-anti-loop', { reclaim: true, sent })",
    '    if (!sent) {',
    '      engvoTeacherReclaimInFlightRef.current = false',
    "      setEngvoCallPhase('listening')",
    '      return false',
    '    }',
    '    return true',
    '  }, [engvoCefrLevel, engvoTeacherSentenceType, engvoTeacherTense, sendEngvoRealtimeEvent])',
    '  maybeReclaimTeacherAntiLoopRef.current = maybeReclaimTeacherAntiLoop',
    '',
    '  const scheduleEngvoForceCommit = useCallback(',
  ].join(nl)
)

fs.writeFileSync(file, content, 'utf8')
const failures = checkCyrillicIntegrity({ root: ROOT, files: [file] })
if (failures.length > 0) {
  console.error('cyrillic check failed')
  process.exit(1)
}
console.log('part1+reclaim OK')
