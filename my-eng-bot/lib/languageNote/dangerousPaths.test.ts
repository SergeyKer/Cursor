import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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
  })
})
