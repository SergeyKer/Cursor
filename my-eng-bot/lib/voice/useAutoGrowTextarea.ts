'use client'

import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react'

export type AutoGrowTextareaMetrics = {
  singleLineHeightPx: number
  heightPx: number
  overflowY: '' | 'auto' | 'hidden'
}

export function computeAutoGrowTextareaHeight(params: {
  singleLineHeightPx: number
  scrollHeightPx: number
  maxHeightPx: number
  minHeightPx: number
}): AutoGrowTextareaMetrics {
  const baseline = Math.max(params.minHeightPx, params.singleLineHeightPx)
  const heightPx = Math.max(baseline, Math.min(params.scrollHeightPx, params.maxHeightPx))
  return {
    singleLineHeightPx: baseline,
    heightPx,
    overflowY: params.scrollHeightPx > params.maxHeightPx ? 'auto' : 'hidden',
  }
}

function measureSingleLineHeight(el: HTMLTextAreaElement, minHeightPx: number): number {
  const styles = window.getComputedStyle(el)
  const parsedLineHeight = Number.parseFloat(styles.lineHeight)
  const parsedFontSize = Number.parseFloat(styles.fontSize)
  const lineHeight =
    Number.isFinite(parsedLineHeight) && parsedLineHeight > 0
      ? parsedLineHeight
      : Number.isFinite(parsedFontSize) && parsedFontSize > 0
        ? parsedFontSize * 1.45
        : minHeightPx
  const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom)
  const verticalBorder = Number.parseFloat(styles.borderTopWidth) + Number.parseFloat(styles.borderBottomWidth)
  return Math.max(minHeightPx, Math.round(lineHeight + verticalPadding + verticalBorder))
}

export function useAutoGrowTextarea(params: {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  enabled?: boolean
  maxHeightPx: number
  minHeightPx?: number
  isVoiceActive?: boolean
  showVoiceOverlay?: boolean
  /** Пересчитать высоту при смене voice-web-metrics класса на textarea. */
  voiceWebMetricsActive?: boolean
}) {
  const minHeightPx = params.minHeightPx ?? 44
  const idleSingleLineInputHeightRef = useRef(minHeightPx)
  const singleLineInputHeightRef = useRef(minHeightPx)

  const applyHeight = useCallback(() => {
    const el = params.textareaRef.current
    if (!el || params.enabled === false) return

    const baseHeight = measureSingleLineHeight(el, minHeightPx)

    const freezeSingleLine = Boolean(params.showVoiceOverlay || params.isVoiceActive)

    if (!freezeSingleLine) {
      idleSingleLineInputHeightRef.current = baseHeight
    }

    // Freeze single-line at idle while STT overlay is on — web-metrics baseHeight can be
    // 46 vs idle 45; max(base, idle) used to grow the field and jitter the composer.
    const effectiveSingleLine = freezeSingleLine
      ? Math.max(minHeightPx, idleSingleLineInputHeightRef.current)
      : baseHeight
    singleLineInputHeightRef.current = effectiveSingleLine

    if (freezeSingleLine) {
      el.style.height = `${effectiveSingleLine}px`
      el.style.overflowY = 'hidden'
      return
    }

    el.style.height = `${effectiveSingleLine}px`
    const fullScroll = el.scrollHeight
    const metrics = computeAutoGrowTextareaHeight({
      singleLineHeightPx: effectiveSingleLine,
      scrollHeightPx: fullScroll,
      maxHeightPx: params.maxHeightPx,
      minHeightPx,
    })
    el.style.height = `${metrics.heightPx}px`
    el.style.overflowY = metrics.overflowY
  }, [
    minHeightPx,
    params.enabled,
    params.isVoiceActive,
    params.maxHeightPx,
    params.showVoiceOverlay,
    params.textareaRef,
  ])

  useLayoutEffect(() => {
    applyHeight()
  }, [applyHeight, params.value, params.voiceWebMetricsActive, params.showVoiceOverlay, params.isVoiceActive])

  return { applyHeight }
}
