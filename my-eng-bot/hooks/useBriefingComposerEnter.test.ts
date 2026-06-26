import { describe, expect, it } from 'vitest'
import {
  isBriefingComposerActionsReady,
  resolveBriefingCardEnterClassName,
} from '@/hooks/useBriefingComposerEnter'

describe('resolveBriefingCardEnterClassName', () => {
  it('hides card during bubble and pause phases', () => {
    expect(resolveBriefingCardEnterClassName('bubble', false)).toBe('opacity-0')
    expect(resolveBriefingCardEnterClassName('pause', false)).toBe('opacity-0')
  })

  it('uses soft enter during card phase', () => {
    expect(resolveBriefingCardEnterClassName('card', false)).toBe('lesson-text-soft-enter')
  })

  it('clears class when card settled or waiting for CTA', () => {
    expect(resolveBriefingCardEnterClassName('ctaPause', false)).toBe('')
    expect(resolveBriefingCardEnterClassName('done', false)).toBe('')
  })

  it('skips animation classes when reduced motion', () => {
    expect(resolveBriefingCardEnterClassName('bubble', true)).toBe('')
    expect(resolveBriefingCardEnterClassName('card', true)).toBe('')
  })
})

describe('isBriefingComposerActionsReady', () => {
  it('is ready only in done phase', () => {
    expect(isBriefingComposerActionsReady('bubble')).toBe(false)
    expect(isBriefingComposerActionsReady('pause')).toBe(false)
    expect(isBriefingComposerActionsReady('card')).toBe(false)
    expect(isBriefingComposerActionsReady('ctaPause')).toBe(false)
    expect(isBriefingComposerActionsReady('done')).toBe(true)
  })
})
