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

  it('root footer bg is opaque white with no backdrop blur', () => {
    expect(css).toMatch(/--app-footer-bg:\s*#ffffff/)
    expect(css).toMatch(/--app-footer-backdrop-filter:\s*none/)
  })
})
