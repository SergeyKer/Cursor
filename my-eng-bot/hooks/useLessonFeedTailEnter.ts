'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  isLessonFeedOverflowing,
  resolveLessonScrollBehavior,
  scheduleScrollAfterLayout,
  scrollLessonFeedTailMessageIntoView,
  scrollLessonFeedToMax,
} from '@/lib/lessonFeedScroll'

/** Как в «Общении» — slide-in снизу, не fade. */
export const LESSON_FEED_MESSAGE_ENTER_CLASS = 'lesson-enter'

type UseLessonFeedTailEnterParams = {
  scrollContainerRef: RefObject<HTMLElement | null>
  messageIds: string[]
  prefersReducedMotion: boolean
  enabled: boolean
  userEnterClass?: string
  assistantEnterClass?: string
}

type UseLessonFeedTailEnterResult = {
  getUserEnterClass: (messageId: string) => string
  getAssistantEnterClass: (messageId: string, allowEnter?: boolean) => string
  isMessageVisible: (messageId: string) => boolean
  markEnterFinished: (messageId: string) => void
  /** @deprecated use markEnterFinished */
  markAssistantEnterFinished: (messageId: string) => void
}

export function useLessonFeedTailEnter({
  scrollContainerRef,
  messageIds,
  prefersReducedMotion,
  enabled,
  userEnterClass = LESSON_FEED_MESSAGE_ENTER_CLASS,
  assistantEnterClass = LESSON_FEED_MESSAGE_ENTER_CLASS,
}: UseLessonFeedTailEnterParams): UseLessonFeedTailEnterResult {
  const [enteringId, setEnteringId] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set())
  const enterQueueRef = useRef<string[]>([])
  const enteringIdRef = useRef<string | null>(null)
  const prevMessageCountRef = useRef(0)

  enteringIdRef.current = enteringId

  const messageIdsKey = messageIds.join('|')

  const startNextEnter = useCallback(() => {
    const next = enterQueueRef.current.shift()
    if (!next) {
      setEnteringId(null)
      return
    }
    setEnteringId(next)
    setHiddenIds((prev) => {
      if (!prev.has(next)) return prev
      const updated = new Set(prev)
      updated.delete(next)
      return updated
    })
  }, [])

  const enqueueSequentialEnters = useCallback(
    (newIds: string[]) => {
      if (newIds.length === 0) return

      if (enteringIdRef.current) {
        enterQueueRef.current.push(...newIds)
        setHiddenIds((prev) => {
          const updated = new Set(prev)
          for (const id of newIds) updated.add(id)
          return updated
        })
        return
      }

      const [first, ...rest] = newIds
      enterQueueRef.current.push(...rest)
      setEnteringId(first)
      if (rest.length > 0) {
        setHiddenIds((prev) => {
          const updated = new Set(prev)
          for (const id of rest) updated.add(id)
          return updated
        })
      }
    },
    []
  )

  useLayoutEffect(() => {
    if (!enabled || prefersReducedMotion) {
      prevMessageCountRef.current = messageIds.length
      return
    }

    const prevCount = prevMessageCountRef.current
    const nextCount = messageIds.length
    prevMessageCountRef.current = nextCount

    if (nextCount <= prevCount) return

    const newIds = messageIds.slice(prevCount)
    enqueueSequentialEnters(newIds)

    const behavior = resolveLessonScrollBehavior({
      prefersReducedMotion,
      reason: 'new_message',
    })

    return scheduleScrollAfterLayout(() => {
      const liveContainer = scrollContainerRef.current
      if (!liveContainer) return
      scrollLessonFeedTailMessageIntoView(liveContainer, behavior)
      if (isLessonFeedOverflowing(liveContainer)) {
        scrollLessonFeedToMax(liveContainer, behavior)
      }
    })
  }, [
    enabled,
    enqueueSequentialEnters,
    messageIds,
    messageIdsKey,
    prefersReducedMotion,
    scrollContainerRef,
  ])

  const getUserEnterClass = useCallback(
    (messageId: string) => {
      if (prefersReducedMotion || !enabled) return ''
      if (enteringId !== messageId) return ''
      return userEnterClass
    },
    [enabled, enteringId, prefersReducedMotion, userEnterClass]
  )

  const getAssistantEnterClass = useCallback(
    (messageId: string, allowEnter = true) => {
      if (prefersReducedMotion || !enabled || !allowEnter) return ''
      if (enteringId !== messageId) return ''
      return assistantEnterClass
    },
    [assistantEnterClass, enabled, enteringId, prefersReducedMotion]
  )

  const isMessageVisible = useCallback(
    (messageId: string) => {
      if (prefersReducedMotion || !enabled) return true
      return !hiddenIds.has(messageId)
    },
    [enabled, hiddenIds, prefersReducedMotion]
  )

  const markEnterFinished = useCallback(
    (messageId: string) => {
      if (enteringIdRef.current !== messageId) return
      startNextEnter()
    },
    [startNextEnter]
  )

  return useMemo(
    () => ({
      getUserEnterClass,
      getAssistantEnterClass,
      isMessageVisible,
      markEnterFinished,
      markAssistantEnterFinished: markEnterFinished,
    }),
    [getAssistantEnterClass, getUserEnterClass, isMessageVisible, markEnterFinished]
  )
}
