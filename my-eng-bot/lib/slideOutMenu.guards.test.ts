import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSlideOutMenu(): string {
  return readFileSync(join(process.cwd(), 'components', 'SlideOutMenu.tsx'), 'utf8')
}

describe('SlideOutMenu stacking guards', () => {
  const source = readSlideOutMenu()

  it('keeps menu above footer-sheet (54) and below header (65) / overlays (70)', () => {
    expect(source).toMatch(/fixed left-0 right-0 bottom-0 z-\[59\]/)
    expect(source).toMatch(/pointer-events-none fixed z-\[61\] overflow-x-hidden/)
    expect(source).toMatch(/fixed left-0 z-\[61\] w-80/)

    const menuDimZ = 59
    const menuPanelZ = 61
    const footerSheetZ = 54
    const headerZ = 65
    const overlayZ = 70

    expect(menuDimZ).toBeGreaterThan(footerSheetZ)
    expect(menuPanelZ).toBeGreaterThan(footerSheetZ)
    expect(menuPanelZ).toBeGreaterThan(menuDimZ)
    expect(menuPanelZ).toBeLessThan(headerZ)
    expect(menuPanelZ).toBeLessThan(overlayZ)
  })

  it('keeps floating menu button below header', () => {
    expect(source).toMatch(/btn-3d-menu fixed z-\[60\]/)
    expect(60).toBeLessThan(65)
  })
})
