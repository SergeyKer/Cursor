'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { TranslationDotState } from '@/components/TranslationButtonDot'

export type UsePhraseTranslationOptions = {
  phraseKey: string
  text: string
  closeKey?: string | null
  onRequest?: (text: string, signal: AbortSignal) => Promise<{ translation?: string; error?: string }>
}

export type UsePhraseTranslationResult = {
  showTranslation: boolean
  toggleTranslation: () => void
  closeTranslation: () => void
  translation: string | undefined
  translationError: string | undefined
  isLoadingTranslation: boolean
  translationDotState: TranslationDotState
}

export function usePhraseTranslation({
  phraseKey,
  text,
  closeKey,
  onRequest,
}: UsePhraseTranslationOptions): UsePhraseTranslationResult {
  const [showTranslation, setShowTranslation] = useState(false)
  const [translation, setTranslation] = useState<string | undefined>(undefined)
  const [translationError, setTranslationError] = useState<string | undefined>(undefined)
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false)

  const translationRequestedRef = useRef(false)
  const prevTranslationErrorRef = useRef<string | undefined>(undefined)
  const abortControllerRef = useRef<AbortController | null>(null)
  const cacheKeyRef = useRef(phraseKey)

  const trimmedText = text.trim()
  const hasTranslationData = Boolean(translation?.trim())
  const hasTranslationError = Boolean(translationError?.trim())

  const resetTranslationState = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    translationRequestedRef.current = false
    setShowTranslation(false)
    setTranslation(undefined)
    setTranslationError(undefined)
    setIsLoadingTranslation(false)
    prevTranslationErrorRef.current = undefined
  }, [])

  useEffect(() => {
    if (cacheKeyRef.current === phraseKey) return
    cacheKeyRef.current = phraseKey
    resetTranslationState()
  }, [phraseKey, resetTranslationState])

  useEffect(() => {
    if (closeKey == null) return
    setShowTranslation(false)
  }, [closeKey])

  const toggleTranslation = useCallback(() => {
    setShowTranslation((value) => !value)
  }, [])

  const closeTranslation = useCallback(() => {
    setShowTranslation(false)
  }, [])

  useLayoutEffect(() => {
    if (!showTranslation) {
      translationRequestedRef.current = false
      return
    }
    if (hasTranslationData || !onRequest || !trimmedText) return
    if (translationRequestedRef.current) return

    translationRequestedRef.current = true
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setTranslation(undefined)
    setTranslationError(undefined)
    setIsLoadingTranslation(true)

    void onRequest(trimmedText, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        if (result.translation?.trim()) {
          setTranslation(result.translation.trim())
          setTranslationError(undefined)
        } else if (result.error?.trim()) {
          setTranslation(undefined)
          setTranslationError(result.error.trim())
        } else {
          setTranslation(undefined)
          setTranslationError('Не удалось загрузить перевод.')
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setTranslation(undefined)
        setTranslationError('Не удалось загрузить перевод.')
      })
      .finally(() => {
        if (controller.signal.aborted) return
        setIsLoadingTranslation(false)
      })
  }, [showTranslation, hasTranslationData, onRequest, trimmedText])

  useEffect(() => {
    const currentError = translationError
    const prevError = prevTranslationErrorRef.current
    prevTranslationErrorRef.current = currentError

    if (!showTranslation) return

    const isTranslationError = typeof currentError === 'string' && currentError.length > 0
    const justAppeared = prevError !== currentError
    if (isTranslationError && justAppeared) {
      setShowTranslation(false)
    }
  }, [showTranslation, translationError])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const translationDotState: TranslationDotState = hasTranslationError
    ? 'error'
    : hasTranslationData
      ? 'ready'
      : isLoadingTranslation
        ? 'loading'
        : 'idle'

  return {
    showTranslation,
    toggleTranslation,
    closeTranslation,
    translation,
    translationError,
    isLoadingTranslation,
    translationDotState,
  }
}
