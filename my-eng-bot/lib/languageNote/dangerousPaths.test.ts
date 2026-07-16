import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { shouldShowLanguageNoteMark } from '@/lib/languageNote/eligibility'

describe('FooterDetailSheet language-note open effect', () => {
  it('opens animation only on null→context, not on loading→ready updates', () => {
    const source = readFileSync(
      join(process.cwd(), 'components', 'FooterDetailSheet.tsx'),
      'utf8'
    )
    expect(source).toContain('hadContextRef')
    expect(source).toContain('const isFirstOpen = !hadContextRef.current')
    expect(source).toMatch(/if \(!isFirstOpen\)[\s\S]*return/)
    expect(source).toContain("context.source === 'language-note'")
  })
})

describe('language-note cache write guard in AppShell', () => {
  it('writes cache only when message content still matches snapshot', () => {
    const source = readFileSync(join(process.cwd(), 'components', 'app', 'AppShell.tsx'), 'utf8')
    expect(source).toContain('handleLanguageNoteInfoPress')
    expect(source).toContain('current.content.trim() !== message.content.trim()')
    expect(source).toContain('languageNoteAbortRef')
    expect(source).toContain('languageNoteRequestIdRef')
    expect(source).toContain('engvoCallInProgressForTips')
    expect(source).toContain('if (engvoCallInProgressForTips) return')
  })
})

describe('Engvo free_call / teacher parity (language note + call caps)', () => {
  it('tips mid-call gate and max-duration hang-up do not branch on sessionKind', () => {
    const source = readFileSync(join(process.cwd(), 'components', 'app', 'AppShell.tsx'), 'utf8')
    const tipsDecl = source.match(
      /const engvoCallInProgressForTips =[\s\S]*?includes\(\s*engvoCallPhase\s*\)/
    )?.[0]
    expect(tipsDecl).toBeTruthy()
    expect(tipsDecl).not.toMatch(/sessionKind|teacher|free_call/)

    const maxDurationEffect = source.match(
      /engvoMaxCallDurationTimeoutRef\.current = window\.setTimeout\([\s\S]*?ENGVO_MAX_CALL_DURATION_MS\)/
    )?.[0]
    expect(maxDurationEffect).toBeTruthy()
    expect(maxDurationEffect).toContain('finishEngvoCall()')
    expect(maxDurationEffect).not.toMatch(/sessionKind|teacher|free_call/)
  })

  it('eligibility mark is allowed after hang-up for any engvo session', () => {
    // Mirrors post-hang-up Chat path: engvoVoiceMode + callInProgress false.
    // Session kind is intentionally not a parameter.
    expect(
      shouldShowLanguageNoteMark({
        mode: 'dialogue',
        engvoVoiceMode: true,
        content: 'I went to school yesterday',
        callInProgress: false,
      })
    ).toBe(true)
    expect(
      shouldShowLanguageNoteMark({
        mode: 'dialogue',
        engvoVoiceMode: true,
        content: 'I went to school yesterday',
        callInProgress: true,
      })
    ).toBe(false)
  })
})
