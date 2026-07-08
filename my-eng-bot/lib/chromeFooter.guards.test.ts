import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function readGlobalsCss(): string {
  return readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8')
}

function readProjectFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

const FOOTER_CHROME_FILES = [
  'components/app/AppShell.tsx',
  'components/start/StartPageChrome.tsx',
  'app/__test__/footer-sheet/FooterSheetHarness.tsx',
] as const

describe('chrome footer layout guards', () => {
  const css = readGlobalsCss()

  it('safe-area strip uses app-footer-bg in footer chrome files', () => {
    for (const file of FOOTER_CHROME_FILES) {
      const source = readProjectFile(file)
      expect(source).toContain('bg-[var(--app-footer-bg)]')
      expect(source).not.toMatch(/shrink-0 bg-\[var\(--app-header-bg\)\]/)
    }
  })

  it('app-footer-surface class on chrome div in footer files', () => {
    for (const file of FOOTER_CHROME_FILES) {
      const source = readProjectFile(file)
      expect(source).toContain('app-footer-surface')
    }
  })

  it('app-footer-surface has border-t in footer chrome files', () => {
    for (const file of FOOTER_CHROME_FILES) {
      const source = readProjectFile(file)
      expect(source).toMatch(/app-footer-surface[^"\n]*border-t[^"\n]*border-\[var\(--app-footer-border\)\]/)
    }
  })

  it('footer chrome z-index above sheet in AppShell and harness', () => {
    for (const file of ['components/app/AppShell.tsx', 'app/__test__/footer-sheet/FooterSheetHarness.tsx']) {
      const source = readProjectFile(file)
      expect(source).toMatch(/app-dialog-chrome-footer[\s\S]*z-\[55\]/)
    }
    expect(css).toMatch(/\.footer-sheet-panel[\s\S]*z-index:\s*54/)
  })

  it('menu panel bottom anchored to footer offset', () => {
    expect(css).toContain('--app-menu-panel-bottom: var(--app-bottom-offset)')
  })

  it('root footer chrome uses opaque Basic-etalon bg without header mirror', () => {
    expect(css).toMatch(
      /--app-footer-bg:\s*color-mix\(in srgb,\s*#ffffff 92%,\s*#cfe2c6 8%\)/
    )
    expect(css).toMatch(/--app-footer-backdrop-filter:\s*none/)
    expect(css).not.toMatch(/--app-footer-bg:\s*var\(--app-header-bg\)/)
    expect(css).not.toMatch(/--app-footer-backdrop-filter:\s*var\(--app-header-backdrop-filter\)/)
  })
})
