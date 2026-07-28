'use client'

import { useEffect, useRef } from 'react'
import type { AttentionZone } from '@/lib/learningMemory/types'
import { listTutorQuestionJobs } from '@/lib/tutor/selectTutorTask'
import { setCachedTutorQuestion } from '@/lib/tutor/tutorQuestionCache'
import type { AiProvider, Audience, LevelId } from '@/lib/types'

/**
 * Background-fill AI question cache for the top tutor-card zone.
 * Does not change zone ranking.
 */
export function useTutorQuestionPrefetch(params: {
  attentionZones: AttentionZone[]
  audience: Audience
  level: LevelId
  provider: AiProvider
  openAiChatPreset?: 'gpt-4o-mini' | 'gpt-5.4-mini-none' | 'gpt-5.4-mini-low'
  enabled?: boolean
  onCached?: () => void
}) {
  const onCachedRef = useRef(params.onCached)
  onCachedRef.current = params.onCached
  const fingerprintRef = useRef<string | null>(null)

  useEffect(() => {
    if (params.enabled === false) return
    const job = listTutorQuestionJobs(params.attentionZones)[0]
    if (!job) return
    if (fingerprintRef.current === job.fingerprint) return
    fingerprintRef.current = job.fingerprint

    let cancelled = false
    void (async () => {
      try {
        const response = await fetch('/api/tutor-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audience: params.audience,
            level: params.level,
            provider: params.provider,
            openAiChatPreset: params.openAiChatPreset,
            zone: {
              skillTagId: job.skillTagId,
              title: job.title,
              sourceHint: job.sourceHint,
              errorCount: job.errorCount,
            },
          }),
        })
        if (!response.ok || cancelled) return
        const data = (await response.json()) as { question?: string }
        if (!data.question || cancelled) return
        setCachedTutorQuestion(job.fingerprint, data.question)
        onCachedRef.current?.()
      } catch {
        /* ignore — card stays curiosity/hidden */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    params.attentionZones,
    params.audience,
    params.enabled,
    params.level,
    params.openAiChatPreset,
    params.provider,
  ])
}
