import { describe, expect, it } from 'vitest'
import {
  computeIosSafariVisualBottomOverlapPx,
  isIosSafariUserAgent,
  isIosChromeUserAgent,
  isIosWebKitBrowser,
  normalizeIosSafariBottomOverlapPx,
} from '@/lib/iosSafariViewport'

describe('isIosSafariUserAgent', () => {
  it('true для iPhone Safari', () => {
    expect(
      isIosSafariUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe(true)
  })

  it('false для CriOS', () => {
    expect(
      isIosSafariUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1'
      )
    ).toBe(false)
  })
})

describe('computeIosSafariVisualBottomOverlapPx', () => {
  it('0 когда visual viewport совпадает с layout', () => {
    expect(computeIosSafariVisualBottomOverlapPx(800, 800, 0)).toBe(0)
  })

  it('положительный overlap при нижнем chrome Safari', () => {
    expect(computeIosSafariVisualBottomOverlapPx(800, 720, 0)).toBe(80)
  })

  it('учитывает offsetTop адресной строки', () => {
    expect(computeIosSafariVisualBottomOverlapPx(800, 700, 50)).toBe(50)
  })

  it('не уходит в минус', () => {
    expect(computeIosSafariVisualBottomOverlapPx(700, 800, 0)).toBe(0)
  })

  it('округляет до целых px', () => {
    expect(computeIosSafariVisualBottomOverlapPx(800, 719.4, 0)).toBe(81)
  })
})

describe('normalizeIosSafariBottomOverlapPx', () => {
  it('не меняет overlap без keyboard inset', () => {
    expect(normalizeIosSafariBottomOverlapPx(84, 0)).toBe(84)
  })

  it('вычитает keyboard inset чтобы не было двойного сдвига', () => {
    expect(normalizeIosSafariBottomOverlapPx(320, 300)).toBe(20)
  })

  it('не уходит в минус после вычитания', () => {
    expect(normalizeIosSafariBottomOverlapPx(120, 260)).toBe(0)
  })
})

describe('isIosWebKitBrowser', () => {
  const safariUa =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  const criosUa =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1'

  it('true для Safari и CriOS', () => {
    expect(isIosWebKitBrowser(safariUa)).toBe(true)
    expect(isIosWebKitBrowser(criosUa)).toBe(true)
  })

  it('false для desktop Chrome', () => {
    expect(
      isIosWebKitBrowser(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )
    ).toBe(false)
  })
})

describe('isIosChromeUserAgent', () => {
  it('true только для CriOS на iOS', () => {
    expect(
      isIosChromeUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1'
      )
    ).toBe(true)
  })
})