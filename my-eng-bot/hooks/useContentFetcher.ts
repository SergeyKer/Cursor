'use client'

import * as React from 'react'
import type { AccentLesson } from '@/types/accent'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_PREFIX = 'myeng.accent.content.v1.'

interface AccentContentRequest {
  sound: string
  type?: string
  difficulty?: string
  forceNew?: boolean
}

interface AccentContentCacheEntry {
  savedAt: number
  lessons: AccentLesson[]
}

interface AccentContentState {
  lessons: AccentLesson[]
  loading: boolean
  source: 'cache' | 'server' | 'fallback' | null
  constructiveMessage: string | null
}

function cacheKey(request: AccentContentRequest): string {
  return `${CACHE_PREFIX}${request.sound}:${request.type ?? 'any'}:${request.difficulty ?? 'any'}`
}

function readCache(request: AccentContentRequest): AccentLesson[] | null {
  if (typeof window === 'undefined' || request.forceNew) return null
  try {
    const raw = window.localStorage.getItem(cacheKey(request))
    if (!raw) return null
    const parsed = JSON.parse(raw) as AccentContentCacheEntry
    if (!parsed || Date.now() - parsed.savedAt > CACHE_TTL_MS) return null
    return Array.isArray(parsed.lessons) ? parsed.lessons : null
  } catch {
    return null
  }
}

function writeCache(request: AccentContentRequest, lessons: AccentLesson[]): void {
  if (typeof window === 'undefined') return
  try {
    const entry: AccentContentCacheEntry = { savedAt: Date.now(), lessons }
    window.localStorage.setItem(cacheKey(request), JSON.stringify(entry))
  } catch {
    // Content cache is an optimization; local fallback keeps the trainer usable.
  }
}

export function useContentFetcher(request: AccentContentRequest | null): AccentContentState {
  const [state, setState] = React.useState<AccentContentState>({
    lessons: [],
    loading: false,
    source: null,
    constructiveMessage: null,
  })

  React.useEffect(() => {
    if (!request) return
    const activeRequest = request
    let cancelled = false
    const cached = readCache(activeRequest)
    if (cached) {
      setState({ lessons: cached, loading: false, source: 'cache', constructiveMessage: null })
      return
    }

    async function load() {
      setState((current) => ({ ...current, loading: true, constructiveMessage: null }))
      try {
        const response = await fetch('/api/accent/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activeRequest),
        })
        const data = (await response.json()) as { lessons?: AccentLesson[] }
        if (!response.ok || !Array.isArray(data.lessons)) throw new Error('content unavailable')
        if (cancelled) return
        writeCache(activeRequest, data.lessons)
        setState({ lessons: data.lessons, loading: false, source: 'server', constructiveMessage: null })
      } catch {
        try {
          const fallback = await fetch('/data/accent/theta-fallback.json')
          const data = (await fallback.json()) as { lessons?: AccentLesson[] }
          if (cancelled) return
          setState({
            lessons: Array.isArray(data.lessons) ? data.lessons : [],
            loading: false,
            source: 'fallback',
            constructiveMessage: 'Показываю локальный набор. Тренировка всё равно работает без задержки.',
          })
        } catch {
          if (!cancelled) {
            setState({ lessons: [], loading: false, source: 'fallback', constructiveMessage: 'Локальный набор сейчас недоступен.' })
          }
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [request])

  return state
}
