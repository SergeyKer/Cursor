import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function readGlobalsCss(): string {
  return readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8')
}

describe('footer sheet CSS guards', () => {
  const css = readGlobalsCss()

  it('uses opaque footer sheet background token', () => {
    expect(css).toContain('--footer-sheet-bg: #f9fafb')
    expect(css).toMatch(/background:\s*var\(--footer-sheet-bg\)/)
    expect(css).not.toMatch(/\.footer-sheet-panel[\s\S]*backdrop-filter/)
  })

  it('anchors panel under footer chrome and backdrop above footer only', () => {
    expect(css).toMatch(/\.footer-sheet-panel[\s\S]*bottom:\s*0/)
    expect(css).toMatch(/\.footer-sheet-backdrop[\s\S]*bottom:\s*var\(--app-footer-chrome-height\)/)
    expect(css).toMatch(
      /\.footer-sheet-panel[\s\S]*max-height:\s*calc\(100dvh - var\(--app-top-offset\)\)/
    )
    expect(css).toMatch(
      /\.footer-sheet-panel[\s\S]*padding-bottom:\s*var\(--app-footer-chrome-height\)/
    )
  })

  it('keeps sheet z-index below footer chrome', () => {
    expect(css).toMatch(/\.footer-sheet-panel[\s\S]*z-index:\s*54/)
    expect(css).toMatch(/\.footer-sheet-backdrop[\s\S]*z-index:\s*54/)
  })

  it('animates panel with 300ms material easing', () => {
    expect(css).toMatch(
      /\.footer-sheet-panel[\s\S]*transition:\s*transform 300ms cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)/
    )
  })

  it('keeps static head and scrollable body', () => {
    expect(css).toMatch(/\.footer-sheet__head[\s\S]*flex-shrink:\s*0/)
    expect(css).toMatch(
      /\.footer-sheet__head[\s\S]*border-bottom:\s*1px solid var\(--footer-sheet-divider\)/
    )
    expect(css).toMatch(/\.footer-sheet-panel[\s\S]*border-top:\s*1px solid var\(--footer-sheet-divider\)/)
    expect(css).toMatch(/\.footer-sheet__body[\s\S]*overflow-y:\s*auto/)
  })

  it('uses single contour and svg-centered close button', () => {
    expect(css).toMatch(/\.footer-sheet__close[\s\S]*border:\s*1px solid var\(--footer-sheet-divider\)/)
    expect(css).toMatch(/\.footer-sheet__close[\s\S]*background:\s*var\(--footer-sheet-bg\)/)
    expect(css).not.toMatch(/\.footer-sheet__close\.btn-3d-menu/)
  })

  it('matches gdebenz rs-x compact round close button', () => {
    expect(css).toMatch(/\.footer-sheet__close[\s\S]*width:\s*34px/)
    expect(css).toMatch(/\.footer-sheet__close[\s\S]*height:\s*34px/)
    expect(css).toMatch(/\.footer-sheet__close[\s\S]*border-radius:\s*999px/)
    expect(css).toMatch(/\.footer-sheet__close-icon[\s\S]*width:\s*14px/)
  })

  it('uses white sheet background for non-basic themes', () => {
    expect(css).toMatch(
      /html\[data-theme='futuristic'\][\s\S]*--footer-sheet-bg:\s*#ffffff/
    )
    expect(css).toMatch(/html\[data-theme='glass1'\][\s\S]*--footer-sheet-bg:\s*#ffffff/)
  })
})
