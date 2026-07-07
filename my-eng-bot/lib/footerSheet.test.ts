import { describe, expect, it } from 'vitest'
import {
  buildFooterSheetContext,
  FOOTER_SHEET_PLACEHOLDER_TEXT,
  resolveFooterSheetTitle,
  shouldCloseFooterSheetOnRowPress,
} from '@/lib/footerSheet'

describe('footerSheet', () => {
  it('resolveFooterSheetTitle returns labels per source', () => {
    expect(resolveFooterSheetTitle('dynamic')).toBe('Подсказка')
    expect(resolveFooterSheetTitle('static')).toBe('Статистика')
  })

  it('buildFooterSheetContext maps footer fields for v2 and placeholder mode', () => {
    const context = buildFooterSheetContext({
      source: 'static',
      dynamicText: 'Урок завершен',
      staticText: '⭐ 2008 · ⚡ 1',
      typingKey: 'footer-key',
      tone: 'celebrate',
      emphasis: 'pulse',
      lessonTitle: 'Present Simple',
      segmentKinds: ['goal', 'xp', 'medal'],
    })

    expect(context).toEqual({
      source: 'static',
      title: 'Статистика',
      mode: 'placeholder',
      typingKey: 'footer-key',
      tone: 'celebrate',
      emphasis: 'pulse',
      dynamicText: 'Урок завершен',
      staticText: '⭐ 2008 · ⚡ 1',
      lessonTitle: 'Present Simple',
      segmentKinds: ['goal', 'xp', 'medal'],
    })
  })

  it('exposes placeholder copy constant', () => {
    expect(FOOTER_SHEET_PLACEHOLDER_TEXT).toBe('В разработке')
  })

  it('shouldCloseFooterSheetOnRowPress toggles only same source', () => {
    const dynamic = buildFooterSheetContext({ source: 'dynamic' })
    const staticContext = buildFooterSheetContext({ source: 'static' })

    expect(shouldCloseFooterSheetOnRowPress(null, 'dynamic')).toBe(false)
    expect(shouldCloseFooterSheetOnRowPress(dynamic, 'dynamic')).toBe(true)
    expect(shouldCloseFooterSheetOnRowPress(dynamic, 'static')).toBe(false)
    expect(shouldCloseFooterSheetOnRowPress(staticContext, 'static')).toBe(true)
  })
})
