'use client'

import { useEffect } from 'react'
import { ensureAnonSession } from '@/lib/supabase/ensureAnonSession'
import { isSupabaseLessonProgressSyncEnabled, isSupabaseV1Enabled } from '@/lib/supabase/env'
import { bootstrapLessonProgressSync } from '@/lib/lessonProgress/supabaseSync'

/**
 * Thin client bootstrap. Do not put auth/sync lifecycle into AppShell.
 */
export default function SupabaseBootstrap() {
  useEffect(() => {
    if (!isSupabaseV1Enabled()) return
    let cancelled = false
    void (async () => {
      const userId = await ensureAnonSession()
      if (cancelled || !userId) return
      if (!isSupabaseLessonProgressSyncEnabled()) return
      await bootstrapLessonProgressSync()
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
