import { describe, expect, it } from 'vitest'
import {
  canFooterSheetBodyScrollDown,
  canFooterSheetBodyScrollUp,
  FOOTER_SHEET_SCROLL_EDGE_EPSILON,
  readFooterSheetBodyScrollMetrics,
  shouldDelegateFooterSheetTouchToBodyScroll,
  type FooterSheetBodyScrollMetrics,
} from '@/lib/footerSheetScroll'

const overflowMid: FooterSheetBodyScrollMetrics = {
  scrollTop: 100,
  clientHeight: 400,
  scrollHeight: 900,
}

const overflowTop: FooterSheetBodyScrollMetrics = {
  scrollTop: 0,
  clientHeight: 400,
  scrollHeight: 900,
}

const overflowBottom: FooterSheetBodyScrollMetrics = {
  scrollTop: 500,
  clientHeight: 400,
  scrollHeight: 900,
}

const noOverflow: FooterSheetBodyScrollMetrics = {
  scrollTop: 0,
  clientHeight: 400,
  scrollHeight: 400,
}

describe('footerSheetScroll', () => {
  it('uses 1px edge epsilon', () => {
    expect(FOOTER_SHEET_SCROLL_EDGE_EPSILON).toBe(1)
  })

  it('reads metrics from element or returns zeros', () => {
    expect(readFooterSheetBodyScrollMetrics(null)).toEqual({
      scrollTop: 0,
      clientHeight: 0,
      scrollHeight: 0,
    })
    expect(
      readFooterSheetBodyScrollMetrics({
        scrollTop: 12,
        clientHeight: 100,
        scrollHeight: 250,
      } as HTMLElement)
    ).toEqual({ scrollTop: 12, clientHeight: 100, scrollHeight: 250 })
  })

  it('detects scroll room up and down', () => {
    expect(canFooterSheetBodyScrollDown(overflowMid)).toBe(true)
    expect(canFooterSheetBodyScrollUp(overflowMid)).toBe(true)
    expect(canFooterSheetBodyScrollDown(overflowTop)).toBe(false)
    expect(canFooterSheetBodyScrollUp(overflowTop)).toBe(true)
    expect(canFooterSheetBodyScrollDown(overflowBottom)).toBe(true)
    expect(canFooterSheetBodyScrollUp(overflowBottom)).toBe(false)
    expect(canFooterSheetBodyScrollDown(noOverflow)).toBe(false)
    expect(canFooterSheetBodyScrollUp(noOverflow)).toBe(false)
  })

  it('delegates middle-content scroll down to body (main bug)', () => {
    expect(
      shouldDelegateFooterSheetTouchToBodyScroll({
        startedFromBody: true,
        deltaY: 10,
        metrics: overflowMid,
      })
    ).toBe(true)
  })

  it('delegates middle-content scroll up to body', () => {
    expect(
      shouldDelegateFooterSheetTouchToBodyScroll({
        startedFromBody: true,
        deltaY: -10,
        metrics: overflowMid,
      })
    ).toBe(true)
  })

  it('does not delegate dismiss-from-top', () => {
    expect(
      shouldDelegateFooterSheetTouchToBodyScroll({
        startedFromBody: true,
        deltaY: 10,
        metrics: overflowTop,
      })
    ).toBe(false)
  })

  it('at top: scroll up goes to body; scroll down is for dismiss', () => {
    expect(
      shouldDelegateFooterSheetTouchToBodyScroll({
        startedFromBody: true,
        deltaY: -10,
        metrics: overflowTop,
      })
    ).toBe(true)
    expect(
      shouldDelegateFooterSheetTouchToBodyScroll({
        startedFromBody: true,
        deltaY: 10,
        metrics: overflowTop,
      })
    ).toBe(false)
  })

  it('at bottom: scroll down goes to body; overscroll up is not delegated', () => {
    expect(
      shouldDelegateFooterSheetTouchToBodyScroll({
        startedFromBody: true,
        deltaY: 10,
        metrics: overflowBottom,
      })
    ).toBe(true)
    expect(
      shouldDelegateFooterSheetTouchToBodyScroll({
        startedFromBody: true,
        deltaY: -10,
        metrics: overflowBottom,
      })
    ).toBe(false)
  })

  it('does not delegate short content or grab/handle', () => {
    expect(
      shouldDelegateFooterSheetTouchToBodyScroll({
        startedFromBody: true,
        deltaY: 10,
        metrics: noOverflow,
      })
    ).toBe(false)
    expect(
      shouldDelegateFooterSheetTouchToBodyScroll({
        startedFromBody: false,
        deltaY: 10,
        metrics: overflowMid,
      })
    ).toBe(false)
  })

  it('respects epsilon boundary for scroll down', () => {
    expect(
      shouldDelegateFooterSheetTouchToBodyScroll({
        startedFromBody: true,
        deltaY: 1,
        metrics: { scrollTop: 1, clientHeight: 400, scrollHeight: 900 },
      })
    ).toBe(false)
    expect(
      shouldDelegateFooterSheetTouchToBodyScroll({
        startedFromBody: true,
        deltaY: 1,
        metrics: { scrollTop: 2, clientHeight: 400, scrollHeight: 900 },
      })
    ).toBe(true)
  })
})
