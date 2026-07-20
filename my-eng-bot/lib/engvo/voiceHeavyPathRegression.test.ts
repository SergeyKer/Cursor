import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildEngvoXaiClientSessionUpdate } from '@/lib/engvo/realtimeSession'
import { buildEngvoTeacherRealtimeInstructions } from '@/lib/engvo/teacherPrompts'
import { isIncompleteTeacherAssistantTurn } from '@/lib/engvo/teacherDrillCompleteness'

const PROJECT_ROOT = join(process.cwd())
const SCAN_ROOTS = [join(PROJECT_ROOT, 'lib', 'engvo'), join(PROJECT_ROOT, 'components')]

const FORBIDDEN_MODULES = [
  'xaiListenPolicy.ts',
  'teacherHandoffReclaim.ts',
  'freeCallTurnCompleteness.ts',
] as const

const FORBIDDEN_IMPORT_RE =
  /@\/lib\/engvo\/(?:xaiListenPolicy|teacherHandoffReclaim|freeCallTurnCompleteness)\b/

/** Symbols from the 2026-07-19 heavy path — not baseline VAD ForceCommit. */
const FORBIDDEN_SYMBOL_RE =
  /\b(?:engvoListenArmed|listenArmed|xaiListenPolicy|buildEngvoTeacherKeyterms|buildEngvoTeacherTopicKeyterms|teacherHandoffReclaim|freeCallTurnCompleteness|buildEngvoTeacherFirstDrillAfterTopic|resolveEngvoXaiLanguageHint)\b/

const LANGUAGE_HINT_EN_RE = /language_hint\s*:\s*['"]en['"]/

function listSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.next') continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      out.push(...listSourceFiles(full))
      continue
    }
    if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) {
      out.push(full)
    }
  }
  return out
}

describe('voice heavy-path regression (2026-07-19)', () => {
  it('R1: xAI session.update keeps language_hint ru', () => {
    const event = buildEngvoXaiClientSessionUpdate({
      instructions: 'Teacher call.',
      voice: 'luna',
    })
    const session = event.session as {
      audio: { input: { transcription: { language_hint: string } } }
    }
    expect(session.audio.input.transcription.language_hint).toBe('ru')
  })

  it('R1: prod sources must not set language_hint en or resolveEngvoXaiLanguageHint', () => {
    const files = SCAN_ROOTS.flatMap(listSourceFiles)
    expect(files.length).toBeGreaterThan(10)
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      expect(src, relative(PROJECT_ROOT, file)).not.toMatch(LANGUAGE_HINT_EN_RE)
      expect(src, relative(PROJECT_ROOT, file)).not.toMatch(/\bresolveEngvoXaiLanguageHint\b/)
    }
  })

  it('R2: ERROR contract stays Say / Скажи (orientation so:/not example allowed)', () => {
    const a2 = buildEngvoTeacherRealtimeInstructions({
      audience: 'adult',
      level: 'a2',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    const b1 = buildEngvoTeacherRealtimeInstructions({
      audience: 'adult',
      level: 'b1',
      tense: 'present_simple',
      sentenceType: 'general',
    })
    expect(a2).toMatch(/Скажи/)
    expect(b1).toMatch(/Say:\s*"/)
    // Must not migrate primary ERROR frame to so:/not.
    expect(b1).not.toMatch(/instead of You meant/i)
    expect(b1).not.toMatch(/instead of\s+Скажи/i)
    expect(b1).not.toMatch(/use so:\/not instead/i)
    // Primary B1+ marker is Say; slim one-canon from block 1 remains.
    expect(b1).toMatch(/do not use You meant as the ERROR marker/i)
    expect(b1).toMatch(/Do not add a second repeat-ask after Say/)
    expect(b1).toMatch(/Never restate the full canonical English/)
    expect(b1).toMatch(/differing fragment/)
    expect(a2).toMatch(/Never restate the full canonical English/)
  })

  it('R3: forbidden heavy-path modules must not exist or be imported', () => {
    for (const name of FORBIDDEN_MODULES) {
      expect(existsSync(join(PROJECT_ROOT, 'lib', 'engvo', name))).toBe(false)
    }
    const files = SCAN_ROOTS.flatMap(listSourceFiles)
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      expect(src, relative(PROJECT_ROOT, file)).not.toMatch(FORBIDDEN_IMPORT_RE)
    }
  })

  it('R4: AppShell/engvo must not revive listen-arm / first-drill-force helpers', () => {
    const files = SCAN_ROOTS.flatMap(listSourceFiles)
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      expect(src, relative(PROJECT_ROOT, file)).not.toMatch(FORBIDDEN_SYMBOL_RE)
    }
    // Baseline VAD force-commit of user speech must remain allowed.
    const appShell = readFileSync(join(PROJECT_ROOT, 'components', 'app', 'AppShell.tsx'), 'utf8')
    expect(appShell).toMatch(/scheduleEngvoForceCommit/)
  })

  it('R5: ERROR not incomplete; post-first-drill Where… is missing_drill', () => {
    expect(
      isIncompleteTeacherAssistantTurn({
        text: 'Close — so: sea — not: the sea. Say: "I go to the sea."',
        phase: 'drill',
        awaitingFirstDrill: false,
      }).incomplete
    ).toBe(false)
    expect(
      isIncompleteTeacherAssistantTurn({
        text: 'Close — You meant: "I go to the sea." Try that.',
        phase: 'drill',
        awaitingFirstDrill: false,
      }).incomplete
    ).toBe(false)
    const interview = isIncompleteTeacherAssistantTurn({
      text: 'Where do you usually go?',
      phase: 'drill',
      awaitingFirstDrill: false,
    })
    expect(interview.incomplete).toBe(true)
    expect(interview.reason).toBe('missing_drill')
  })
})
