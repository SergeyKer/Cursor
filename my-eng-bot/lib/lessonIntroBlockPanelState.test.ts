import { describe, expect, it } from 'vitest'

import { resolveIntroChipLabel } from '@/lib/lessonIntroBlocks'

import { resolveIntroPanelToggle } from '@/lib/lessonIntroBlockPanelState'



describe('resolveIntroPanelToggle', () => {

  it('opens target panel when another panel is closed', () => {

    expect(resolveIntroPanelToggle(null, 'theory')).toBe('theory')

    expect(resolveIntroPanelToggle(null, 'how')).toBe('how')

  })



  it('closes the panel when the same chip is toggled again', () => {

    expect(resolveIntroPanelToggle('theory', 'theory')).toBeNull()

    expect(resolveIntroPanelToggle('how', 'how')).toBeNull()

  })



  it('switches panels with mutual exclusion', () => {

    expect(resolveIntroPanelToggle('theory', 'how')).toBe('how')

    expect(resolveIntroPanelToggle('how', 'theory')).toBe('theory')

  })

})



describe('resolveIntroChipLabel', () => {

  it('returns open and close labels for theory', () => {

    expect(resolveIntroChipLabel('theory', false)).toBe('Правило')

    expect(resolveIntroChipLabel('theory', true)).toBe('Скрыть правило')

  })



  it('returns open and close labels for how', () => {

    expect(resolveIntroChipLabel('how', false)).toBe('Шаблоны')

    expect(resolveIntroChipLabel('how', true)).toBe('Скрыть шаблоны')

  })

})

