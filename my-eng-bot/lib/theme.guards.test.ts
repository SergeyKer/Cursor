import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ALL_THEME_IDS, GLASS_THEME_IDS } from '@/lib/theme'

function readGlobalsCss(): string {
  return readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8')
}

describe('glass theme CSS guards', () => {
  const css = readGlobalsCss()

  it('defines shared glass base for all glass themes', () => {
    expect(css).toMatch(/html\[data-theme='glass1'\],\s*html\[data-theme='glass2'\],\s*html\[data-theme='glass3'\]/)
  })

  it('excludes glass themes from child wallpaper override on html', () => {
    expect(css).toMatch(
      /html\[data-audience='child'\]:not\(\[data-theme='bubble1'\]\):not\(\[data-theme='bubble2'\]\):not\(\[data-theme='glass1'\]\):not\(\[data-theme='glass2'\]\):not\(\[data-theme='glass3'\]\)/
    )
  })

  it('excludes glass themes from child wallpaper override on descendants', () => {
    expect(css).toMatch(
      /html:not\(\[data-theme='bubble1'\]\):not\(\[data-theme='bubble2'\]\):not\(\[data-theme='glass1'\]\):not\(\[data-theme='glass2'\]\):not\(\[data-theme='glass3'\]\) \[data-audience='child'\]/
    )
  })

  it('includes glass themes in mic/send composer unification', () => {
    for (const glassId of GLASS_THEME_IDS) {
      expect(css).toContain(`html[data-theme='${glassId}'][data-audience]`)
    }
  })

  it('keeps accent-text white in shared glass block for send button readability', () => {
    const sharedBlock = css.match(
      /html\[data-theme='glass1'\],\s*html\[data-theme='glass2'\],\s*html\[data-theme='glass3'\] \{[\s\S]*?\n\}/
    )?.[0]
    expect(sharedBlock).toBeTruthy()
    expect(sharedBlock).toContain('--accent-text: #ffffff')
    expect(sharedBlock).toContain(
      '--app-footer-bg: color-mix(in srgb, #ffffff 92%, #cfe2c6 8%)'
    )
    expect(sharedBlock).toContain('--app-footer-backdrop-filter: none')
    expect(sharedBlock).toContain('--app-footer-border: var(--app-header-border)')
    expect(sharedBlock).not.toContain('--app-footer-bg: var(--app-header-bg)')
    expect(sharedBlock).not.toContain(
      '--app-footer-backdrop-filter: var(--app-header-backdrop-filter)'
    )
  })

  it('keeps identical opaque menu surfaces across all themes so home content does not show through', () => {
    const menuTokens = [
      '--home-menu-bg: #e3f2ff',
      '--menu-panel-bg: #e3f2ff',
      '--menu-card-bg: #ffffff',
      '--menu-control-bg: #eaf4ff',
    ] as const
    const rgbaMenuToken =
      /--(?:home-menu|menu-panel|menu-card|menu-control)-bg:\s*rgba\(/

    const themeBlocks: Array<{ label: string; block: string | undefined }> = [
      {
        label: ':root (basic)',
        block: css.match(/:root\s*\{[\s\S]*?\n\}/)?.[0],
      },
      {
        label: 'futuristic',
        block: css.match(/html\[data-theme='futuristic'\]\s*\{[\s\S]*?\n\}/)?.[0],
      },
      {
        label: 'bubble1',
        block: css.match(/html\[data-theme='bubble1'\]\s*\{[\s\S]*?\n\}/)?.[0],
      },
      {
        label: 'bubble2',
        block: css.match(/html\[data-theme='bubble2'\]\s*\{[\s\S]*?\n\}/)?.[0],
      },
      {
        label: 'glass shared',
        block: css.match(
          /html\[data-theme='glass1'\],\s*html\[data-theme='glass2'\],\s*html\[data-theme='glass3'\]\s*\{[\s\S]*?\n\}/
        )?.[0],
      },
    ]

    for (const { label, block } of themeBlocks) {
      expect(block, label).toBeTruthy()
      for (const token of menuTokens) {
        expect(block, `${label}: ${token}`).toContain(token)
      }
      expect(block, `${label}: no rgba menu tokens`).not.toMatch(rgbaMenuToken)
    }
  })

  it('does not set chat-control or chat-send in per-glass accent blocks', () => {
    for (const glassId of GLASS_THEME_IDS) {
      const block = css.match(new RegExp(`html\\[data-theme='${glassId}'\\] \\{[\\s\\S]*?\\n\\}`))?.[0]
      expect(block).toBeTruthy()
      expect(block).not.toMatch(/--chat-control-bg:/)
      expect(block).not.toMatch(/--chat-send-bg:/)
    }
  })

  it('registers every theme id in ALL_THEME_IDS at least once in globals.css', () => {
    for (const themeId of ALL_THEME_IDS) {
      expect(css).toContain(`data-theme='${themeId}'`)
    }
  })
})
