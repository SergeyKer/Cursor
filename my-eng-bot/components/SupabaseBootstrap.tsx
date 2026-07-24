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
    const v1 = isSupabaseV1Enabled()
    const sync = isSupabaseLessonProgressSyncEnabled()
    console.info('[engvo][supabase] bootstrap', { v1, sync })
    if (!v1) return
    let cancelled = false
    void (async () => {
      const userId = await ensureAnonSession()
      console.info('[engvo][supabase] anon session', { userId: userId ? `${userId.slice(0, 8)}…` : null })
      if (cancelled || !userId) return
      if (!sync) {
        console.info('[engvo][supabase] sync flag off — skip lesson_progress')
        return
      }
      await bootstrapLessonProgressSync()
      console.info('[engvo][supabase] lesson_progress bootstrap done')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
