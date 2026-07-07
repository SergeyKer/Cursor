import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function readGlobalsCss(): string {
  return readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8')
}

function footerSurfaceRule(css: string): string {
  const match = css.match(/\.app-footer-surface \{[^}]*\}/)
  expect(match).toBeTruthy()
  return match![0]
}

describe('chrome shadow CSS guards', () => {
  const css = readGlobalsCss()
  const footerRule = footerSurfaceRule(css)

  it('footer surface uses box-shadow token like header', () => {
    expect(footerRule).toMatch(/box-shadow:\s*var\(--app-footer-shadow\)/)
    expect(footerRule).not.toMatch(/box-shadow:\s*none/)
  })

  it('footer surface has no ::before edge-shadow rule', () => {
    expect(css).not.toMatch(/\.app-footer-surface::before/)
  })

  it('footer surface has isolation isolate', () => {
    expect(footerRule).toMatch(/isolation:\s*isolate/)
  })

  it('header shadow token unchanged on root', () => {
    expect(css).toMatch(
      /--app-header-shadow:\s*0 var\(--app-chrome-elev-y\) var\(--app-chrome-elev-blur\) var\(--app-chrome-elev-color\)/
    )
  })

  it('footer shadow mirrors header chrome elev on root', () => {
    expect(css).toMatch(
      /--app-footer-shadow:[\s\S]*?0 calc\(-1 \* var\(--app-chrome-elev-y\)\)[\s\S]*?var\(--app-chrome-elev-blur\)[\s\S]*?var\(--app-chrome-elev-color\)/
    )
    expect(css).not.toContain('--app-footer-chrome-elev-y:')
    expect(css).not.toContain('--app-footer-shadow-ambient:')
  })

  it('footer shadow token has no inset', () => {
    expect(css).not.toMatch(/--app-footer-shadow:[^;]*inset/)
  })

  it('shared chrome elev tokens exist on root', () => {
    expect(css).toContain('--app-chrome-elev-y:')
    expect(css).toContain('--app-chrome-elev-blur:')
    expect(css).toContain('--app-chrome-elev-color:')
  })

  it('header surface keeps box-shadow', () => {
    expect(css).toMatch(/\.app-header-surface \{[\s\S]*?box-shadow:\s*var\(--app-header-shadow\)/)
  })
})
