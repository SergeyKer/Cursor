import { describe, expect, it } from 'vitest'
import { computeMaxScrollTop } from '@/lib/lessonFeedScroll'

/** Логика «скролл не нужен» — зеркало scrollLessonFeedMessageRowIntoViewIfNeeded (return false). */
function tailRowFitsWithoutScroll(params: {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  targetTop: number
  targetHeight: number
  gapPx?: number
  snapPx?: number
}): boolean {
  const gapPx = params.gapPx ?? 0
  const snapPx = params.snapPx ?? 2
  const targetBottom = params.targetTop + params.targetHeight
  const visibleBottom = params.scrollTop + params.clientHeight
  if (targetBottom + gapPx <= visibleBottom + snapPx) return true

  const maxTop = computeMaxScrollTop(params.scrollHeight, params.clientHeight)
  const nextTop = Math.max(params.scrollTop, targetBottom + gapPx - params.clientHeight)
  return Math.abs(params.scrollTop - nextTop) < snapPx
}

describe('lesson feed tail enter (no-scroll path)', () => {
  it('короткая лента: хвост виден без скролла', () => {
    expect(
      tailRowFitsWithoutScroll({
        scrollTop: 0,
        scrollHeight: 300,
        clientHeight: 400,
        targetTop: 200,
        targetHeight: 80,
      })
    ).toBe(true)
  })

  it('длинная лента: хвост ниже viewport — нужен скролл', () => {
    expect(
      tailRowFitsWithoutScroll({
        scrollTop: 0,
        scrollHeight: 1200,
        clientHeight: 400,
        targetTop: 900,
        targetHeight: 80,
      })
    ).toBe(false)
  })

  it('уже у хвоста — скролл не нужен', () => {
    expect(
      tailRowFitsWithoutScroll({
        scrollTop: 800,
        scrollHeight: 1200,
        clientHeight: 400,
        targetTop: 900,
        targetHeight: 80,
      })
    ).toBe(true)
  })
})
